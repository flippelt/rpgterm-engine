// Tiny JSON-Schema walker for the two contracts this package ships
// (scenario + front-matter). Supports the keywords those files use:
// type / types array, properties, additionalProperties, required,
// minLength, oneOf, $ref to #/$defs/*, items. Unknown keywords ignored.
// Zero dependencies — the schema JSON is the source of truth.

import scenarioSchema from './scenario.schema.json'
import frontmatterSchema from './frontmatter.schema.json'

export { scenarioSchema, frontmatterSchema }

const TYPEOF = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => v != null && typeof v === 'object' && !Array.isArray(v),
  array: (v) => Array.isArray(v)
}

function typeOk(value, type) {
  if (Array.isArray(type)) return type.some((t) => TYPEOF[t]?.(value))
  return TYPEOF[type]?.(value) ?? true
}

function resolveRef(schema, root) {
  if (!schema?.$ref) return schema
  const m = String(schema.$ref).match(/^#\/\$defs\/(.+)$/)
  if (!m) throw new Error(`unsupported $ref: ${schema.$ref}`)
  const dest = root.$defs?.[m[1]]
  if (!dest) throw new Error(`unresolved $ref: ${schema.$ref}`)
  return dest
}

function walk(value, schema, path, root, errors) {
  const node = resolveRef(schema, root)
  if (node.type && !typeOk(value, node.type)) {
    const want = Array.isArray(node.type) ? node.type.join('|') : node.type
    errors.push(`${path || '/'}: expected ${want}`)
    return
  }
  if (typeof value === 'string' && node.minLength != null && value.length < node.minLength) {
    errors.push(`${path || '/'}: shorter than minLength ${node.minLength}`)
  }
  if (node.oneOf) {
    const ok = node.oneOf.some((alt) => {
      const inner = []
      walk(value, alt, path, root, inner)
      return inner.length === 0
    })
    if (!ok) errors.push(`${path || '/'}: did not match any oneOf branch`)
    return
  }
  if (Array.isArray(value) && node.items) {
    value.forEach((item, i) => walk(item, node.items, `${path}[${i}]`, root, errors))
  }
  if (TYPEOF.object(value) && node.properties) {
    for (const [key, sub] of Object.entries(node.properties)) {
      if (value[key] !== undefined) walk(value[key], sub, path ? `${path}.${key}` : key, root, errors)
    }
    if (Array.isArray(node.required)) {
      for (const key of node.required) {
        if (value[key] === undefined) errors.push(`${path || '/'}: missing required "${key}"`)
      }
    }
    if (node.additionalProperties && node.additionalProperties !== true) {
      for (const [key, extra] of Object.entries(value)) {
        if (node.properties[key] !== undefined) continue
        walk(extra, node.additionalProperties, path ? `${path}.${key}` : key, root, errors)
      }
    }
  }
}

export function validateAgainstSchema(data, schema) {
  const errors = []
  walk(data, schema, '', schema, errors)
  return errors
}

export function validateScenario(data) {
  return validateAgainstSchema(data, scenarioSchema)
}

export function validateFrontMatter(meta) {
  return validateAgainstSchema(meta, frontmatterSchema)
}

// Runtime bundle: scenario.json plus a `files` map of path → raw text.
// `files` may be omitted (empty object is fine); when present it must be
// a string map. Throws a single Error listing every violation.
export function validateBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    throw new Error('scenario bundle must be a JSON object')
  }
  const errors = validateScenario(bundle)
  const files = bundle.files
  if (files != null) {
    if (typeof files !== 'object' || Array.isArray(files)) {
      errors.push('files: must be an object of path -> text')
    } else {
      for (const [path, raw] of Object.entries(files)) {
        if (typeof raw !== 'string') errors.push(`files.${path}: expected string`)
      }
    }
  }
  if (errors.length) {
    throw new Error(`invalid scenario bundle:\n  - ${errors.join('\n  - ')}`)
  }
  return bundle
}
