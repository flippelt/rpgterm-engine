// Hand-written types for the public API. The implementation is plain JS; these
// keep TS consumers (scenario-forge) honest about the engine's shape.

export type FrontMatterValue = string | number | boolean
export type FileMeta = Record<string, FrontMatterValue>

export interface ParsedFile {
  meta: FileMeta
  content: string
}

export interface FileEntry {
  path: string
  content: string
  meta?: FileMeta
}

export interface VfsDir {
  type: 'dir'
  children: string[]
}
export interface VfsFile {
  type: 'file'
  content: string
  [flag: string]: unknown
}
export type Vfs = Record<string, VfsDir | VfsFile>

export interface Line {
  text?: string
  type?: string
  [k: string]: unknown
}

// --- filesystem ---
export function normalizePath(cwd: string, target: string): string
export function getNode(fs: Vfs, path: string): VfsDir | VfsFile | null
export function listDir(
  fs: Vfs,
  path: string
): { name: string; type: 'dir' | 'file'; size: number | null }[] | null

// --- tracer ---
export function effTracer(
  tr: Record<string, number> | null | undefined,
  node: Record<string, number> | null | undefined,
  graceLost?: number
): { seconds: number; penalty: number; startAfter: number; nocrackSeconds: number }
export function scanTier(roll: number, dc: number, misleads?: boolean): 'precise' | 'ambiguous' | 'fail' | 'false'

// --- wordle / decrypt ---
export const DEFAULT_WORDS: string[]
export function wordsFor(lang: string): string[]
export function pickWord(meta: FileMeta, rand?: () => number, lang?: string): string
export function scoreGuess(guess: string, target: string): ('hit' | 'present' | 'miss')[]
export function isWin(guess: string, target: string): boolean
export function rollLuck(n: number): { roll: number; kind: 'lose' | 'reveal'; n: number; smiley: string; tone: string } | null
export function pickRevealPositions(len: number, count: number, taken?: Set<number>, rand?: () => number): number[]

// --- completion ---
export function complete(input: string, ctx: Record<string, unknown>): { value: string; list: string[] }

// --- markdown ---
export function renderMarkdown(content: string): Line[]

// --- share ---
export function encodeBundle(bundle: unknown): string
export function decodeBundle(token: string): unknown
export function shareUrl(bundle: unknown, location?: { origin: string; pathname: string }): string

// --- commands ---
export function runCommand(input: string, ctx: Record<string, unknown>): Line[]
export function renderFileContent(path: string, node: VfsFile): Line[]
export function buildCheckLines(theme: unknown, path: string, node: VfsFile, opts?: Record<string, unknown>): Line[]
export function buildCrackLines(theme: unknown, path: string, node: VfsFile, unlock: (p: string) => void, fs: Vfs, t?: unknown): Line[]
export function buildDecryptLines(theme: unknown, path: string, node: VfsFile, key: string, unlock: (p: string) => void, fs: Vfs, t?: unknown): Line[]
export function buildUnlockExtras(theme: unknown, path: string, node: VfsFile, t?: unknown): Line[]

// --- scenario ---
export function parseFrontMatter(raw: string): ParsedFile
export function buildFilesystem(entries: FileEntry[]): Vfs
export function composeCustomScenario(bundle: Record<string, unknown>, lang?: string): Record<string, unknown>
export const THEME_REGISTRY: Record<string, Record<string, unknown>>
export const THEMES: Record<string, unknown>[]

// --- i18n ---
export function makeT(lang?: string): (key: string, params?: Record<string, unknown>) => string | string[]
export const SUPPORTED_LANGS: string[]
