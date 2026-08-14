# rpgterm-engine

[![npm](https://img.shields.io/npm/v/rpgterm-engine.svg)](https://www.npmjs.com/package/rpgterm-engine)
[![license](https://img.shields.io/npm/l/rpgterm-engine.svg)](./package.json)

Motor de lógica pura do [Immersive Terminal for RPGs](https://github.com/flippelt/Immersive-Terminal-for-RPGs),
extraído para ser **fonte única** — consumido tanto pelo terminal quanto pelo editor
[scenario-forge](https://github.com/flippelt/scenario-forge), acabando com o risco de
divergência de schema entre quem cria os cenários e quem os roda.

**Sem DOM, sem React, sem áudio.** ESM puro. O host injeta áudio e persistência via `ctx`.

## Instalação

```bash
npm install rpgterm-engine
```

> Pacote **ESM-only**. Importe com `import` (não `require`). Ele importa JSON internamente,
> então rode-o por um bundler (Vite/webpack/Rollup) ou por um runtime com suporte a JSON
> modules — em Node puro use `--experimental-json-modules` quando aplicável. No **Vitest**,
> os consumidores precisam de `test.server.deps.inline: [/rpgterm-engine/]` para o engine
> ser transformado dentro de `node_modules`.

## Conteúdo
- **Sistema de arquivos virtual** (`normalizePath`, `getNode`, `listDir`, `buildFilesystem`)
- **Interpretador de comandos** (`runCommand`, `complete`) — ls/cd/cat/crack/decrypt/unlock/check…
- **Mecânicas**: crack (força bruta / DC), tracer & recon (`effTracer`, `scanTier`), decrypt estilo Wordle (`scoreGuess`, `pickWord`, `isWin`, `rollLuck`)
- **Cenários** (`parseFrontMatter`, `composeTheme`, `composeCustomScenario`) + os 8 skins de tema (`THEMES`, `THEME_REGISTRY`)
- **Schema** (`src/schema/scenario.schema.json`, `src/schema/frontmatter.schema.json`, `validateBundle`) — contrato compartilhado com o terminal e o scenario-forge
- **Markdown → linhas** (`renderMarkdown`)
- **Compartilhamento** (`encodeBundle`, `decodeBundle`, `shareUrl`)
- **i18n** (`makeT`, `SUPPORTED_LANGS`)

A superfície pública completa (com tipos) está em [`src/index.d.ts`](./src/index.d.ts).

## Uso

```js
import { composeCustomScenario, runCommand } from 'rpgterm-engine'

const bundle = {
  theme: 'cprd',
  id: 'demo',
  files: { '/intel/blackbox.dat': '---\nlocked: true\npassword: OPEN\n---\nsegredo' },
}

// Monta o cenário no formato que o terminal renderiza (fs virtual + tema).
const scenario = composeCustomScenario(bundle)
```

### Áudio / persistência (opcional)
Os comandos `volume` e `hum` usam `ctx.audio` (adaptador injetável) e `ctx.persist(key, value)`.
Sem eles, funcionam como no-op — ideal para preview e testes. Exemplo de `ctx` mínimo para
`runCommand`:

```js
const ctx = {
  fs,                         // Vfs (de buildFilesystem)
  cwd: '/',
  theme,                      // skin de THEME_REGISTRY
  t: makeT('pt'),             // tradutor
  unlock: (path) => { /* … */ },
  // audio / persist são opcionais
}
runCommand('ls', ctx)
```

## Onde é usado
- **Immersive Terminal for RPGs** — o terminal jogável (UI React em cima deste motor).
- **scenario-forge** — editor desktop que monta os cenários; tem um teste de paridade rodando
  contra este pacote, garantindo que o que o editor exporta é exatamente o que o terminal lê.

### Schema

O JSON Schema é a fonte do contrato. Importe o validador (zero deps) ou o
arquivo cru via subpath:

```js
import { validateBundle, validateScenario, validateFrontMatter } from 'rpgterm-engine'
import scenarioSchema from 'rpgterm-engine/schema'
import frontmatterSchema from 'rpgterm-engine/schema/frontmatter'

validateBundle(bundle)              // throws on a bad GM-pasted bundle
validateScenario(scenarioJson)      // string[] of path-prefixed errors
validateFrontMatter({ locked: true, crackDC: 12 })
```

`composeCustomScenario` valida o bundle contra o schema antes de montar o
tema. Campos extra são permitidos (round-trip de ferramentas); tipos errados
não.

Hosts que carregam cenários do disco (`import.meta.glob`) devem chamar
`composeTheme(themeId, loadedScenario, lang)` — o engine aplica i18n, merge
da skin e o filesystem já construído. Não reimplemente isso no host.

## Dev
```bash
npm install
npm test          # vitest run
npm run test:watch
```

## Publicação
`npm version <patch|minor|major>` e empurrar a tag (`git push --follow-tags`) dispara o
workflow `publish.yml`, que roda os testes e publica no npm via `NPM_TOKEN`.

## Licença
MIT © Felipe Lippelt
