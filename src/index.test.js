import { describe, it, expect } from 'vitest'
import {
  parseFrontMatter,
  buildFilesystem,
  composeCustomScenario,
  runCommand,
  makeT
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
