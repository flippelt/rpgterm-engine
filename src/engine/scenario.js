// Scenario composition — the pure builders extracted from the terminal's
// themes/index.js (the app keeps the import.meta.glob repo-scenario loader;
// this package owns the reusable logic). Front-matter parsing, the virtual
// filesystem build, i18n application, and composeCustomScenario (the entry the
// terminal uses for GM-authored bundles) all live here. The 8 theme skins ship
// with the package so composeCustomScenario is self-contained.

import alien from '../themes/alien.json'
import lancer from '../themes/lancer.json'
import bladerunner from '../themes/bladerunner.json'
import wh40k from '../themes/wh40k.json'
import fallout from '../themes/fallout.json'
import cyberpunk from '../themes/cyberpunk.json'
import dataslate from '../themes/dataslate.json'
import ibm from '../themes/ibm.json'
import { pickWord } from './wordle.js'

const THEME_LIST = [alien, lancer, bladerunner, wh40k, fallout, cyberpunk, dataslate, ibm]
export const THEME_REGISTRY = Object.fromEntries(THEME_LIST.map((t) => [t.id, t]))
export const THEMES = THEME_LIST

// --- front-matter --------------------------------------------------------
// Leading `---\n ... \n---` block of flat `key: value` lines. Unquoted values
// coerce to boolean/number; quote a value to force a string (e.g. a numeric
// password: `password: "12345"`).
export function parseFrontMatter(raw) {
  const text = String(raw).replace(/\r\n/g, '\n')
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { meta: {}, content: text.replace(/\n+$/, '') }
  const [, header, body] = m
  const meta = {}
  for (const line of header.split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    const rawVal = line.slice(i + 1).trim()
    let val = rawVal
    if (/^".*"$/.test(rawVal) || /^'.*'$/.test(rawVal)) val = rawVal.slice(1, -1)
    else if (rawVal === 'true') val = true
    else if (rawVal === 'false') val = false
    else if (/^-?\d+$/.test(rawVal)) val = parseInt(rawVal, 10)
    meta[key] = val
  }
  return { meta, content: body.replace(/\n+$/, '') }
}

// --- filesystem builder --------------------------------------------------
export function buildFilesystem(entries) {
  const fs = { '/': { type: 'dir', children: [] } }
  const ensureDir = (p) => (fs[p] ??= { type: 'dir', children: [] })
  const addChild = (dirPath, name) => {
    const d = ensureDir(dirPath)
    if (!d.children.includes(name)) d.children.push(name)
  }

  for (const { path, content, meta } of entries) {
    const parts = path.split('/').filter(Boolean)
    let cur = ''
    for (let i = 0; i < parts.length - 1; i++) {
      addChild(cur === '' ? '/' : cur, parts[i])
      cur = cur + '/' + parts[i]
      ensureDir(cur)
    }
    addChild(cur === '' ? '/' : cur, parts[parts.length - 1])
    const node = { type: 'file', content, ...meta }
    if (node.decryptGame ?? node.crackable === false) node.decryptTarget ??= pickWord(node)
    fs[path] = node
  }

  for (const node of Object.values(fs)) {
    if (node.type === 'dir') node.children.sort()
  }
  return fs
}

// --- per-language content ------------------------------------------------
const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v)

function applyI18n(obj, lang) {
  const tr = obj?.i18n?.[lang]
  if (!obj?.i18n) return obj
  const out = { ...obj }
  delete out.i18n
  if (!tr) return out
  for (const [k, v] of Object.entries(tr)) {
    if (k === 'files') continue
    out[k] = isPlainObject(out[k]) && isPlainObject(v) ? { ...out[k], ...v } : v
  }
  return out
}

function translateFilesystem(fs, fileOverrides) {
  if (!isPlainObject(fileOverrides)) return fs
  const next = { ...fs }
  for (const [path, content] of Object.entries(fileOverrides)) {
    const p = path.startsWith('/') ? path : '/' + path
    if (next[p]?.type === 'file') next[p] = { ...next[p], content: String(content) }
  }
  return next
}

function localizeScenario(scenario, lang) {
  const fileOverrides = {
    ...(scenario?._fileI18n?.[lang] ?? {}),
    ...(scenario?.i18n?.[lang]?.files ?? {})
  }
  const out = applyI18n(scenario, lang)
  delete out._fileI18n
  if (Object.keys(fileOverrides).length) {
    out.filesystem = translateFilesystem(scenario.filesystem, fileOverrides)
  }
  return out
}

// Merge a theme skin with a scenario's content. Scenario fields override theme
// defaults; `commands` and `locks` shallow-merge.
function mergeScenario(theme, scenario) {
  return {
    ...theme,
    scenarioId: scenario.id ?? null,
    scenarioName: scenario.name ?? null,
    user: scenario.user ?? theme.user,
    header: scenario.header ?? theme.header,
    prompt: scenario.prompt ?? theme.prompt,
    boot: scenario.boot ?? theme.boot ?? [],
    motd: scenario.motd ?? theme.motd ?? [],
    login: scenario.login ?? theme.login ?? null,
    selfDestruct: scenario.selfDestruct ?? theme.selfDestruct ?? null,
    tracer: scenario.tracer ?? theme.tracer ?? null,
    dialog: scenario.dialog ?? theme.dialog ?? null,
    checkMisleadsOnFail: scenario.checkMisleadsOnFail ?? theme.checkMisleadsOnFail ?? false,
    events: scenario.events ?? {},
    aliases: { ...theme.aliases, ...scenario.aliases },
    locks: { ...theme.locks, ...scenario.locks },
    commands: { ...theme.commands, ...scenario.commands },
    filesystem: scenario.filesystem ?? {}
  }
}

// Skin fields a custom bundle may override for a fully bespoke look.
const SKIN_KEYS = [
  'palette', 'font', 'fontSize', 'crt', 'banner', 'screensaver',
  'sounds', 'unknownHint', 'extraHelp'
]

// Build a runtime theme from an inline scenario bundle — GM-authored content
// loaded from a URL or pasted JSON, no repo edit required. The bundle mirrors a
// scenario.json plus a `files` map (path -> raw text, front-matter and all) and
// an optional base `theme` id to skin it.
export function composeCustomScenario(bundle, lang = 'en') {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    throw new Error('scenario bundle must be a JSON object')
  }
  const baseId =
    bundle.theme && THEME_REGISTRY[bundle.theme]
      ? bundle.theme
      : THEME_REGISTRY.ibm
        ? 'ibm'
        : THEME_LIST[0].id
  const theme = applyI18n(THEME_REGISTRY[baseId], lang)

  const filesObj = bundle.files ?? {}
  if (typeof filesObj !== 'object' || Array.isArray(filesObj)) {
    throw new Error('`files` must be an object of path -> text')
  }
  const files = Object.entries(filesObj).map(([path, raw]) => {
    const p = path.startsWith('/') ? path : '/' + path
    const { meta, content } = parseFrontMatter(String(raw))
    return { path: p, content, meta }
  })

  const scenario = localizeScenario(
    { ...bundle, id: bundle.id ?? 'custom', filesystem: buildFilesystem(files) },
    lang
  )
  const merged = mergeScenario(theme, scenario)
  const skin = applyI18n(bundle, lang)
  for (const k of SKIN_KEYS) {
    if (skin[k] != null) merged[k] = skin[k]
  }
  merged.custom = true
  return merged
}
