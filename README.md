# PymeSolve

¿Quién te soluciona?. Una pequeña/mediana empresa publica un problema en esta app. Si otra tiene el mismo, se juntan ambos problemas en una sola publicación (una IA entrenada se encarga). Un freelancer verificado ve el encargo, lo acepta y se pone a trabajar en la solución de su problema, todo bajo el sello Stellar, Trustless Work y Cavos. 

Está hecha para pymes de Costa Rica, en testnet. La plata de prueba no vale. El XLM de la cuenta solo paga la comisión de la red.

## El caso que abre

Sin entrar se ve el encargo de ejemplo: Soda El Casado, Pulpería Doña Lidi y Salón Nidia piden un video de unos 20 segundos. Cada una pone 10. La meta es **30 USDC**. Un oficio cobra esa meta una vez, no tres trabajos sueltos.

## Tres formas de usarla

La misma app cambia de pies a cabeza según quién entra. El cambio de persona de prueba está al fondo de Ajustes, cerrado.

| Quién | Qué hace | Abajo |
| --- | --- | --- |
| Pyme | Publica un problema y sigue su parte del encargo. | Problemas, Encargos, Publicar, Libro, Ajustes |
| Oficio | Toma un encargo y deja la carta. | Ofertas, Encargos, Chats, Libro, Ajustes |
| Mesa | Mira altas y, si hay pelea, parte el USDC. No publica ni toma encargos. | Mesa, Altas, Chats, Libro, Ajustes |

Dopamina no es una pestaña. Desde Problemas se puede pasar oficios como un mazo: a la derecha se guarda, a la izquierda se va. En Encargos, **Gente que me sirve** lista a esas personas en una oración, con perfil y un chat directo.

La búsqueda es una frase y un resultado. El Libro muestra quién se sumó, depositó o tomó el encargo. Una pyme ve su nombre y al resto como “Un comercio”. La mesa sí ve los nombres.

Ajustes tiene el comercio, la plata de prueba y tres temas: papel, campo y noche.

## Un encargo, de punta a punta

1. Una pyme publica el problema: rubro, dos o tres oraciones y cuánto pone.
2. Si hay otros del mismo rubro con un pedido parecido, se arman gemelos y un solo encargo.
3. Cada comercio confirma su parte.
4. Un oficio toma el encargo. No puede ser una pyme de ese mismo grupo.
5. Cada comercio deja su USDC en el retén.
6. El oficio entrega la carta del lunes: cómo se hace el trabajo, en el local.
7. Otra persona toca **Yo lo vi** y se suelta el USDC. Si hay pelea, la mesa lee el chat y desempata.

## Qué va a la red y qué se queda en la máquina

| Pieza | Dónde | Qué guarda |
| --- | --- | --- |
| Cuenta | Cavos (correo o Google) o una wallet | La cuenta `G…` que firma. La llave no la ve la app. |
| Contrato `pools` | Stellar testnet, vía Scaffold | Quién se unió, cuánto prometió, quién tomó el oficio, el estado y la dirección del retén. No mueve USDC. |
| Retén | Trustless Work | El USDC espera ahí hasta la carta y “Yo lo vi”. |
| Mesa local | `server/` en esta máquina | Nombres, barrio, chats, “Me sirve”, Drive y el Libro que se ve en pantalla. |

El contrato desplegado es [`CDMSG23ZH5L7YKSGZ2EN4RGFI65OU4DGVOAKUDTXEGWSWPA2U23BH3RU`](https://stellar.expert/explorer/testnet/contract/CDMSG23ZH5L7YKSGZ2EN4RGFI65OU4DGVOAKUDTXEGWSWPA2U23BH3RU).

Gemma 4 E2B puede correr en local con Ollama (`ollama pull gemma4:e2b`) para el texto de los gemelos y las tarjetas de Dopamina. Si no está, la app usa plantillas. Gemma no firma, no mueve USDC, no verifica personas y no crea encargos.

## Cómo correrla

Hace falta Node.js 22 o más, Rust con rustup y git. En Windows, WSL2.

```bash
npm run setup:tools
npm install
npm run doctor
npm run contracts:build
npm start
```

Abrí [http://localhost:5173](http://localhost:5173). La primera vez el contrato tarda un minuto en desplegarse. El puerto 5173 es fijo.

`app/.env` guarda solo config pública. No se commitea.

- `PUBLIC_CAVOS_APP_ID`: entrar con correo o Google. En el [dashboard de Cavos](https://cavos.xyz/dashboard) el origen permitido es `http://localhost:5173`, sin barra al final.
- `PUBLIC_TRUSTLESS_WORK_API_KEY`: el retén. Se pide en [dapp.trustlesswork.com](https://dapp.trustlesswork.com), pestaña Testnet.

Para una demo que no se reinicie a mitad del correo: `npm run present`.

## Probarla

1. Abrí Problemas y mirá las tres y los 30 USDC.
2. Entrá con correo.
3. En Ajustes, **Cargar plata de prueba**. Eso pide XLM de Friendbot, abre la trustline de USDC y cambia una parte a dólares de prueba.
4. Un oficio toma el encargo.
5. Cada pyme deposita su parte.
6. El oficio deja la carta. Otra pyme toca **Yo lo vi** y se suelta el USDC.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Compila, despliega en testnet, genera el cliente y abre la app. |
| `npm run present` | La deja en 5173 sin recarga en caliente, y levanta la mesa si se cae. |
| `npm run doctor` | Revisa herramientas, `app/.env` y las claves. |
| `npm run contracts:build` | Compila, despliega y genera el cliente una vez. |
| `npm run contracts:test` | Tests del contrato. |
| `npm run test:mesa` | Tests de la mesa local. |
| `npm run check` | Contratos, formato, tipos y lint. |

## De dónde sale

PymeSolve está armada sobre [Scaffold Stellar](https://github.com/stellar-scaffold/cli) (Apache-2.0), de The Aha Company. De ahí vienen el contrato en Rust, la app en Vite y React, y el cliente TypeScript que se genera al desplegar.

El retén usa `@trustless-work/escrow` 3.0.5 (API V1). La cuenta de correo usa `@cavos/kit` 0.2.5. El SDK de Soroban es 26. La red de trabajo es testnet (`scaffold.yml` v2, CLI 0.0.28).

El detalle de la licencia está en [`NOTICE`](NOTICE). Este repositorio se distribuye bajo Apache-2.0.
