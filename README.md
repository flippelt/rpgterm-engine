# rpgterm-engine

Motor de lógica pura do [Immersive Terminal for RPGs](https://github.com/flippelt/Immersive-Terminal-for-RPGs)
(`rpgterm`), extraído para ser fonte única — consumido tanto pelo terminal
quanto pelo editor [scenario-forge](https://github.com/flippelt/scenario-forge),
acabando com o risco de divergência de schema.

**Sem DOM, sem React, sem áudio.** O host injeta áudio e persistência via `ctx`.

## Conteúdo
- **Sistema de arquivos virtual** (`normalizePath`, `getNode`, `listDir`, `buildFilesystem`)
- **Interpretador de comandos** (`runCommand`, `complete`) — ls/cd/cat/crack/decrypt/unlock/check…
- **Mecânicas**: crack (força bruta / DC), tracer/recon (`effTracer`, `scanTier`), decrypt estilo Wordle (`scoreGuess`, `pickWord`, `rollLuck`)
- **Cenários** (`parseFrontMatter`, `composeCustomScenario`) + os 8 skins de tema
- **Markdown → linhas** (`renderMarkdown`), **share** (`encodeBundle`/`decodeBundle`/`shareUrl`), **i18n** (`makeT`)

## Uso

```js
import { parseFrontMatter, buildFilesystem, composeCustomScenario, runCommand } from 'rpgterm-engine'

const bundle = {
  theme: 'cprd',
  id: 'demo',
  files: { '/intel/blackbox.dat': '---\nlocked: true\npassword: OPEN\n---\nsegredo' }
}
const theme = composeCustomScenario(bundle) // pronto para o terminal renderizar
```

### Áudio / persistência (opcional)
`volume` e `hum` usam `ctx.audio` (adaptador injetável) e `ctx.persist(key, value)`.
Sem eles, funcionam como no-op — ideal para preview/testes.

## Consumo via git (antes de publicar no npm)
```json
{ "dependencies": { "rpgterm-engine": "github:flippelt/rpgterm-engine" } }
```

## Dev
```bash
npm install
npm test
```
