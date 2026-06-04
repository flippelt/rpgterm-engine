// Public API of rpgterm-engine — the pure logic of the Immersive Terminal for
// RPGs, extracted so the terminal and the scenario-forge editor share
// one source of truth (no schema drift). No DOM, no React, no audio: the host
// injects audio/persistence via ctx (see commands.js).

export { normalizePath, getNode, listDir } from './engine/filesystem.js'
export { effTracer, scanTier } from './engine/tracer.js'
export {
  DEFAULT_WORDS,
  wordsFor,
  pickWord,
  scoreGuess,
  isWin,
  rollLuck,
  pickRevealPositions
} from './engine/wordle.js'
export { complete } from './engine/complete.js'
export { renderMarkdown } from './engine/markdown.js'
export { encodeBundle, decodeBundle, shareUrl } from './engine/share.js'
export {
  runCommand,
  renderFileContent,
  buildCheckLines,
  buildCrackLines,
  buildDecryptLines,
  buildUnlockExtras
} from './engine/commands.js'
export {
  parseFrontMatter,
  buildFilesystem,
  composeCustomScenario,
  THEME_REGISTRY,
  THEMES
} from './engine/scenario.js'
export { makeT, SUPPORTED_LANGS } from './i18n/ui.js'
