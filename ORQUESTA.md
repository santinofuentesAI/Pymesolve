# Orquesta — Grok + Gemini 3.8 + Argón

Grok (este chat) orquesta y hace el trabajo de criterio: identidad visual, Stellar/Cavos/Trustless Work, copy de producto, Dopamina.

Gemini 3.8 Flash vive en **Antigravity**, abierta sobre esta misma carpeta. No está en los subagentes de Cursor, así que las órdenes van acá, no por un modelo sustituto.

Gemini 4 Argón se usa **poco**: un nudo difícil, no un bucle.

Leé `PYMESOLVE.md` y `AGENTS.md` antes de tocar código. UI en español. Testnet. No inventar App ID ni API key.

## Quién hace qué

### Gemini 3.8 Flash (Antigravity) — rápido y acotado

Es el workhorse de código: refactors mecánicos, tests, CSS de tokens, FTS, formularios, typecheck, lint, extraer funciones, seguir un ticket cerrado.

- Pensamiento **MEDIUM** o **LOW**. HIGH gasta de más.
- Un ticket a la vez. Un PR mental chico. No reabrir el diseño.
- No tocar identidad visual “a ojo”. Si duda entre sólido y brillo, sólido.
- No tocar `contracts/`, `app/src/market/escrow.ts`, `chain.ts`, `WalletProvider`, ni clientes generados.
- No mezclar EnComún ni el juego en PymeSolve.
- Al terminar: 5 líneas en `ORQUESTA.md` (hecho / no hecho / archivos).

### Grok — orquesta + lo que pide criterio

Dopamina (mazo Tinder), copy de mostrador, temas, Cavos/TW/Soroban, qué pantalla se siente mal, el siguiente ticket.

### Gemini 4 Argón — un tiro, no un hábito

Solo si Grok lo pide por escrito: un bug de firma/retén, un fallo de contrato, o una decisión de arquitectura que 3.8 ya reventó. Un prompt, una respuesta, se apaga.

## Ticket actual para Gemini 3.8

**Gemma: si Ollama no está, `ok: false`; al guardar perfil, borrar `card_copy`.**

Pensamiento MEDIUM. Diff mínimo. No toques el frente, contratos, `escrow.ts`, `chain.ts`, ni `WalletProvider`.

1. En `server/gemma.test.mjs` agregá un test que llama `gemmaReady()` (importalo de `gemma.mjs`). Sin Ollama tiene que devolver `{ ok: false, model: "gemma4:e2b" }` (o el `PYMESOLVE_MODEL` si está). No levantes Ollama. No mockees `fetch` si el timeout de 1.5 s ya cubre la máquina sin daemon; si el test queda lento, mockeá `fetch` **arriba del archivo**, no inline.

2. En `server/index.mjs`, en `POST /api/profile`, después de guardar el usuario, borré las filas de `card_copy` de esa persona (`user:{id}` o la key que use `bulletsFor`). Así las viñetas se reescriben (Gemma o plantilla) y no quedan las del seed.

3. Corré `npm run test:mesa` desde la raíz. Tiene que pasar.

### No toques

Copy de producto, Dopamina, Ajustes, EnComún, el juego.

### Al terminar

5 líneas al final de este archivo: hecho / no hecho / archivos / salida del test.

## Cola (no empieces hasta que Grok lo mueva acá)

- Quitar Recetas / Altas / mostrador de la nav si todavía cuelgan (las cinco pestañas ya están bien; no borres `/asistente` ni `/mesa` sin que Grok lo pida).
- Typecheck + lint de archivos que Gemini toque.

## Revisión Grok (ticket summarize)

Aceptado. 44/44. `match.mjs` no se tocó.

## Revisión Grok (ticket problemRow)

Aceptado. 39/39. El mapeo snake → camel está cubierto.

## Revisión Grok (ticket ftsQuery)

Aceptado. 35/35. `ftsQuery` y `listProblems` no se tocaron.

## Revisión Grok (ticket tokens)

Aceptado. 28/28. `tokens` no se tocó.

## Revisión Grok (ticket grupos)

Aceptado el de Gemini. Había un duplicado mío: lo saqué. Queda una sola suite. El `.sort()` de `problemIds` muta el array; no es fallo.

## Revisión Grok (ticket gemelos)

Aceptado. Corrí los tres archivos: 18/18. `findTwins` no se tocó. El caso web+videos y el `poolId` filtran bien.

## Revisión Grok (ticket tests Gemma y FTS)

Aceptado. Corrí `node --test server/problems.test.mjs server/gemma.test.mjs`: 12/12. `ORDER BY bm25` intacto. Typecheck del app pasa.

Nota para el siguiente ticket: en `node:sqlite`, `.all([x])` tira `Unknown named parameter '0'`. Hay que pasar `.all(x)` o `.all(a, b)`, nunca un array. En `server/problems.mjs` ya quedó así. No uses `.all(...array)` si el array puede confundirse.

Grok: Encargos (fichas + · vos), Libro (fecha), Dopamina (`pointercancel`), API reiniciada. El caso de las tres sodas se ve en Inicio.

## Revisión Grok (ticket buscador)

Aceptado. Restauré `ORDER BY bm25(problems_fts)` (había quedado `p.id ASC`) y subí el import de `server/index.mjs` al tope. El typecheck de Dopamina lo cierra Grok.

## Resultado del ticket tests Gemma y FTS

- Hecho: `server/problems.test.mjs` valida `results.length === 1` y `/video/i` sin imponer "plato del día", respetando `ORDER BY bm25(problems_fts)` en `server/problems.mjs`.
- Hecho: Creado `server/gemma.test.mjs` con 5 tests sobre las plantillas puras (`twinSummaryFallback`, `pymeBulletsFallback`, `oficioBulletsFallback`) sin HTTP ni Ollama.
- No hecho: Nada pendiente. Cero modificaciones a `Dopamina.tsx`, `styles.module.css`, `Problemas.tsx`, `escrow.ts`, `chain.ts`, `WalletProvider`, contratos ni clientes.
- Archivos: `server/problems.test.mjs`, `server/gemma.test.mjs`.
- Salida del test: `node --test server/problems.test.mjs server/gemma.test.mjs` → ℹ tests 12 ℹ suites 0 ℹ pass 12 ℹ fail 0 (duración_ms 78.2).

## Resultado del ticket Gemma y card_copy

- Hecho: Agregado test en `server/gemma.test.mjs` que valida `gemmaReady()` sin Ollama retornando `{ ok: false, model: "gemma4:e2b" }`.
- Hecho: En `POST /api/profile` de `server/index.mjs` se agregó el borrado de filas en `card_copy` para el usuario (`user:${id}:%`) al guardar perfil.
- No hecho: Nada pendiente. Cero cambios en el frente, contratos, `escrow.ts`, `chain.ts`, `WalletProvider`, EnComún ni el juego.
- Archivos: `server/gemma.test.mjs`, `server/index.mjs`.
- Salida del test: `npm run test:mesa` → ℹ tests 49 ℹ suites 0 ℹ pass 49 ℹ fail 0 (duración_ms 268.1).









