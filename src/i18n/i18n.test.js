import { describe, it, expect } from 'vitest'
import en from './ui.en.json'
import pt from './ui.pt.json'

// Dictionary parity now lives with the data (it moved here from the terminal
// when the dictionaries were deduplicated into the engine).
describe('dictionary parity', () => {
  // Command names must never be translated: the help table keeps identical
  // command tokens in both languages (only the descriptions differ).
  it('keeps the same command tokens in the pt help table', () => {
    const token = (line) => line.trim().split(/\s+/)[0]
    expect(pt['help.lines'].map(token)).toEqual(en['help.lines'].map(token))
  })

  it('every pt key exists in en (no orphan translations)', () => {
    for (const key of Object.keys(pt)) {
      if (key === 'lang') continue
      expect(en, `en is missing key "${key}"`).toHaveProperty([key])
    }
  })
})
