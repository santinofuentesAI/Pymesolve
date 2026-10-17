# EnComún como app usable

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al abrir EnComún se entiende qué plata es, para qué sirve la categoría abierta y cuál es el único paso que sigue, dentro de una columna que se lee como una app de teléfono.

**Architecture:** La plata sigue saliendo del contrato `fondos` en testnet, por `app/src/encomun/chain.ts`. Este plan no cambia el contrato. Cambia la pantalla: un marco de 440px, un paso calculado en `flow.ts`, una categoría con dos acciones, un libro en filas y Ajustes como lista de pasos. La firma sigue en `useWallet().signTransaction`.

**Tech Stack:** React 19, CSS Modules, React Query, el cliente `fondos` ya generado, Cavos solo para entrar (`useCavosState().signIn`).

## Global Constraints

- Testnet únicamente. No cambiar `STELLAR_SCAFFOLD_ENV` ni el emisor de USDC de mainnet.
- Texto de la app en español. Vos, no tú.
- Nombres de personas solo en SQLite. En el contrato solo hay `Address`.
- Toda firma pasa por `useWallet().signTransaction`. En `app/src/encomun/` no importar `@cavos/kit` ni Stellar Wallets Kit. Entrar usa `useCavosState().signIn`.
- No editar `app-lib/clients/*`.
- No pedir, imprimir ni commitear llaves `S…`, seeds ni `app/.env`.
- No inventar `PUBLIC_CAVOS_APP_ID`. Si está vacío, la pantalla lo dice en una frase y el resto se puede leer igual.
- XLM solo paga la red. La plata del fondo es USDC. Montos de la UI: enteros de 1 a 200.
- Sin animación al cargar. Sin glass. Sin emojis en botones. Sin degradados en el título.
- Una categoría llena el cuerpo. Abajo: Sacos, Flete, Adelanto, Libro, Ajustes. Solo la pestaña abierta lleva color.
- La entrada sigue siendo `EncomunApp`. No montar DeFiesta ni `app/src/market`.
- No resetear `server/encomun.sqlite`.
- No crear commits. Cada tarea termina en el chequeo que indica. Un commit es otro pedido.
- En Sacos, Flete, Adelanto y Libro no aparecen estas palabras: testnet, contrato, Cavos, App ID, stroop, asiento, tesorera, firmar, trustline, Freighter, wallet.

## Qué está mal hoy

La barra de abajo ocupa todo el ancho de la ventana y la tarjeta vive en una columna de 880px centrada. En un monitor se ven dos piezas sueltas y mucho beige vacío. Si la red tarda, desaparecen el título y las pestañas y queda la frase «Cargando el fondo…». Si falla, la frase dice «testnet». Poner y Pedir están los dos abiertos a la vez, con chips que solo dicen `8`. El botón de confirmar dice «Firmar». Ajustes es una pila de botones (XLM, habilitar USDC, cambiar 100 XLM, pegar una cuenta `G…`). El libro es un párrafo. La intro de tres pasos existe y no se abre la primera vez: `INTRO_KEY` se escribe y nunca se lee.

## Qué tiene que verse

La app es una columna de `min(440px, 100%)`, centrada, con borde de 2px. Afuera, el escritorio es un papel más oscuro. Adentro, el encabezado queda pegado arriba y la barra de cinco pestañas queda pegada abajo, del mismo ancho que la columna.

En Sacos, Flete y Adelanto, de arriba a abajo:

1. «La plata de la cosecha, a la vista.» y «Todos ven el mismo número y para qué se usa.»
2. La franja verde «Plata del grupo» con el saldo del contrato.
3. La tarjeta del color de esa categoría: nombre, monto grande, una frase de para qué sirve.
4. Si falta un paso, una sola tarjeta blanca con una frase y un botón.
5. Si ya se puede usar, dos botones: «Poner plata» y «Pedir plata». Elegir uno abre el monto. Confirmar dice qué va a pasar y el botón se llama «Confirmar».
6. Si hay pedidos abiertos de esa categoría, una lista con el nombre, el monto, el para qué, y «Yo lo vi» o «Cancelar este pedido».

Libro: filas con la frase y la fecha. Vacío: «Cuando alguien ponga o pida, queda escrito acá.»

Ajustes: cuatro pasos visibles. El botón vive solo en el paso que toca ahora. Los de después se leen y no se pueden apretar. Tema, movimiento y «Cómo está hecha» quedan debajo. «Cómo está hecha» empieza cerrado.

La primera visita abre las tres pantallas de «Cómo funciona», quietas, una por toque. Después no vuelven solas.

## Palabras fijas

| Lugar | Texto |
| --- | --- |
| Propósito | La plata de la cosecha, a la vista. / Todos ven el mismo número y para qué se usa. |
| Total | Plata del grupo |
| Sacos | Para comprar los sacos de la cosecha. Si alguien pide, otra persona tiene que decir que lo vio. |
| Flete | Para pagar el camión. También lo confirma alguien que no pidió la plata. |
| Adelanto | Un préstamo para una sola persona. La próxima vez que pone plata, primero paga lo que debe. |
| Sin correo | Para poner plata, entrá con tu correo. Así sale de tu cuenta y el grupo ve tu nombre. |
| Sin Cavos | El ingreso con correo todavía no está activado en esta compu. |
| Sin nombre | Falta tu nombre, para que el grupo sepa quién sos. |
| Fondo cerrado | Falta abrir el fondo una sola vez. Ahí se dice quién puede pedir el adelanto. |
| Sin unirse | Falta un toque para unirte al grupo. |
| Confirmar poner | Van {n} USDC de tu cuenta a {categoría}. |
| Confirmar poner con deuda | Primero se pagan {cover} USDC de tu adelanto. {resto} |
| Confirmar pedir | Se apartan {n} USDC de {categoría}. La plata sale cuando otra persona diga que lo vio: {destino}. |
| Confirmar adelanto | Salen {n} USDC a tu cuenta. Quedás debiendo {n} USDC. |
| Libro vacío | Cuando alguien ponga o pida, queda escrito acá. |
| Carga | Leyendo la plata… |
| Fallo | No se pudo leer la plata. |
| Botón de fallo | Probar de nuevo |

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `app/src/encomun/flow.ts` | El paso que toca, la frase de cada categoría y el texto de confirmar. Puro, sin React. |
| `app/src/encomun/flow.test.ts` | Esas tres funciones. No entra al `tsc` de la app. |
| `app/src/encomun/pages/Categoria.tsx` | La tarjeta de una categoría: paso, poner, pedir, pedidos abiertos. |
| `app/src/encomun/pages/Libro.tsx` | Filas del libro. |
| `app/src/encomun/pages/Fondo.tsx` | Lee el contrato, elige la pestaña, firma, arma el marco de carga y de error. |
| `app/src/encomun/pages/Ajustes.tsx` | Los cuatro pasos, el color y cómo está hecha. |
| `app/src/encomun/EncomunApp.tsx` | Columna `.frame` y la intro de la primera visita. |
| `app/src/encomun/styles.module.css` | Columna, encabezado pegado, barra del mismo ancho, filas, pasos. |
| `app/tsconfig.app.json` | Excluir `src/**/*.test.ts`. |

No se tocan `contracts/fondos`, `environments.toml`, `chain.ts` ni `app-lib/clients`.

## Fuera de este plan

Pegar `PUBLIC_CAVOS_APP_ID` en `app/.env` y permitir el origen `http://127.0.0.1:5173` lo hace la persona. Sin ese id, Entrar no abre. La tarea 6 deja esa frase y no inventa el id.

---

### Task 1: El paso y las frases

**Files:**
- Create: `app/src/encomun/flow.ts`
- Create: `app/src/encomun/flow.test.ts`
- Modify: `app/tsconfig.app.json`

**Interfaces:**
- Consumes: nada de React.
- Produces:
  - `PasoId = "entrar" | "nombre" | "abrir" | "unirse" | "listo"`
  - `Paso = { id: PasoId; texto: string; accion: "entrar" | "ajustes" | "ninguna"; boton: string }`
  - `pasoActual(input: { address: string | undefined; cavosListo: boolean; nombre: string | undefined; abierta: boolean; esSocio: boolean }): Paso`
  - `historia(jar: "sacos" | "flete" | "adelanto"): string`
  - `textoDeConfirmacion(input: Confirmacion): string`
  - `Confirmacion` como en el código de abajo.

- [ ] **Step 1: Sacar el test del typecheck de la app**

En `app/tsconfig.app.json`, agregar `exclude` al lado de `include`:

```json
{
	"extends": "@theahaco/ts-config/typescript",
	"include": ["src", "reset.d.ts"],
	"exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `app/src/encomun/flow.test.ts`:

```ts
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { historia, pasoActual, textoDeConfirmacion } from "./flow.ts"

const cerrado = { abierta: false, esSocio: false }

describe("pasoActual", () => {
	it("sin cuenta y sin correo activado no ofrece botón", () => {
		const paso = pasoActual({
			address: undefined,
			cavosListo: false,
			nombre: undefined,
			...cerrado,
		})
		assert.equal(paso.id, "entrar")
		assert.equal(paso.accion, "ninguna")
		assert.match(paso.texto, /todavía no está activado/)
	})

	it("sin cuenta y con correo ofrece Entrar", () => {
		const paso = pasoActual({
			address: undefined,
			cavosListo: true,
			nombre: undefined,
			...cerrado,
		})
		assert.equal(paso.accion, "entrar")
		assert.equal(paso.boton, "Entrar")
	})

	it("con cuenta y sin nombre manda a Ajustes", () => {
		const paso = pasoActual({
			address: "GAAA",
			cavosListo: true,
			nombre: undefined,
			abierta: true,
			esSocio: true,
		})
		assert.equal(paso.id, "nombre")
		assert.equal(paso.accion, "ajustes")
		assert.equal(paso.boton, "Ir a Ajustes")
	})

	it("con nombre y fondo cerrado pide abrirlo", () => {
		const paso = pasoActual({
			address: "GAAA",
			cavosListo: true,
			nombre: "Elena",
			abierta: false,
			esSocio: false,
		})
		assert.equal(paso.id, "abrir")
	})

	it("con fondo abierto y sin unirse pide unirse", () => {
		const paso = pasoActual({
			address: "GAAA",
			cavosListo: true,
			nombre: "Elena",
			abierta: true,
			esSocio: false,
		})
		assert.equal(paso.id, "unirse")
	})

	it("listo cuando hay cuenta, nombre, fondo y socio", () => {
		const paso = pasoActual({
			address: "GAAA",
			cavosListo: true,
			nombre: "Elena",
			abierta: true,
			esSocio: true,
		})
		assert.equal(paso.id, "listo")
		assert.equal(paso.accion, "ninguna")
	})

	it("un nombre en blanco cuenta como sin nombre", () => {
		const paso = pasoActual({
			address: "GAAA",
			cavosListo: true,
			nombre: "   ",
			abierta: true,
			esSocio: true,
		})
		assert.equal(paso.id, "nombre")
	})
})

describe("historia", () => {
	it("nombra el uso y no nombra la red", () => {
		for (const jar of ["sacos", "flete", "adelanto"] as const) {
			const text = historia(jar)
			assert.doesNotMatch(text, /testnet|contrato|asiento|firmar/i)
		}
		assert.match(historia("sacos"), /sacos/)
		assert.match(historia("flete"), /camión/)
		assert.match(historia("adelanto"), /préstamo/)
	})
})

describe("textoDeConfirmacion", () => {
	it("poner sin deuda dice a dónde va", () => {
		assert.equal(
			textoDeConfirmacion({
				kind: "poner",
				amount: 8,
				jarLabel: "Sacos",
				cover: 0,
				rest: 8,
			}),
			"Van 8 USDC de tu cuenta a Sacos.",
		)
	})

	it("poner con deuda paga primero el adelanto", () => {
		assert.equal(
			textoDeConfirmacion({
				kind: "poner",
				amount: 8,
				jarLabel: "Sacos",
				cover: 8,
				rest: 0,
			}),
			"Primero se pagan 8 USDC de tu adelanto. Con esto se tapa la deuda.",
		)
	})

	it("poner con deuda y resto entra a la categoría", () => {
		assert.match(
			textoDeConfirmacion({
				kind: "poner",
				amount: 10,
				jarLabel: "Flete",
				cover: 4,
				rest: 6,
			}),
			/Primero se pagan 4 USDC de tu adelanto\. El resto entra a Flete\./,
		)
	})

	it("pedir no dice que la plata ya salió", () => {
		const text = textoDeConfirmacion({
			kind: "pedir",
			amount: 5,
			jarLabel: "Sacos",
			destino: "Sacos de yute",
			cover: 0,
			rest: 5,
		})
		assert.match(text, /Se apartan 5 USDC de Sacos/)
		assert.match(text, /Sacos de yute/)
		assert.doesNotMatch(text, /Firmar/)
	})

	it("adelanto dice la deuda", () => {
		assert.equal(
			textoDeConfirmacion({
				kind: "adelanto",
				amount: 20,
				jarLabel: "Adelanto",
				cover: 0,
				rest: 20,
			}),
			"Salen 20 USDC a tu cuenta. Quedás debiendo 20 USDC.",
		)
	})
})
```

- [ ] **Step 3: Correr el test y verlo fallar**

Run: `node --experimental-strip-types --test app/src/encomun/flow.test.ts`

Expected: FAIL porque `./flow.ts` no existe.

- [ ] **Step 4: Implementar `flow.ts`**

Crear `app/src/encomun/flow.ts`:

```ts
export type PasoId = "entrar" | "nombre" | "abrir" | "unirse" | "listo"

export type Paso = {
	id: PasoId
	texto: string
	accion: "entrar" | "ajustes" | "ninguna"
	boton: string
}

export function pasoActual(input: {
	address: string | undefined
	cavosListo: boolean
	nombre: string | undefined
	abierta: boolean
	esSocio: boolean
}): Paso {
	const nombre = input.nombre?.trim() ?? ""
	if (!input.address) {
		if (!input.cavosListo) {
			return {
				id: "entrar",
				texto: "El ingreso con correo todavía no está activado en esta compu.",
				accion: "ninguna",
				boton: "",
			}
		}
		return {
			id: "entrar",
			texto:
				"Para poner plata, entrá con tu correo. Así sale de tu cuenta y el grupo ve tu nombre.",
			accion: "entrar",
			boton: "Entrar",
		}
	}
	if (!nombre) {
		return {
			id: "nombre",
			texto: "Falta tu nombre, para que el grupo sepa quién sos.",
			accion: "ajustes",
			boton: "Ir a Ajustes",
		}
	}
	if (!input.abierta) {
		return {
			id: "abrir",
			texto: "Falta abrir el fondo una sola vez. Ahí se dice quién puede pedir el adelanto.",
			accion: "ajustes",
			boton: "Ir a Ajustes",
		}
	}
	if (!input.esSocio) {
		return {
			id: "unirse",
			texto: "Falta un toque para unirte al grupo.",
			accion: "ajustes",
			boton: "Ir a Ajustes",
		}
	}
	return { id: "listo", texto: "", accion: "ninguna", boton: "" }
}

export function historia(jar: "sacos" | "flete" | "adelanto"): string {
	switch (jar) {
		case "sacos":
			return "Para comprar los sacos de la cosecha. Si alguien pide, otra persona tiene que decir que lo vio."
		case "flete":
			return "Para pagar el camión. También lo confirma alguien que no pidió la plata."
		case "adelanto":
			return "Un préstamo para una sola persona. La próxima vez que pone plata, primero paga lo que debe."
		default: {
			const unknown: never = jar
			return unknown
		}
	}
}

export type Confirmacion = {
	kind: "poner" | "pedir" | "adelanto" | "ver" | "devolver"
	amount: number
	jarLabel: string
	destino?: string
	cover: number
	rest: number
	askerName?: string
}

export function textoDeConfirmacion(input: Confirmacion): string {
	switch (input.kind) {
		case "poner":
			if (input.cover > 0) {
				const resto =
					input.rest > 0
						? `El resto entra a ${input.jarLabel}.`
						: "Con esto se tapa la deuda."
				return `Primero se pagan ${input.cover} USDC de tu adelanto. ${resto}`
			}
			return `Van ${input.amount} USDC de tu cuenta a ${input.jarLabel}.`
		case "pedir":
			return `Se apartan ${input.amount} USDC de ${input.jarLabel}. La plata sale cuando otra persona diga que lo vio: ${input.destino ?? ""}.`
		case "adelanto":
			return `Salen ${input.amount} USDC a tu cuenta. Quedás debiendo ${input.amount} USDC.`
		case "ver":
			return `Van ${input.amount} USDC del fondo a ${input.askerName ?? "quien pidió"}. Confirmás que viste: ${input.destino ?? ""}.`
		case "devolver":
			return `Vuelven ${input.amount} USDC a ${input.jarLabel}. Nadie los recibió.`
		default: {
			const unknown: never = input.kind
			return unknown
		}
	}
}
```

- [ ] **Step 5: Correr el test y verlo pasar**

Run: `node --experimental-strip-types --test app/src/encomun/flow.test.ts`

Expected: todos los `it` en PASS. Si Node rechaza el flag, usar `node --experimental-transform-types --test app/src/encomun/flow.test.ts`. No instalar un runner nuevo.

---

### Task 2: La columna de la app

**Files:**
- Modify: `app/src/encomun/styles.module.css`
- Modify: `app/src/encomun/EncomunApp.tsx`

**Interfaces:**
- Consumes: `styles.shell`, `styles.header`, `styles.main`, `styles.tabbar`.
- Produces: clase `styles.frame`. El encabezado y la barra miden lo mismo que `.frame`.

- [ ] **Step 1: Envolver encabezado y contenido**

En `app/src/encomun/EncomunApp.tsx`, el return queda así. `intro` sigue en `useState(false)` hasta la tarea 7.

```tsx
return (
	<div className={styles.shell} data-theme={theme} data-motion={motion}>
		{intro && <Intro onDone={closeIntro} />}
		<div className={styles.frame}>
			<header className={styles.header}>
				<div className={styles.logo}>
					EnComún
					<span>Fondo de la cosecha</span>
				</div>
				<div className={styles.headerTools}>
					<WalletButton />
					<button type="button" className={styles.explain} onClick={() => setIntro(true)}>
						Cómo funciona
					</button>
				</div>
			</header>
			<main className={styles.main}>
				<Routes>
					<Route path="*" element={<Fondo />} />
				</Routes>
			</main>
		</div>
	</div>
)
```

- [ ] **Step 2: El escritorio y la columna**

Al inicio de `app/src/encomun/styles.module.css`, después del bloque `.shell`, agregar `.frame` y cambiar `.header` y `.main`. No cambiar los colores de `.toneSacos`, `.toneFlete`, `.toneAdelanto`, `.toneLibro` ni `.total`.

Reemplazar el bloque `.header` completo por:

```css
.frame {
	width: min(440px, 100%);
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: var(--bg);
	box-shadow: 0 0 0 2px #1a140c;
}

.header {
	position: sticky;
	top: 0;
	z-index: 5;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 1rem;
	width: 100%;
	margin: 0;
	padding: 0.85rem 1rem;
	background: var(--bg);
	color: var(--ink);
	border-radius: 0;
	border-bottom: 2px solid #1a140c;
	box-shadow: none;
}
```

Reemplazar el bloque `.main` completo por:

```css
.main {
	width: 100%;
	margin: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0;
	padding: 1rem 1rem 6rem;
}
```

En `.shell`, agregar `display` si no está, y el fondo de afuera. El `.shell` ya tiene `display: flex; flex-direction: column`. Cambiarlo a:

```css
.shell {
	/* el resto de variables y tipografía queda igual */
	min-height: 100vh;
	display: flex;
	flex-direction: row;
	justify-content: center;
	background: #d9d1c4;
	color: var(--ink);
	font-family: var(--sans);
	font-size: 1.05rem;
	line-height: 1.4;
}
```

Conservar las variables `--ink`, `--muted`, `--line`, `--bg`, `--paper`, `--card`, `--green`, `--shadow`, `--inset`, `--sans`, `--mono` y `padding-bottom: 5.6rem` dentro de `.shell`. El fondo `#d9d1c4` pisa el `background: var(--bg)` anterior a propósito: el papel de afuera es más oscuro que la columna.

- [ ] **Step 3: La barra del mismo ancho**

Reemplazar el bloque `.tabbar` por:

```css
.tabbar {
	position: fixed;
	left: 50%;
	right: auto;
	bottom: 0;
	z-index: 15;
	transform: translateX(-50%);
	width: min(440px, 100%);
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 0.35rem;
	padding: 0.45rem 0.5rem calc(0.45rem + env(safe-area-inset-bottom));
	background: #efeae2;
	border-top: 2px solid #1a140c;
}
```

Agregar al final del archivo, después de las reglas de `data-theme="noche"` que ya existen:

```css
.shell[data-theme="noche"] {
	background: #0e0e0e;
}

.shell[data-theme="noche"] .frame {
	box-shadow: 0 0 0 2px #f4efe6;
}

.shell[data-theme="campo"] {
	background: #c5d7c4;
}
```

- [ ] **Step 4: Ver la columna**

Con Vite en `http://127.0.0.1:5173/`, la barra de Sacos–Ajustes tiene el mismo ancho que el encabezado EnComún. A los costados se ve el papel `#d9d1c4`. En un viewport de 390px de ancho, la columna ocupa todo y no hay margen lateral.

Run: `npx tsc -p app --noEmit`

Expected: exit 0.

---

### Task 3: La pantalla no desaparece al cargar

**Files:**
- Modify: `app/src/encomun/pages/Fondo.tsx`
- Modify: `app/src/encomun/styles.module.css`

**Interfaces:**
- Consumes: `pasoActual`, `historia`, `textoDeConfirmacion` de `../flow`. `leerFondo` de `../chain`. `Tab`, `TABS`, `tabLabel`, `toneOf` que ya están en `Fondo.tsx`.
- Produces: el cuerpo de carga y de error incluye la barra. `ready` pasa a ser `paso.id === "listo"`.

- [ ] **Step 1: Sacar el return temprano**

En `Fondo.tsx`, borrar estas dos líneas:

```tsx
if (fondo.isLoading) return <p>Cargando el fondo…</p>
if (!fondo.data) return <p>No se pudo leer el fondo en testnet.</p>
```

Justo después de los `useState`, calcular un fondo vacío para pintar mientras carga:

```tsx
const vacio = {
	abierta: false,
	sacos: 0,
	flete: 0,
	adelanto: 0,
	saldo: 0,
	apartado: 0,
	asiento: "",
	tesorera: "",
	deuda: 0,
	esSocio: false,
}
```

Donde hoy se destruye `fondo.data`, usar:

```tsx
const chain = fondo.data?.chain ?? vacio
const people = fondo.data?.people ?? []
const openLines = fondo.data?.lines ?? []
const notes = fondo.data?.notes ?? []
```

Borrar `const { chain, people, lines: openLines, notes } = fondo.data`.

- [ ] **Step 2: El paso manda, no el booleano suelto**

Importar arriba:

```tsx
import { historia, pasoActual, textoDeConfirmacion } from "../flow"
```

Borrar la función `jarHelp` de este archivo.

Reemplazar `const ready = Boolean(address && chain.abierta && chain.esSocio)` por:

```tsx
const paso = pasoActual({
	address,
	cavosListo: Boolean(cavos),
	nombre: myName,
	abierta: chain.abierta,
	esSocio: chain.esSocio,
})
const listo = paso.id === "listo" && !fondo.isLoading && Boolean(fondo.data)
```

`myName` tiene que calcularse antes de `paso`. Ya sale de `nameOf(people, address)`.

En `signCopy`, reemplazar el `switch` por una llamada. `cover` y `rest` siguen calculándose arriba:

```tsx
function signCopy(item: Pending) {
	switch (item.kind) {
		case "poner":
			return textoDeConfirmacion({
				kind: "poner",
				amount: item.amount,
				jarLabel: jarLabel(item.jar),
				cover,
				rest,
			})
		case "pedir":
			return textoDeConfirmacion({
				kind: "pedir",
				amount: item.amount,
				jarLabel: jarLabel(item.jar),
				destino: item.destino,
				cover: 0,
				rest: item.amount,
			})
		case "adelanto":
			return textoDeConfirmacion({
				kind: "adelanto",
				amount: item.amount,
				jarLabel: "Adelanto",
				cover: 0,
				rest: item.amount,
			})
		case "ver":
			return item.text
		case "devolver":
			return textoDeConfirmacion({
				kind: "devolver",
				amount: item.amount,
				jarLabel: jarLabel(item.jar),
				cover: 0,
				rest: item.amount,
			})
		default: {
			const unknown: never = item
			return unknown
		}
	}
}
```

Al armar el pendiente de «Yo lo vi», el `text` usa `textoDeConfirmacion` con `kind: "ver"`, `askerName` y `destino: line.destino`. Borrar la frase que empieza con «Van ${line.amount} USDC del fondo».

- [ ] **Step 3: Carga y error dentro del mismo stack**

El return de `Fondo` siempre incluye `styles.stack`, el propósito, el total y el `nav`. Entre el total y el `nav`:

```tsx
{fondo.isLoading ? (
	<p className={styles.status}>Leyendo la plata…</p>
) : fondo.isError || !fondo.data ? (
	<div className={styles.sign}>
		<p>No se pudo leer la plata.</p>
		<button
			className={styles.primary}
			type="button"
			onClick={() => void fondo.refetch()}
		>
			Probar de nuevo
		</button>
	</div>
) : tab === "ajustes" ? (
	<Ajustes />
) : tab === "libro" ? (
	<section className={`${styles.block} ${styles.toneLibro}`}>
		<h1>Libro</h1>
		<p>Acá queda escrito quién puso plata y quién la pidió.</p>
		{notes.length === 0 ? <p>Cuando alguien ponga o pida, queda escrito acá.</p> : null}
		{notes.map((note) => (
			<p key={note.id} className={styles.move}>
				{note.note}
			</p>
		))}
	</section>
) : (
	/* la sección de categoría que ya existe, con los cambios del step 4 */
	null
)}
```

La sección de categoría que ya existe se deja en ese `null` en el step 4. No dejar el `null` al cerrar la tarea: el step 4 lo reemplaza.

Agregar en el CSS:

```css
.status {
	margin: 0;
	font-weight: 700;
}
```

- [ ] **Step 4: Una sola tarjeta de paso en la categoría**

Dentro de la sección de categoría, la ayuda usa `historia(tab)` en lugar de `jarHelp(tab)`.

Reemplazar el bloque `{!ready && ( ... )}` por:

```tsx
{!listo && !fondo.isLoading && fondo.data ? (
	<div className={styles.sign}>
		<p>{paso.texto}</p>
		{paso.accion === "ninguna" ? null : (
			<button
				className={styles.primary}
				type="button"
				onClick={() => {
					if (paso.accion === "entrar") cavos?.signIn()
					if (paso.accion === "ajustes") setTab("ajustes")
				}}
			>
				{paso.boton}
			</button>
		)}
	</div>
) : null}
```

El formulario de Poner y Pedir se muestra solo con `listo && !pending`, no con `ready`. El botón Firmar de la tarjeta de confirmación pasa a decir `Confirmar`. Borrar el párrafo «Cuenta ${shortAddress(address)}» de esa tarjeta. Si no hay `address` en esa tarjeta, no mostrar un segundo Entrar: sin `listo` esa tarjeta no se abre.

`disabled={run.isPending || !ready}` pasa a `disabled={run.isPending || !listo}`.

- [ ] **Step 5: Chequear**

Run: `npx tsc -p app --noEmit`

Expected: exit 0. En el navegador, recargar `http://127.0.0.1:5173/`. Durante la carga se ven EnComún, la franja verde y las cinco pestañas. No aparece la palabra testnet.

---

### Task 4: Poner y Pedir, de a uno

**Files:**
- Create: `app/src/encomun/pages/Categoria.tsx`
- Modify: `app/src/encomun/pages/Fondo.tsx`
- Modify: `app/src/encomun/styles.module.css`

**Interfaces:**
- Consumes: `historia` y `Paso` de `../flow`. `ChainLine`, `JarName`, `jarLabel` de `../api`. `styles` de `../styles.module.css`.
- Produces: `export function Categoria(props: CategoriaProps)`. `Fondo` le pasa los datos y las funciones de firmar. `Categoria` no importa `chain.ts` ni `useWallet`.

`CategoriaProps`:

```ts
type CategoriaProps = {
	jar: JarName
	jarAmount: number
	deuda: number
	nombres: string[]
	seatName: string
	soyAsiento: boolean
	paso: Paso
	listo: boolean
	lines: ChainLine[]
	nombreDe: (address: string) => string
	puedeVer: (asker: string) => boolean
	error: string
	busy: boolean
	pendingText: string | null
	onAccion: (accion: "entrar" | "ajustes") => void
	onConfirm: () => void
	onCancel: () => void
	onPoner: (amount: number) => void
	onPedir: (amount: number, destino: string) => void
	onAdelanto: (amount: number) => void
	onVer: (line: ChainLine) => void
	onDevolver: (line: ChainLine) => void
	esQuienPidio: (asker: string) => boolean
}
```

`puedeVer` es verdadero solo si hay cuenta, no es quien pidió y no es quien abrió el fondo. `esQuienPidio` es verdadero si esa cuenta es la que pidió. Quien abrió el fondo y no pidió ve la frase «Otra persona tiene que confirmarlo.»

- [ ] **Step 1: Crear la tarjeta**

Crear `app/src/encomun/pages/Categoria.tsx` con imports arriba del archivo:

```tsx
import { useState } from "react"
import { jarLabel, type ChainLine, type JarName } from "../api"
import { historia, type Paso } from "../flow"
import styles from "../styles.module.css"

const PRESETS = [5, 8, 10, 20]

type Modo = "elegir" | "poner" | "pedir"
```

El componente:

```tsx
export function Categoria(props: CategoriaProps) {
	const [modo, setModo] = useState<Modo>("elegir")
	const [texto, setTexto] = useState("8")
	const [destino, setDestino] = useState("")
	const monto = Number(texto)
	const montoOk = Number.isInteger(monto) && monto >= 1 && monto <= 200
	const destinoOk = destino.trim().length >= 8
	const puedePedir = props.jar !== "adelanto" || props.soyAsiento

	return (
		<section className={`${styles.block} ${toneClass(props.jar)}`}>
			<h1>{jarLabel(props.jar)}</h1>
			<p className={styles.amount}>
				{props.jarAmount} USDC
				{props.jarAmount === 0 ? <span>Todavía en cero.</span> : null}
			</p>
			<p>{historia(props.jar)}</p>
			{props.nombres.length > 0 ? <p>En el grupo: {props.nombres.join(", ")}.</p> : null}
			{props.deuda > 0 ? (
				<p>Debés {props.deuda} USDC. Lo próximo que pongas paga eso primero.</p>
			) : null}
			{props.error ? <p className={styles.note}>{props.error}</p> : null}

			{props.pendingText ? (
				<div className={styles.sign}>
					<p>{props.pendingText}</p>
					<button
						className={styles.primary}
						type="button"
						disabled={props.busy}
						onClick={props.onConfirm}
					>
						Confirmar
					</button>
					<button type="button" onClick={props.onCancel}>
						Volver
					</button>
				</div>
			) : null}

			{!props.listo && !props.pendingText ? (
				<div className={styles.sign}>
					<p>{props.paso.texto}</p>
					{props.paso.accion === "ninguna" ? null : (
						<button
							className={styles.primary}
							type="button"
							onClick={() => props.onAccion(props.paso.accion as "entrar" | "ajustes")}
						>
							{props.paso.boton}
						</button>
					)}
				</div>
			) : null}

			{props.listo && !props.pendingText && modo === "elegir" ? (
				<div className={styles.actions}>
					<button className={styles.primary} type="button" onClick={() => setModo("poner")}>
						Poner plata
					</button>
					{puedePedir ? (
						<button type="button" onClick={() => setModo("pedir")}>
							Pedir plata
						</button>
					) : (
						<p>Esta plata la pide solo {props.seatName}.</p>
					)}
				</div>
			) : null}

			{props.listo && !props.pendingText && modo !== "elegir" ? (
				<div className={styles.sign}>
					<h2>{modo === "poner" ? "Poner plata" : "Pedir plata"}</h2>
					<div className={styles.chips}>
						{PRESETS.map((n) => (
							<button
								key={n}
								type="button"
								className={monto === n ? styles.on : undefined}
								onClick={() => setTexto(String(n))}
							>
								{n} USDC
							</button>
						))}
					</div>
					<label>
						Otro monto
						<input
							inputMode="numeric"
							value={texto}
							onChange={(event) => setTexto(event.target.value.replace(/[^\d]/g, ""))}
						/>
					</label>
					{!montoOk ? <p>Entre 1 y 200 USDC.</p> : null}
					{modo === "pedir" && props.jar !== "adelanto" ? (
						<label>
							Para qué es
							<input
								value={destino}
								placeholder="Sacos de yute para la entrega"
								onChange={(event) => setDestino(event.target.value)}
							/>
						</label>
					) : null}
					<button
						className={styles.primary}
						type="button"
						disabled={!montoOk || (modo === "pedir" && props.jar !== "adelanto" && !destinoOk)}
						onClick={() => {
							if (modo === "poner") props.onPoner(monto)
							else if (props.jar === "adelanto") props.onAdelanto(monto)
							else props.onPedir(monto, destino.trim())
						}}
					>
						Seguir
					</button>
					<button type="button" onClick={() => setModo("elegir")}>
						Volver
					</button>
				</div>
			) : null}

			{props.lines.length > 0 ? <h2>Pedidos abiertos</h2> : null}
			{props.lines.map((line) => {
				const quien = props.nombreDe(line.asker)
				return (
					<div key={line.id} className={styles.hint}>
						<p>
							{quien} pidió {line.amount} USDC para: {line.destino}
						</p>
						{props.puedeVer(line.asker) ? (
							<button className={styles.primary} type="button" onClick={() => props.onVer(line)}>
								Yo lo vi
							</button>
						) : props.esQuienPidio(line.asker) ? (
							<button type="button" onClick={() => props.onDevolver(line)}>
								Cancelar este pedido
							</button>
						) : (
							<p>Otra persona tiene que confirmarlo.</p>
						)}
					</div>
				)
			})}
		</section>
	)
}

function toneClass(jar: JarName) {
	switch (jar) {
		case "sacos":
			return styles.toneSacos
		case "flete":
			return styles.toneFlete
		case "adelanto":
			return styles.toneAdelanto
		default: {
			const unknown: never = jar
			return unknown
		}
	}
}
```

- [ ] **Step 2: Fondo solo arma los datos**

En la rama de categoría de `Fondo.tsx`, reemplazar el `<section className={tone}>...</section>` por:

```tsx
<Categoria
	jar={tab}
	jarAmount={jarAmount}
	deuda={chain.deuda}
	nombres={people.map((person) => person.name)}
	seatName={seatName || "una sola persona"}
	soyAsiento={Boolean(address) && address === chain.asiento}
	paso={paso}
	listo={listo}
	lines={lines}
	nombreDe={(who) => nameOf(people, who) ?? shortAddress(who)}
	puedeVer={(asker) => Boolean(address) && asker !== address && address !== chain.tesorera}
	esQuienPidio={(asker) => asker === address}
	error={error}
	busy={run.isPending}
	pendingText={pending ? signCopy(pending) : null}
	onAccion={(accion) => {
		if (accion === "entrar") cavos?.signIn()
		if (accion === "ajustes") setTab("ajustes")
	}}
	onConfirm={() => {
		if (pending) void firmar(pending)
	}}
	onCancel={() => setPending(null)}
	onPoner={(amount) => setPending({ kind: "poner", jar: tab, amount })}
	onPedir={(amount, destino) => {
		if (tab === "adelanto") return
		setPending({ kind: "pedir", jar: tab, amount, destino })
	}}
	onAdelanto={(amount) => setPending({ kind: "adelanto", amount })}
	onVer={(line) =>
		setPending({
			kind: "ver",
			id: line.id,
			text: textoDeConfirmacion({
				kind: "ver",
				amount: line.amount,
				jarLabel: jarLabel(tab === "flete" ? "flete" : "sacos"),
				destino: line.destino,
				cover: 0,
				rest: line.amount,
				askerName: nameOf(people, line.asker) ?? shortAddress(line.asker),
			}),
		})
	}
	onDevolver={(line) =>
		setPending({
			kind: "devolver",
			id: line.id,
			jar: line.jar,
			amount: line.amount,
		})
	}
/>
```

`tab` en esa rama es `JarName` porque Libro y Ajustes ya salieron por otras ramas. TypeScript lo estrecha si el ternario está escrito `tab === "ajustes" ? ... : tab === "libro" ? ... : <Categoria jar={tab} .../>`.

Borrar de `Fondo.tsx` el estado `amount`, `destino`, `PRESETS`, y el JSX viejo de chips, Poner y Pedir. El estado `pending` se queda.

Importar `Categoria` arriba:

```tsx
import { Categoria } from "./Categoria"
```

- [ ] **Step 3: El chip elegido se lee**

`.shell .toneSacos button.on` ya pinta el chip elegido de negro. No hace falta otra regla. Agregar solo si el input de «Otro monto» queda sin ancho:

```css
.sign label {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
	margin: 0.4rem 0 0.7rem;
	font-weight: 700;
}

.sign input {
	min-height: 2.75rem;
	padding: 0.4rem 0.7rem;
	border-radius: 12px;
	font: inherit;
}
```

- [ ] **Step 4: Chequear**

Run: `npx tsc -p app --noEmit`

Expected: exit 0.

En el navegador, Sacos en cero muestra la frase de los sacos y una sola tarjeta blanca. No muestra los dos formularios. No muestra la palabra Firmar.

---

### Task 5: El libro en filas

**Files:**
- Create: `app/src/encomun/pages/Libro.tsx`
- Modify: `app/src/encomun/pages/Fondo.tsx`
- Modify: `app/src/encomun/styles.module.css`

**Interfaces:**
- Consumes: `Note` de `../api`.
- Produces: `export function Libro({ notes }: { notes: Note[] })` y `export function cuando(iso: string): string`.

- [ ] **Step 1: La lista**

Crear `app/src/encomun/pages/Libro.tsx`:

```tsx
import type { Note } from "../api"
import styles from "../styles.module.css"

export function cuando(iso: string): string {
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ""
	return date.toLocaleString("es-CR", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function Libro({ notes }: { notes: Note[] }) {
	return (
		<section className={`${styles.block} ${styles.toneLibro}`}>
			<h1>Libro</h1>
			<p>Acá queda escrito quién puso plata y quién la pidió.</p>
			{notes.length === 0 ? (
				<p>Cuando alguien ponga o pida, queda escrito acá.</p>
			) : (
				<ul className={styles.rows}>
					{notes.map((note) => (
						<li key={note.id}>
							<p>{note.note}</p>
							{cuando(note.created_at) ? <time>{cuando(note.created_at)}</time> : null}
						</li>
					))}
				</ul>
			)}
		</section>
	)
}
```

- [ ] **Step 2: Usarla desde Fondo**

Reemplazar la `<section>` de libro en `Fondo.tsx` por `<Libro notes={notes} />`. Importar `Libro` arriba. Borrar el import de tipos que ya no use ese archivo.

- [ ] **Step 3: Filas con borde**

```css
.rows {
	list-style: none;
	margin: 0.8rem 0 0;
	padding: 0;
}

.rows li {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	padding: 0.7rem 0;
	border-top: 2px solid #1a140c;
}

.rows p {
	margin: 0;
	font-weight: 700;
}

.rows time {
	font-size: 0.85rem;
}
```

- [ ] **Step 4: Chequear**

Run: `npx tsc -p app --noEmit`

Expected: exit 0. La pestaña Libro, vacía, dice «Cuando alguien ponga o pida, queda escrito acá.»

---

### Task 6: Ajustes en cuatro pasos

**Files:**
- Modify: `app/src/encomun/pages/Ajustes.tsx`
- Modify: `app/src/encomun/styles.module.css`

**Interfaces:**
- Consumes: `fundAccount`, `addUsdcTrustline`, `swapXlmForUsdc`, `nombres.guardar`, `abrirFondo`, `unirse`, `leerFondo`, `usePrefs`, `setTheme`, `setMotion`.
- Produces: la misma exportación `Ajustes`. No cambia la firma.

El orden de los pasos es fijo:

1. Entrar.
2. Tu nombre.
3. Plata de prueba.
4. Entrar al grupo.

Solo el primer paso incompleto tiene el botón habilitado. Los siguientes se ven con el botón deshabilitado.

- [ ] **Step 1: Un solo botón para la plata de prueba**

Dentro de `Ajustes`, agregar esta función al lado de `act`. Usa `xlm` y `usdc` del render, que es lo que ya se ve en pantalla. No dejar los tres botones sueltos (Cargar XLM, Habilitar USDC, Cambiar 100 XLM).

```tsx
async function prepararPlata() {
	if (!address) return
	setBusy("plata")
	setNote("Cargando plata de prueba…")
	try {
		if (!xlm) {
			const result = await fundAccount(address)
			if (!result.ok) throw new Error(result.message)
		}
		if (usdc === undefined) {
			setNote("Habilitando los dólares del fondo…")
			await addUsdcTrustline(address, signTransaction)
		}
		setNote("Cambiando a dólares del fondo…")
		await swapXlmForUsdc(address, signTransaction, "100")
		await updateBalances()
		setNote("Listo. Ya tenés dólares de prueba.")
	} catch (err) {
		setNote(errorMessage(err))
	} finally {
		setBusy("")
	}
}
```

Si `usdc` ya existía, igual corre el cambio de 100 XLM una sola vez por toque. El botón de ese paso se esconde cuando `usdc` está definido y `Number(usdc) > 0`, y el texto pasa a `Listo. Tenés dólares de prueba.`

- [ ] **Step 2: Reemplazar el bloque Cuenta**

Borrar desde `<h2>Cuenta</h2>` hasta el cierre del condicional de `chain?.esSocio`, inclusive. Poner esto. `pasoNumero` es 1 si no hay `address`, 2 si no hay nombre guardado en esta sesión, 3 si no hay USDC, 4 si falta abrir o unirse, 5 si ya está.

El nombre guardado no vuelve del servidor al abrir Ajustes. Pedir la lista:

```tsx
const gente = useQuery({
	queryKey: ["nombres"],
	queryFn: () => nombres.lista(),
})
const mio = address ? gente.data?.find((person) => person.address === address) : undefined
```

Importar `useQuery` ya está. `nombres` ya está importado.

```tsx
const tieneNombre = Boolean(mio?.name.trim())
const tieneUsdc = usdc !== undefined && Number(usdc) > 0
const pasoNumero = !address ? 1 : !tieneNombre ? 2 : !tieneUsdc ? 3 : !chain?.abierta || !chain.esSocio ? 4 : 5

function abierto(n: number) {
	return pasoNumero === n && busy === ""
}
```

El JSX de los pasos:

```tsx
<h2>Para usar el fondo</h2>
<ol className={styles.steps}>
	<li>
		<strong>1. Entrar</strong>
		<p>Con tu correo, para que la plata salga de tu cuenta.</p>
		{address ? (
			<p>Listo{cavos?.email ? `, ${cavos.email}` : ""}.</p>
		) : (
			<>
				<button
					type="button"
					className={styles.primary}
					disabled={!abierto(1) || !cavos}
					onClick={() => cavos?.signIn()}
				>
					Entrar
				</button>
				{!cavos ? <p>El ingreso con correo todavía no está activado en esta compu.</p> : null}
			</>
		)}
	</li>
	<li>
		<strong>2. Tu nombre</strong>
		<p>El grupo tiene que ver quién sos.</p>
		{tieneNombre ? (
			<p>Listo, {mio?.name}{mio?.place ? ` · ${mio.place}` : ""}.</p>
		) : (
			<>
				<label>
					Nombre
					<input value={name} onChange={(event) => setName(event.target.value)} />
				</label>
				<label>
					Lugar
					<input value={place} onChange={(event) => setPlace(event.target.value)} />
				</label>
				<button
					type="button"
					className={styles.primary}
					disabled={!abierto(2) || name.trim().length < 2}
					onClick={() =>
						void act("Nombre guardado", () => nombres.guardar(address!, name.trim(), place.trim()))
					}
				>
					Guardar mi nombre
				</button>
			</>
		)}
	</li>
	<li>
		<strong>3. Plata de prueba</strong>
		<p>Dólares de prueba para el fondo. Lo otro solo paga la red.</p>
		{tieneUsdc ? (
			<p>Listo. Ya tenés dólares de prueba.</p>
		) : (
			<button
				type="button"
				className={styles.primary}
				disabled={!abierto(3)}
				onClick={() => void prepararPlata()}
			>
				Cargar plata de prueba
			</button>
		)}
	</li>
	<li>
		<strong>4. Entrar al grupo</strong>
		{chain?.esSocio ? (
			<p>Ya estás. Volvé a Sacos.</p>
		) : chain && !chain.abierta ? (
			<>
				<p>Se hace una sola vez. Decí quién puede pedir el adelanto.</p>
				<label>
					Quién puede pedir el adelanto
					<input
						value={asiento}
						onChange={(event) => setAsiento(event.target.value.trim())}
					/>
				</label>
				<button type="button" disabled={!abierto(4)} onClick={() => setAsiento(address ?? "")}>
					Soy yo
				</button>
				<button
					type="button"
					className={styles.primary}
					disabled={!abierto(4) || !asiento.startsWith("G") || asiento.length !== 56}
					onClick={() =>
						void act("Fondo abierto", () => abrirFondo(address!, signTransaction, asiento))
					}
				>
					Abrir el fondo
				</button>
			</>
		) : (
			<button
				type="button"
				className={styles.primary}
				disabled={!abierto(4)}
				onClick={() => void act("Ya estás en el fondo", () => unirse(address!, signTransaction))}
			>
				Unirme
			</button>
		)}
	</li>
</ol>
```

Después de guardar el nombre, invalidar también `["nombres"]` dentro de `act`, junto al `invalidateQueries` de `fondos` que ya existe.

Tema, Movimiento y Cómo está hecha se quedan debajo de la lista. Envolver la lista de «Cómo está hecha» en:

```tsx
<details className={styles.facts}>
	<summary>Cómo está hecha</summary>
	<ul>
		<li>La pantalla es esta app. La plata queda en Stellar, en la red de prueba.</li>
		<li>Se entra con correo o Google. Esa cuenta es la que pone la plata.</li>
		<li>Los nombres no van a la red. Solo la cuenta.</li>
		<li>El USDC es la plata del grupo. El XLM solo paga la red.</li>
	</ul>
</details>
```

Borrar el `<h2>Cómo está hecha</h2>` suelto para que no quede duplicado. El `<p className={styles.hint}>` de las reglas se queda dentro del `details`, después del `ul`.

- [ ] **Step 3: CSS de la lista**

```css
.steps {
	margin: 0.4rem 0 1rem;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
}

.steps li {
	padding: 0.8rem 0.9rem;
	border: 2px solid #1a140c;
	border-radius: 16px;
	background: #fffdf8;
}

.steps strong {
	display: block;
	margin-bottom: 0.25rem;
}

.facts summary {
	cursor: pointer;
	font-weight: 700;
	font-size: 1.2rem;
	margin: 0.8rem 0 0.4rem;
}
```

Quitar `list-style` previo de `.facts` si choca con el `summary`. `.facts` hoy es la `ul`. Pasar el borde y el padding de `.facts` a `.facts ul` si el `ul` queda pegado al borde de la tarjeta.

- [ ] **Step 4: Chequear**

Run: `npx tsc -p app --noEmit`

Expected: exit 0.

En Ajustes se leen los cuatro pasos. Con el correo sin activar, el único botón usable de la lista no existe: Entrar está deshabilitado y la frase de «esta compu» está en el paso 1. No hay tres botones de XLM, trustline y swap. «Cómo está hecha» está cerrado.

---

### Task 7: La primera visita

**Files:**
- Modify: `app/src/encomun/EncomunApp.tsx`

**Interfaces:**
- Consumes: `Intro`, `INTRO_KEY = "encomun-intro"`.
- Produces: la intro se abre sola solo si esa clave no es `"visto"`.

- [ ] **Step 1: Leer la clave**

Reemplazar `const [intro, setIntro] = useState(false)` por:

```tsx
const [intro, setIntro] = useState(() => {
	try {
		return localStorage.getItem(INTRO_KEY) !== "visto"
	} catch {
		return false
	}
})
```

`closeIntro` ya escribe `"visto"`. No agregar temporizador ni animación. El botón Cómo funciona sigue abriendo la intro aunque ya esté vista, sin borrar la clave.

- [ ] **Step 2: Chequear en el navegador**

Borrar la clave `encomun-intro` en la consola de la página y recargar. Aparece «Una sola plata, a la vista.» con Siguiente. Tres toques y vuelve a Sacos. Recargar: no vuelve sola.

Run: `npx tsc -p app --noEmit`

Expected: exit 0.

---

### Task 8: Recorrido de una persona

**Files:** ninguno. Esta tarea no cambia código. Si un paso falla, se arregla en el archivo de la tarea que lo pintó y se vuelve a recorrer.

- [ ] **Step 1: Escritorio**

Abrir `http://127.0.0.1:5173/` en una ventana ancha.

- El encabezado, la tarjeta y la barra tienen el mismo ancho.
- A los costados hay papel más oscuro.
- Sacos dice para qué es la plata y que todavía está en cero.
- No están las palabras prohibidas de Global Constraints.
- No hay animación al aparecer.

- [ ] **Step 2: Teléfono**

Viewport de 390 de ancho.

- La columna ocupa el ancho.
- La barra no se corta ni se sale.
- Cómo funciona se puede tocar.

- [ ] **Step 3: Las cinco pestañas**

- Flete habla del camión.
- Adelanto habla del préstamo.
- Libro, vacío, dice la frase de «cuando alguien ponga o pida».
- Ajustes muestra los cuatro pasos, el tema y el movimiento. Cómo está hecha abre y cierra.
- Volver a Sacos deja la franja verde.

- [ ] **Step 4: Tema y movimiento**

- Campo y Noche cambian el papel y se puede leer el texto negro sobre la tarjeta de color.
- Volver a Cosecha antes de terminar.
- Quieto quita el movimiento al pasar el mouse. «Se mueve al tocar» lo devuelve. No hay animación al cargar.

- [ ] **Step 5: Lo que no se puede fingir**

Sin `PUBLIC_CAVOS_APP_ID` no se firma. No decir que la plata se movió. El paso 1 de Ajustes dice que el ingreso con correo no está activado.

Cuando esa persona pegue el id y reinicie Vite, el recorrido que sí se firma es este, con dos cuentas:

1. Cuenta A entra, guarda nombre y lugar, carga plata de prueba, abre el fondo con «Soy yo», se une si el paso 4 todavía lo pide, y en Sacos pone 8 USDC. El número de Sacos pasa a 8 y el verde también.
2. La misma cuenta pide 5 USDC con el texto «Sacos de yute para la entrega». Sacos baja a 3. Aparece el pedido. Esa cuenta ve «Cancelar este pedido», no «Yo lo vi».
3. Cuenta B entra, guarda su nombre, se une y en Sacos toca «Yo lo vi». Recién ahí los 5 USDC salen hacia la cuenta A.
4. Libro muestra las dos frases, con fecha.

Una sola cuenta no puede confirmar su propio pedido. Eso es la regla, no un bug.

## Self-review

- Columna, carga, paso único, poner/pedir de a uno, libro, ajustes, primera visita y recorrido tienen tarea.
- El contrato, el cliente generado y mainnet no entran.
- `pasoActual`, `historia`, `textoDeConfirmacion`, `Categoria`, `Libro` y `cuando` se crean antes de usarse.
- «Firmar», «testnet» y «asiento» salen de Sacos, Flete, Adelanto y Libro.
- El nombre vacío no cuenta como listo. Sin nombre no se abre el formulario de plata.
