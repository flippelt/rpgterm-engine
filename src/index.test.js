import { describe, it, expect } from 'vitest'
import {
  parseFrontMatter,
  buildFilesystem,
  composeCustomScenario,
  composeTheme,
  validateBundle,
  validateScenario,
  validateFrontMatter,
  runCommand,
  makeT,
  THEMES
} from './index.js'

describe('rpgterm-engine public API', () => {
  it('parses front-matter with engine coercion', () => {
    const { meta, content } = parseFrontMatter('---\nlocked: true\ncrackDC: 15\npassword: "12345"\n---\nbody')
    expect(meta.locked).toBe(true)
    expect(meta.crackDC).toBe(15)
    expect(meta.password).toBe('12345')
    expect(content).toBe('body')
  })

  it('builds a VFS with inferred dirs and merged flags', () => {
    const fs = buildFilesystem([
      { path: '/intel/safe.dat', content: 'x', meta: { locked: true } },
      { path: '/case.md', content: 'hi', meta: {} }
    ])
    expect(fs['/'].type).toBe('dir')
    expect(fs['/intel'].type).toBe('dir')
    expect(fs['/intel/safe.dat'].locked).toBe(true)
  })

  it('composes a custom scenario into a runnable theme', () => {
    const theme = composeCustomScenario({
      theme: 'cprd',
      id: 'demo',
      files: { '/blackbox.dat': '---\nlocked: true\npassword: OPEN\n---\nsegredo' }
    })
    expect(theme.scenarioId).toBe('demo')
    expect(theme.filesystem['/blackbox.dat'].locked).toBe(true)
    expect(theme.palette).toBeTruthy() // cprd skin applied
  })

  it('runs a command against a composed scenario (audio optional)', () => {
    const theme = composeCustomScenario({
      theme: 'ibm',
      id: 'demo',
      files: { '/a.txt': 'hello', '/dir/b.txt': 'x' }
    })
    const lines = runCommand('ls', {
      theme,
      fs: theme.filesystem,
      cwd: '/',
      unlocked: new Set(),
      t: makeT('en')
    })
    const names = lines.map((l) => l.text)
    expect(names.some((n) => n.includes('a.txt'))).toBe(true)
    expect(names.some((n) => n.includes('dir'))).toBe(true)
  })

  it('volume command is a no-op without ctx.audio', () => {
    const theme = composeCustomScenario({ theme: 'ibm', id: 'demo', files: {} })
    const lines = runCommand('volume', { theme, fs: theme.filesystem, cwd: '/', unlocked: new Set(), t: makeT('en') })
    expect(Array.isArray(lines)).toBe(true)
    expect(lines.length).toBeGreaterThan(0)
  })
})

describe('composeTheme (pre-loaded scenario)', () => {
  it('returns null for an unknown theme id', () => {
    expect(composeTheme('nope', { id: 'x' })).toBeNull()
  })

  it('merges a loaded filesystem onto the skin', () => {
    const fs = buildFilesystem([{ path: '/note.md', content: 'hi', meta: {} }])
    const theme = composeTheme('ibm', { id: 'workstation', name: 'Halden', filesystem: fs, motd: ['ready'] })
    expect(theme.scenarioId).toBe('workstation')
    expect(theme.scenarioName).toBe('Halden')
    expect(theme.motd).toEqual(['ready'])
    expect(theme.filesystem['/note.md'].content).toBe('hi')
    expect(theme.palette).toBeTruthy()
  })

  it('matches composeCustomScenario for an equivalent bundle', () => {
    const bundle = {
      theme: 'ibm',
      id: 'demo',
      name: 'Op',
      motd: ['hi'],
      files: { '/a.txt': 'x' }
    }
    const custom = composeCustomScenario(bundle)
    const fs = buildFilesystem(
      Object.entries(bundle.files).map(([path, raw]) => {
        const { meta, content } = parseFrontMatter(raw)
        return { path, content, meta }
      })
    )
    const fromDisk = composeTheme('ibm', { id: 'demo', name: 'Op', motd: ['hi'], filesystem: fs })
    expect(fromDisk.scenarioId).toBe(custom.scenarioId)
    expect(fromDisk.motd).toEqual(custom.motd)
    expect(fromDisk.filesystem['/a.txt'].content).toBe(custom.filesystem['/a.txt'].content)
  })
})

describe('theme cabinet profile', () => {
  it('every skin ships a shortName and a CRT cabinet', () => {
    for (const theme of THEMES) {
      expect(theme.shortName, theme.id).toMatch(/\S/)
      expect(theme.crt.bezel, theme.id).toMatch(/^#/)
      expect(theme.crt.led, theme.id).toMatch(/^#/)
      expect(typeof theme.crt.scanlines, theme.id).toBe('number')
      expect(typeof theme.crt.flicker, theme.id).toBe('number')
      expect(typeof theme.crt.curve, theme.id).toBe('number')
      expect(typeof theme.crt.bloom, theme.id).toBe('number')
    }
  })

  it('every stock banner has one width on every line', () => {
    for (const theme of THEMES) {
      const widths = theme.banner.split('\n').map((l) => l.length)
      expect(new Set(widths).size, `${theme.id}: ${widths}`).toBe(1)
    }
    const ibm = THEMES.find((t) => t.id === 'ibm')
    expect(ibm.banner.split('\n')[0].length).toBe(48)
    expect(ibm.banner).toContain('IBM Personal Computer')
    expect(ibm.banner).toContain('PC-DOS  Version 3.30')
    expect(ibm.banner).toContain('(C) Copyright IBM Corp 1981, 1987')
  })
})

describe('schema', () => {
  it('accepts a well-formed scenario.json', () => {
    expect(validateScenario({
      id: 'workstation',
      name: 'Halden',
      login: { password: 'HALDEN' },
      tracer: { seconds: 30 },
      motd: ['hi'],
      commands: { ver: ['PC-DOS'] }
    })).toEqual([])
  })

  it('flags a typed-wrong field', () => {
    const errors = validateScenario({ login: { password: 12 } })
    expect(errors.some((e) => e.includes('login.password'))).toBe(true)
  })

  it('accepts known front-matter and flags a bad type', () => {
    expect(validateFrontMatter({ locked: true, crackDC: 12, password: 'KEY' })).toEqual([])
    expect(validateFrontMatter({ crackDC: 'twelve' }).some((e) => e.includes('crackDC'))).toBe(true)
  })

  it('validateBundle throws a listed error on a bad files map', () => {
    expect(() => validateBundle({ files: ['a'] })).toThrow(/files/)
  })

  it('composeCustomScenario rejects a bundle that fails the schema', () => {
    expect(() => composeCustomScenario({ motd: 'not-an-array', files: {} })).toThrow(/invalid scenario bundle/)
  })
})
