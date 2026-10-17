# PymeSolve — handoff para Antigravity

Tickets y quién hace qué: `ORQUESTA.md`. Gemini 3.8 lee ese archivo y toma el ticket actual.

Abrí esta carpeta:

`/home/santinofl/Proyectos/scaffold-stellar-agentic`

La app que se ve al correr el proyecto es **PymeSolve** (`app/src/market/`). `app/src/App.tsx` monta `MarketApp`. EnComún (`app/src/encomun/`) y el juego (`app/src/game/`) siguen en el repo y no son la entrada.

Respondé en español. La interfaz va en español. Testnet solamente.

## Qué es

El barrio paga una sola vez. Problemas parecidos de pymes ticas se juntan en un encargo. El USDC espera en un retén de Trustless Work hasta la carta del lunes y una mayoría de “Yo lo vi”. El estado del encargo vive en el contrato Soroban `pools`. Nombres, barrio y chat quedan fuera de la red.

Semilla visible sin wallet: Soda El Casado (Desamparados), Pulpería Doña Lidi (Hatillo) y Salón Nidia (San Pedro), 10 USDC cada una, encargo “Video de 20 segundos del plato del día”, meta 30, estado Open. Karla Quesada es oficio aceptado. Andrés Mora está en revisión.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Pantallas | `app/src/market/pages/` |
| Estilos | `app/src/market/styles.module.css` |
| API del frente | `app/src/market/api.ts` |
| Retén Trustless Work | `app/src/market/escrow.ts` |
| Llamadas al contrato | `app/src/market/chain.ts` |
| Mesa local (sqlite) | `server/index.mjs` en el puerto 8787 |
| Gemelos y plantillas | `server/match.mjs` |
| Gemma | `server/gemma.mjs` |
| Contrato | `contracts/pools/` |
| Id en testnet | `CDMSG23ZH5L7YKSGZ2EN4RGFI65OU4DGVOAKUDTXEGWSWPA2U23BH3RU` |
| Cliente generado | `app-lib/clients/` — no editarlo a mano |
| Cómo arrancar y convenciones | `AGENTS.md` y `README.md` |

## Cómo correrlo

Desde la raíz del repo:

```bash
node server/index.mjs
```

Desde `app/`:

```bash
npx vite --host 127.0.0.1 --port 5173 --strictPort
```

Vite hace proxy de `/api` a `http://127.0.0.1:8787`. Si cambiás `server/index.mjs`, hay que reiniciar ese proceso. `npm start` desde la raíz también levanta scaffold + Vite, pero no hace falta redeployar `pools` para trabajo de interfaz.

## Reglas de la interfaz

- Columna de teléfono, máximo 440 px. Cinco pestañas: Problemas, Encargos, Publicar, Libro, Ajustes.
- Tres temas sólidos: papel, campo, noche. `localStorage`: `pymesolve-tema`, `pymesolve-modo`, `pymesolve-role`, `pymesolve-actor`.
- Animar solo al tocar. Colores sólidos, borde duro, contraste fuerte. Nada de brillo, gradiente, shimmer, vidrio ni movimiento en reposo.
- Dopamina es un modo (Ajustes), no una sexta pestaña.
- En Problemas, Encargos, Publicar y Libro se dice retén, oficio, carta y el lunes. Esas pantallas no dicen testnet, contrato, Cavos, trustline, firmar ni escrow. Eso vive en Ajustes.
- Cada firma pasa por `useWallet().signTransaction`. No importar Cavos ni Stellar Wallets Kit dentro de `app/src/market/`.
- No inventar `PUBLIC_CAVOS_APP_ID` ni `PUBLIC_TRUSTLESS_WORK_API_KEY`. En `app/.env` están vacíos. Sin App ID, Entrar muestra “Usar una wallet”.
- El modelo no firma, no mueve USDC, no verifica personas y no crea el encargo.

## Buscador

Una frase y un solo resultado. No una grilla. Con la caja vacía se queda el caso de las tres sodas.

- Pantalla: `app/src/market/pages/Problemas.tsx`. Espera 250 ms y busca desde 2 caracteres.
- Servidor: `listProblems` en `server/index.mjs`. FTS5 con prefijo (`"video"*`), orden `bm25`, `LIMIT 1`. Si no hay match, busca por título, texto, rubro, barrio o nombre. Reiniciar la API para que tome este cambio.
- El input del buscador sigue en `min-height: 2.7rem` y `font-size: 1rem` (`.search input` en `styles.module.css`). Si se agranda, que se note como caja de búsqueda, no como grilla.
- Falta verificar en el navegador: “video”, “Desamparados”, una frase sin resultado, y que al borrar vuelva el caso de 30 USDC.

## Dopamina, estilo Tinder

`app/src/market/pages/Dopamina.tsx`.

- Una tarjeta. Derecha = “Me sirve”. Izquierda = “Ahora no”. Arrastre, botones y flechas. Umbral 88 px.
- “Me sirve” en un comercio guarda el interés y abre su encargo o su perfil. “Me sirve” en un oficio solo guarda el interés: no contrata, no deposita y no salta la revisión.
- Mazo por defecto: un oficio ve comercios; una pyme ve oficios.
- Ya hay una carta de atrás (`.stage` / `.deckBack`) con el nombre siguiente, sello grande al arrastrar y una leve rotación atada al dedo.
- Las viñetas dicen “Ideas para el lunes” o “En qué le sirve a una pyme”, y “en esta máquina” o “plantilla” según `GET /api/gemma`.
- Falta verificar el arrastre en el navegador: que la carta de atrás se vea, que el sello salga al pasar ~36 px y que “Me sirve” / “Ahora no” avancen el mazo.

## La máquina (Gemma)

Ollama en `http://127.0.0.1:11434`, modelo `gemma4:e2b`. No está instalado en esta máquina: `askGemma` cae a plantillas y la demo sigue. No hace falta instalarlo para seguir la interfaz.

Tres trabajos, cacheados en sqlite (`card_copy`). Pasar tarjetas no vuelve a llamar al modelo.

1. Gemelos al publicar: mismo rubro, Jaccard ≥ 0.12, hasta tres. Resumen en cristiano. `server/match.mjs`.
2. Oficio: tres viñetas de en qué le sirve a una pyme.
3. Pyme: tres ideas para el lunes a partir del problema publicado.

En pantalla, sin nombrar el modelo:

- `Publicar.tsx`: “La máquina vio gemelos” o “Mismo pedido”, y “Escrito en esta máquina” o “Plantilla”.
- `Dopamina.tsx`: el rótulo de las viñetas.
- `Perfil.tsx`: las mismas viñetas debajo de la ficha, si el usuario ya las tiene.

Ajustes es el único lugar donde se puede decir Gemma, Ollama, testnet y el explorador.

## Qué no tocar

- No redeployar `pools` por cambios de interfaz. `revise_amount` ya está en testnet y en el cliente.
- No mezclar EnComún ni el juego en la navegación de PymeSolve.
- No correr `npm audit fix --force`.
- Secretos (`S…`, seed) no se piden, no se imprimen y no se commitean. `app/.env` es config pública y no se commitea.
