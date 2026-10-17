# EnComún en testnet de verdad

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El número de Sacos, Flete y Adelanto es el USDC que el contrato tiene en testnet, y la pantalla muestra una sola categoría mientras las demás y Ajustes viven en la barra de abajo.

**Architecture:** `fondos` custodia el USDC y aplica la regla (asiento, deuda, testigo). La mesa SQLite solo guarda el nombre de cada wallet. La app lee el saldo con el cliente generado y escribe solo con `useWallet().signTransaction`. Trustless Work no entra: sus roles no permiten «lo confirma alguien que no pidió y que no es la tesorera».

**Tech Stack:** Soroban SDK 26, Scaffold Stellar v1 (`environments.toml`), React 19, CSS Modules, USDC SAC de testnet `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` (7 decimales: 1 USDC = `10_000_000`).

## Global Constraints

- Testnet únicamente. La sección de mainnet al final no se ejecuta.
- Texto de la app y comentarios `///` de los errores del contrato, en español.
- Nombres de personas solo en SQLite. En el contrato solo hay `Address`.
- Toda firma pasa por `useWallet().signTransaction`. No importar Stellar Wallets Kit ni Cavos en `app/src/encomun/`.
- No editar `app-lib/clients/*`.
- No pedir, imprimir ni commitear llaves `S…` ni seeds. `app/.env` no se commitea.
- XLM solo paga la red. La plata del fondo es USDC.
- Montos de la UI en USDC enteros, de 1 a 200. El contrato habla en stroops.
- Sin animación al cargar. Solo hover y presión.
- La entrada de la app sigue siendo `EncomunApp`. No montar DeFiesta ni `app/src/market`.
- La cuenta que firma es Cavos (correo o Google). Una extensión no cuenta. En `app/src/encomun/` se usa `useCavosState().signIn` para abrir el login y `useWallet().signTransaction` para firmar. No se importa `@cavos/kit` ahí.

## Orden en que lo hago

1. **Entrar con Cavos.** El botón ya dice Entrar y no abre Freighter. Falta el App ID en `app/.env` para que el modal cargue. Sin ese id no sigo a firmar plata.
2. **Una categoría en pantalla.** El cuerpo muestra solo la categoría abierta. Abajo: Sacos, Flete, Adelanto, Libro, Ajustes.
3. **Tests del contrato.** Primero los tests de las reglas, en rojo.
4. **El contrato guarda el USDC.** Poner entra plata. Pedir la aparta. Yo lo vi la suelta. El adelanto solo lo firma el asiento y deja deuda.
5. **Deploy en testnet** y cliente de TypeScript generado. No se edita el cliente a mano.
6. **Nombres fuera de la cadena.** SQLite guarda nombre y lugar de cada `G…`. El saldo ya no sale de ahí.
7. **La pantalla lee el contrato.** El número de Sacos es el del contrato.
8. **Ajustes.** Entrar, guardar el nombre, unirse, y una sola vez abrir el fondo con la tesorera y el asiento.
9. **Firmar de verdad.** Poner, Pedir, Yo lo vi y Adelanto cambian el número solo si la firma entró.
10. **Mainnet no se toca.** Queda cerrado hasta que lo pidas aparte.

## Decisiones ya tomadas

**Pantalla.** El cuerpo muestra una sola categoría: la tarjeta grande de color, con su monto, Poner y Pedir. La barra fija de abajo tiene cinco destinos: Sacos, Flete, Adelanto, Libro, Ajustes. Solo el destino abierto lleva color. Ajustes no es una categoría de plata.

**Plata.** Hoy `server/fondo.mjs` baja el frasco en cuanto alguien pide, sin mover USDC. En este plan el USDC sale del contrato solo en dos casos: el adelanto (lo firma el asiento) y un pedido de sacos o flete cuando otra persona firma «Yo lo vi». Hasta esa firma el monto queda apartado dentro del contrato y el frasco ya no lo muestra como disponible.

**Qué no es la fuente del saldo.** Después de la tarea 8, `api.verter`, `api.usar`, `api.adelanto` y `api.vi` no se llaman desde la pantalla. Siguen en el servidor por si hay que ensayar sin red, pero la pantalla no los usa.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `contracts/fondos/src/lib.rs` | Reglas y custodia de USDC. Se reemplaza el libro de votos. |
| `contracts/fondos/src/test.rs` | Las reglas de abajo, con token de prueba. |
| `environments.toml` | Constructor `admin` + dirección del USDC de testnet. |
| `server/fondo.mjs` | Tabla `c_names(address, name, place)`. Deja de ser el saldo. |
| `app/src/encomun/chain.ts` | Lee y firma `fondos` con el cliente generado. |
| `app/src/encomun/pages/Fondo.tsx` | Una categoría. Barra con Ajustes. |
| `app/src/encomun/pages/Ajustes.tsx` | Wallet, nombres, tesorera, asiento, aviso de testnet. |
| `app/src/encomun/styles.module.css` | Quinta pestaña, sin color en las inactivas. |

## Reglas que el contrato tiene que rechazar

1. Poner mueve USDC de la wallet al contrato. Si esa wallet debe un adelanto, esa parte no entra al frasco.
2. Pedir sacos o flete aparta del frasco y no transfiere USDC.
3. Yo lo vi transfiere el USDC apartado a quien pidió. No puede firmarlo quien pidió ni la tesorera.
4. Adelanto solo lo firma el asiento. El USDC sale en esa firma y sube su deuda.
5. Quien no es socio no pone, no pide y no confirma.
6. Un frasco no queda negativo. Un pedido no pasa de 200 USDC.

---

### Task 1: Una categoría en el cuerpo y Ajustes en la barra

**Files:**
- Modify: `app/src/encomun/pages/Fondo.tsx`
- Modify: `app/src/encomun/pages/Ajustes.tsx`
- Modify: `app/src/encomun/styles.module.css`

**Interfaces:**
- Consumes: `jarLabel`, `Mesa`, `styles.tab`, `styles.tabOn`, `styles.toneSacos`, `styles.toneFlete`, `styles.toneAdelanto`, `styles.toneLibro`
- Produces: pestaña `ajustes`. El cuerpo de Sacos, Flete, Adelanto y Libro no cambia de reglas locales en esta tarea.

- [ ] **Step 1: Ampliar el tipo de pestaña**

En `Fondo.tsx`, reemplazar el tipo de la pestaña:

```tsx
type Tab = "sacos" | "flete" | "adelanto" | "libro" | "ajustes"
```

El estado inicial sigue siendo `"sacos"`.

- [ ] **Step 2: Pintar una sola categoría**

El cuerpo ya muestra una categoría cuando `tab` es `sacos`, `flete` o `adelanto`, y el libro cuando `tab` es `libro`. Añadir el caso que falta, importando `Ajustes` arriba del archivo:

```tsx
import { Ajustes } from "./Ajustes"
```

```tsx
{tab === "ajustes" ? <Ajustes /> : null}
```

No renderizar las cuatro tarjetas a la vez. No volver a la grilla de inicio.

- [ ] **Step 3: Cinco botones abajo**

Reemplazar el `nav` de `Fondo.tsx` por este. `toneOf` no recibe `ajustes`.

```tsx
const tabs = ["sacos", "flete", "adelanto", "libro", "ajustes"] as const

function tabLabel(item: Tab) {
	switch (item) {
		case "sacos":
		case "flete":
		case "adelanto":
			return jarLabel(item)
		case "libro":
			return "Libro"
		case "ajustes":
			return "Ajustes"
		default: {
			const unknown: never = item
			return unknown
		}
	}
}
```

```tsx
<nav className={styles.tabbar} aria-label="Secciones">
	{tabs.map((item) => (
		<button
			key={item}
			type="button"
			className={`${styles.tab} ${tab === item ? `${styles.tabOn} ${item === "ajustes" ? "" : toneOf(item)}` : ""}`}
			onClick={() => {
				setTab(item)
				setPending(null)
				setError("")
			}}
		>
			{tabLabel(item)}
		</button>
	))}
</nav>
```

`toneOf` sigue cubriendo solo `sacos | flete | adelanto | libro` con un `never` en el `default`.

- [ ] **Step 4: Ajustes, todavía sin red**

Reescribir `app/src/encomun/pages/Ajustes.tsx` como pantalla de la pestaña. Usa las clases que ya existen (`block`, `hint`). Contenido, en este orden:

1. Título «Ajustes».
2. Una línea: «Esto es testnet. La plata es USDC de prueba.»
3. El botón que ya abre «Cómo funciona» puede quedarse en la cabecera. Aquí repetir un botón «Cómo funciona» que llama a la misma prop `onIntro` si se la pasás desde `Fondo`. Si no está cableada, un párrafo corto con las tres reglas: poner entra plata, pedir queda abierto, el adelanto lo firma una sola persona.
4. No poner selector de persona en el cuerpo de Sacos. «Cambiar» sale de la barra «Entras como» en la tarea 8. En esta tarea puede seguir donde está.

- [ ] **Step 5: La pestaña Ajustes no hereda el amarillo**

En `styles.module.css`, la regla de pestaña inactiva sigue transparente. La activa de Ajustes:

```css
.shell .tabbar button.tabOn {
	background: #fffdf8;
}
```

Las reglas `.shell .tabbar button.tabOn.toneSacos` (y Flete, Adelanto, Libro) quedan después y ganan por especificidad cuando la pestaña de plata está abierta.

- [ ] **Step 6: Ver la barra**

Con la mesa en `127.0.0.1:8787` y Vite en `http://127.0.0.1:5173/`:

1. Al abrir, el cuerpo es Sacos y el botón Sacos está amarillo. Flete, Adelanto, Libro y Ajustes no tienen relleno de color.
2. Flete pinta solo su botón de verde. Adelanto, solo el suyo de rojo. Libro, solo el suyo de azul.
3. Ajustes muestra el aviso de testnet y no muestra Poner ni Pedir.
4. No hay animación al entrar.

---

### Task 2: Tests del contrato que todavía fallan

**Files:**
- Modify: `contracts/fondos/src/test.rs`
- Test: `cargo test -p fondos`

**Interfaces:**
- Produces: la API que la tarea 3 tiene que cumplir. Nombres exactos:

```rust
pub enum Jar { Sacos, Flete, Adelanto }
pub enum LineStatus { Apartado, Visto, Devuelto }

pub struct Line {
    pub id: u32,
    pub jar: Jar,
    pub asker: Address,
    pub amount: i128,
    pub destino: String,
    pub status: LineStatus,
}

// __constructor(env, admin: Address, usdc: Address)
// abrir(env, tesorera: Address, asiento: Address)  // solo admin, una vez
// unirse(env, socio: Address)
// poner(env, socio: Address, jar: Jar, amount: i128)
// pedir(env, socio: Address, jar: Jar, amount: i128, destino: String) -> u32
// vi(env, testigo: Address, line_id: u32)
// adelanto(env, socio: Address, amount: i128)
// devolver(env, socio: Address, line_id: u32)
// jar_de(env, jar: Jar) -> i128
// deuda_de(env, socio: Address) -> i128
// apartado(env) -> i128
// saldo(env) -> i128
// asiento(env) -> Address
// tesorera(env) -> Address
// linea(env, id: u32) -> Line
```

Borrar del contrato, en la tarea 3, `open_fund`, `pledge`, `mark_funded`, `propose`, `vote`, `mark_paid`. Los tests viejos se reemplazan enteros. No los adaptes.

- [ ] **Step 1: Reemplazar `src/test.rs`**

```rust
#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    Address, Env, String,
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
};

const ONE: i128 = 10_000_000;

fn text(env: &Env, value: &str) -> String {
    String::from_str(env, value)
}

struct World {
    env: Env,
    admin: Address,
    tesorera: Address,
    asiento: Address,
    luis: Address,
    jorge: Address,
    usdc: Address,
    client: FondosClient<'static>,
    token: TokenClient<'static>,
}

fn world() -> World {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let usdc = sac.address();
    let id = env.register(Fondos, (admin.clone(), usdc.clone()));
    let client = FondosClient::new(&env, &id);
    let tesorera = Address::generate(&env);
    let asiento = Address::generate(&env);
    let luis = Address::generate(&env);
    let jorge = Address::generate(&env);
    client.abrir(&tesorera, &asiento);
    client.unirse(&tesorera);
    client.unirse(&asiento);
    client.unirse(&luis);
    client.unirse(&jorge);
    let asset = StellarAssetClient::new(&env, &usdc);
    asset.mint(&asiento, &(40 * ONE));
    asset.mint(&luis, &(40 * ONE));
    asset.mint(&jorge, &(40 * ONE));
    World {
        token: TokenClient::new(&env, &usdc),
        env,
        admin,
        tesorera,
        asiento,
        luis,
        jorge,
        usdc,
        client,
    }
}

#[test]
fn poner_entra_al_frasco_y_al_contrato() {
    let w = world();
    w.client.poner(&w.asiento, &Jar::Sacos, &(8 * ONE));
    assert_eq!(w.client.jar_de(&Jar::Sacos), 8 * ONE);
    assert_eq!(w.token.balance(&w.client.address), 8 * ONE);
    assert_eq!(w.client.saldo(), 8 * ONE);
}

#[test]
fn la_deuda_se_cobra_antes_del_frasco() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Adelanto, &(20 * ONE));
    w.client.adelanto(&w.asiento, &(8 * ONE));
    assert_eq!(w.client.deuda_de(&w.asiento), 8 * ONE);
    assert_eq!(w.client.jar_de(&Jar::Adelanto), 12 * ONE);
    w.client.poner(&w.asiento, &Jar::Sacos, &(10 * ONE));
    assert_eq!(w.client.deuda_de(&w.asiento), 0);
    assert_eq!(w.client.jar_de(&Jar::Sacos), 2 * ONE);
    assert_eq!(w.token.balance(&w.client.address), 22 * ONE);
}

#[test]
fn pedir_aparta_y_vi_suelta_el_usdc() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Sacos, &(15 * ONE));
    let id = w.client.pedir(&w.jorge, &Jar::Sacos, &(8 * ONE), &text(&w.env, "Sacos de yute"));
    assert_eq!(w.client.jar_de(&Jar::Sacos), 7 * ONE);
    assert_eq!(w.client.apartado(), 8 * ONE);
    assert_eq!(w.token.balance(&w.jorge), 40 * ONE);
    w.client.vi(&w.luis, &id);
    assert_eq!(w.client.linea(&id).status, LineStatus::Visto);
    assert_eq!(w.client.apartado(), 0);
    assert_eq!(w.token.balance(&w.jorge), 48 * ONE);
}

#[test]
fn no_confirma_quien_pidio_ni_la_tesorera() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Sacos, &(15 * ONE));
    let id = w.client.pedir(&w.jorge, &Jar::Sacos, &(8 * ONE), &text(&w.env, "Sacos de yute"));
    assert_eq!(w.client.try_vi(&w.jorge, &id), Err(Ok(Error::Unauthorized)));
    assert_eq!(w.client.try_vi(&w.tesorera, &id), Err(Ok(Error::Unauthorized)));
    assert_eq!(w.client.linea(&id).status, LineStatus::Apartado);
}

#[test]
fn el_adelanto_solo_lo_firma_el_asiento() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Adelanto, &(20 * ONE));
    assert_eq!(
        w.client.try_adelanto(&w.luis, &(5 * ONE)),
        Err(Ok(Error::Unauthorized))
    );
    assert_eq!(w.client.jar_de(&Jar::Adelanto), 20 * ONE);
}

#[test]
fn devolver_regresa_el_apartado_al_frasco() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Flete, &(10 * ONE));
    let id = w.client.pedir(&w.jorge, &Jar::Flete, &(4 * ONE), &text(&w.env, "Flete del grano"));
    w.client.devolver(&w.jorge, &id);
    assert_eq!(w.client.jar_de(&Jar::Flete), 10 * ONE);
    assert_eq!(w.client.apartado(), 0);
    assert_eq!(w.token.balance(&w.jorge), 40 * ONE);
}
```

- [ ] **Step 2: Correr los tests y verlos fallar**

Run: `cargo test -p fondos`

Expected: FAIL compilando, porque `Jar`, `poner` y `abrir` todavía no existen. Los tests viejos de mayoría ya no están en el archivo.

---

### Task 3: El contrato custodia el USDC

**Files:**
- Modify: `contracts/fondos/src/lib.rs`
- Modify: `contracts/fondos/Cargo.toml` (solo el `description`)
- Test: `contracts/fondos/src/test.rs`

**Interfaces:**
- Consumes: las firmas de la tarea 2.
- Produces: el mismo contrato, compilando, con errores en español.

`Cargo.toml` description: `Fondo de la cosecha: tres frascos, un asiento y USDC que sale con testigo`.

Reemplazar `lib.rs`. Constantes: `MAX_TEXT = 80`, `MAX_MEMBERS = 12`, `MIN = 10_000_000`, `MAX = 200 * 10_000_000`. TTL igual que el archivo actual (`DAY_IN_LEDGERS`, `TTL_EXTEND_TO`, `TTL_THRESHOLD`).

Errores, cada uno con `///` en español:

| Variante | Número | Texto del `///` |
| --- | --- | --- |
| `NotFound` | 1 | No hay un pedido con ese número. |
| `Unauthorized` | 2 | No podés hacer eso en este fondo. |
| `InvalidAmount` | 3 | El monto tiene que estar entre 1 y 200 USDC. |
| `TooManyMembers` | 4 | Este fondo ya tiene el máximo de socios. |
| `AlreadyMember` | 5 | Ya sos socio. |
| `WrongStatus` | 6 | Ese pedido ya no está abierto. |
| `Insufficient` | 7 | El frasco no alcanza. |
| `NotOpen` | 8 | El fondo todavía no tiene tesorera ni asiento. |
| `AlreadyOpen` | 9 | El fondo ya está abierto. |
| `WrongJar` | 10 | Eso solo se pide de Sacos o de Flete. |

Storage de instancia: `Admin`, `Usdc`, `Tesorera`, `Asiento`, `Abierta(bool)`, `LineCount`, `Apartado`. Storage persistente: `Socio(Address) -> bool`, `Deuda(Address) -> i128`, `JarAmount(Jar) -> i128`, `Line(u32) -> Line`.

Cada función que escribe llama `bump_instance` y, si toca una clave persistente, `bump_persistent`.

- [ ] **Step 1: Constructor y apertura**

```rust
pub fn __constructor(env: Env, admin: Address, usdc: Address) {
    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage().instance().set(&DataKey::Usdc, &usdc);
    env.storage().instance().set(&DataKey::Abierta, &false);
    env.storage().instance().set(&DataKey::LineCount, &0u32);
    env.storage().instance().set(&DataKey::Apartado, &0i128);
    env.storage().instance().set(&DataKey::JarAmount(Jar::Sacos), &0i128);
    env.storage().instance().set(&DataKey::JarAmount(Jar::Flete), &0i128);
    env.storage().instance().set(&DataKey::JarAmount(Jar::Adelanto), &0i128);
    bump_instance(&env);
}

pub fn abrir(env: Env, tesorera: Address, asiento: Address) -> Result<(), Error> {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    admin.require_auth();
    if env.storage().instance().get(&DataKey::Abierta).unwrap_or(false) {
        return Err(Error::AlreadyOpen);
    }
    env.storage().instance().set(&DataKey::Tesorera, &tesorera);
    env.storage().instance().set(&DataKey::Asiento, &asiento);
    env.storage().instance().set(&DataKey::Abierta, &true);
    bump_instance(&env);
    Ok(())
}
```

`upgrade` se queda: el admin firma y llama `env.deployer().update_current_contract_wasm`.

- [ ] **Step 2: Socios y frascos**

`unirse`: `socio.require_auth()`, el fondo está abierto, no es socio, hay menos de 12. Guardar `Socio(address) = true`. Contar socios en un `u32` de instancia `Socios`.

`require_socio`: si `Socio(address)` no es true, `Error::Unauthorized`.

`jar_de` lee `JarAmount`. Si no hay valor, `0`.

`poner`:

1. `socio.require_auth()` y `require_socio`.
2. `amount` entre `MIN` y `MAX`, si no `InvalidAmount`.
3. `TokenClient::new(&env, &usdc).transfer(&socio, &env.current_contract_address(), &amount)`.
4. `deuda = deuda_de(socio)`. `cubre = min(deuda, amount)`. Bajar la deuda. `resto = amount - cubre`. Si `resto > 0`, sumarlo a `JarAmount(jar)`.
5. Publicar `Puso { socio, jar, amount, cubre, resto }`.

- [ ] **Step 3: Pedir, ver y devolver**

`pedir`: socio, monto válido, `jar` es `Sacos` o `Flete` (si no, `WrongJar`), `destino` de 1 a 80 caracteres (si no, reutilizar `InvalidAmount` no: agregar `/// El destino quedó vacío o es demasiado largo.` como `InvalidText = 11`). El frasco alcanza. Restar del frasco, sumar a `Apartado`, guardar `Line` con `LineStatus::Apartado`, devolver el id.

`vi`:

1. `testigo.require_auth()` y `require_socio`.
2. La línea existe y está `Apartado`.
3. `testigo != linea.asker` y `testigo != tesorera`, si no `Unauthorized`.
4. `TokenClient` transfiere del contrato a `linea.asker` el `amount`. Para que el contrato autorice su propia salida, el `transfer` del SAC usa al contrato como `from`: en Soroban, `from.require_auth()` lo cumple el contrato cuando él mismo invoca el token. No hace falta otra firma.
5. `Apartado -= amount`. Estado `Visto`.

`devolver`: solo `linea.asker`, estado `Apartado`. Sumar el monto al frasco, restar `Apartado`, estado `Devuelto`. No hay `transfer`.

`adelanto`: `socio == asiento`, si no `Unauthorized`. Frasco `Adelanto` alcanza. Restar del frasco, sumar `Deuda(socio)`, transferir del contrato a `socio`.

`saldo`: balance USDC del contrato (`TokenClient.balance(current_contract_address)`). Tiene que ser igual a la suma de los tres frascos más `Apartado`.

- [ ] **Step 4: Tests en verde**

Run: `cargo test -p fondos`

Expected: los 6 tests de la tarea 2 en PASS. Si `register_stellar_asset_contract_v2` no existe en el SDK pinneado, usar el método de registro de SAC que exporte `Env` en `soroban-sdk` 26 y no cambiar las afirmaciones.

- [ ] **Step 5: Commit**

```bash
git add contracts/fondos/src/lib.rs contracts/fondos/src/test.rs contracts/fondos/Cargo.toml
git commit -m "$(cat <<'EOF'
feat: el fondo custodia USDC y lo suelta con testigo

EOF
)"
```

---

### Task 4: Desplegar en testnet y generar el cliente

**Files:**
- Modify: `environments.toml` (development y staging)
- Do not modify: `app-lib/clients/*`

**Interfaces:**
- Consumes: `__constructor(admin, usdc)`.
- Produces: `import { fondos } from "@stellar-scaffold/app-lib/clients"`.

- [ ] **Step 1: Argumentos del constructor**

En `[development.contracts]` y `[staging.contracts]`, reemplazar la línea de `fondos`:

```toml
fondos = { client = true, constructor_args = "--admin me --usdc CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" }
```

En staging, `--admin testnet-user` y el mismo `--usdc`.

El nombre del argumento tiene que coincidir con el parámetro Rust `usdc`. No usar el nombre `options`.

- [ ] **Step 2: Si ya hay un id viejo, no reutilizarlo**

`fondos` no llegó a desplegarse con estas reglas. Si `app/.config` ya tiene un id de `fondos` deployado con el constructor viejo (`--admin` solo), el `upgrade` no vuelve a correr el constructor y el USDC queda vacío. En ese caso borrar solo la entrada de id de `fondos` en el config de Scaffold (no tocar `reputation` ni `pools`) antes del build, para que el deploy sea nuevo.

- [ ] **Step 3: Build**

Desde la raíz del repo:

Run: `npm run contracts:build`

Expected: el log desplegó `fondos` en testnet y generó el cliente. `cargo test -p fondos` sigue en verde porque el build de contratos no reemplaza los tests.

- [ ] **Step 4: Commit de la config, no del cliente**

```bash
git add environments.toml
git commit -m "$(cat <<'EOF'
chore: fondos se despliega con el USDC de testnet

EOF
)"
```

No agregar `app/.config/` ni `app-lib/clients/`.

---

### Task 5: El directorio de nombres, separado del saldo

**Files:**
- Modify: `server/fondo.mjs`
- Modify: `server/db.mjs` solo si la conexión no alcanza
- Modify: `app/src/encomun/api.ts`

**Interfaces:**
- Produces:

```ts
export type Persona = { address: string; name: string; place: string }

export const nombres = {
	lista: () => req<Persona[]>("/api/comunidad/nombres"),
	guardar: (address: string, name: string, place: string) =>
		req<Persona>("/api/comunidad/nombres", {
			method: "POST",
			body: JSON.stringify({ address, name, place }),
		}),
}
```

- [ ] **Step 1: Tabla**

En `fondo.mjs`, crear si no existe:

```sql
CREATE TABLE IF NOT EXISTS c_names (
	address TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	place TEXT NOT NULL
)
```

No borrar `c_jars` en esta tarea. Dejan de alimentar la pantalla en la tarea 8.

- [ ] **Step 2: Rutas**

`GET /api/comunidad/nombres` devuelve todas las filas.

`POST /api/comunidad/nombres` exige `address` que empiece con `G` y tenga 56 caracteres, `name` de 2 a 60 caracteres, `place` de 2 a 40. Hace upsert. No guarda montos.

El header `x-actor-id` no autoriza esta ruta: el body trae la address, y la pantalla solo llama `guardar` con `useWallet().address`.

- [ ] **Step 3: Probar con curl**

```bash
curl -s -X POST http://127.0.0.1:8787/api/comunidad/nombres \
  -H 'content-type: application/json' \
  -d '{"address":"GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF","name":"Elena Vargas","place":"Naranjo"}'
```

Expected: JSON con esos tres campos. Un segundo POST con el mismo address y otro nombre reemplaza el nombre.

---

### Task 6: Cliente de cadena en la app

**Files:**
- Create: `app/src/encomun/chain.ts`
- Modify: `app/src/encomun/api.ts` (seguir exportando `jarLabel`)

**Interfaces:**
- Consumes: `fondos` generado, `SignTransactionFn` de `useWallet`.
- Produces:

```ts
export const STROOP = 10_000_000

export function usdcToStroops(whole: number): bigint {
	if (!Number.isInteger(whole) || whole < 1 || whole > 200) {
		throw new Error("El monto tiene que estar entre 1 y 200 USDC.")
	}
	return BigInt(whole) * BigInt(STROOP)
}

export function stroopsToUsdc(raw: bigint): number {
	return Number(raw / BigInt(STROOP))
}

export type ChainJar = "sacos" | "flete" | "adelanto"

export async function leerFondo(): Promise<{
	sacos: number
	flete: number
	adelanto: number
	apartado: number
	saldo: number
	asiento: string
	tesorera: string
	abierta: boolean
}>

export async function firmar(
	address: string,
	signTransaction: SignTransactionFn,
	run: () => Promise<{ result: { isErr: () => boolean; unwrapErr: () => { message: string } }; signAndSend: (opts: { signTransaction: SignTransactionFn }) => Promise<unknown> }>,
): Promise<void>
```

`firmar` hace lo mismo que `ReputationPanel`: si `tx.result.isErr()`, lanzar `Error` con `message` antes de `signAndSend`. Si la simulación pasa, `await tx.signAndSend({ signTransaction })`.

`leerFondo` llama, sin wallet, a `fondos.jar_de`, `fondos.apartado`, `fondos.saldo`, `fondos.asiento`, `fondos.tesorera`. Si `asiento` o `tesorera` fallan porque `abrir` no corrió, devolver `abierta: false` y ceros. Convertir stroops a USDC enteros con `stroopsToUsdc`.

Los métodos de escritura (`poner`, `pedir`, `vi`, `adelanto`, `devolver`, `unirse`, `abrir`) se arman en la tarea 8 llamando al cliente y pasando el resultado por `firmar`. No duplicar la firma dentro de cada uno.

El enum generado puede llamarse distinto (`Jar` con variantes `Sacos` / `Sacos = 0`). Al escribir `chain.ts`, abrir el cliente generado y usar el valor que Scaffold emitió. No editar ese archivo.

- [ ] **Step 1: Escribir `chain.ts` con `leerFondo` y `firmar`**

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS. Si el cliente todavía no existe, primero la tarea 4.

---

### Task 7: Ajustes abre el fondo y guarda el nombre

**Files:**
- Modify: `app/src/encomun/pages/Ajustes.tsx`
- Modify: `app/src/encomun/chain.ts`

**Interfaces:**
- Consumes: `fondos.abrir`, `fondos.unirse`, `nombres.guardar`, `nombres.lista`, `useWallet`.
- Produces: un fondo abierto con tesorera, asiento y nombres visibles en las otras pestañas.

- [ ] **Step 1: Bloques de Ajustes**

Con wallet desconectada, un solo botón: «Conectar wallet», que llama `connectWallet()`.

Con wallet conectada, en este orden:

1. Address corta (`shortAddress`).
2. Campos Nombre y Lugar. Botón «Guardar mi nombre». Llama `nombres.guardar(address, name, place)`.
3. Si `leerFondo().abierta` es false y el address es el admin desplegador: dos campos de address «Tesorera» y «Asiento», botón «Abrir el fondo». Arma `fondos.abrir({ tesorera, asiento }, { publicKey: address })` y lo pasa por `firmar`. El admin es la cuenta `me` de Scaffold; mostrar su address leyendo el id no alcanza. Comparar contra `PUBLIC_FONDOS_ADMIN` si existe. Si esa env no está, el botón «Abrir el fondo» lo ve cualquier wallet y el contrato rechaza con «No podés hacer eso en este fondo.» Mostrar ese texto. No inventar la G del admin en el código.
4. Si el fondo está abierto: botón «Unirme». `fondos.unirse({ socio: address })` y `firmar`. Si ya es socio, mostrar «Ya estás en el fondo.»
5. Línea fija: «Testnet. USDC de prueba. El XLM solo paga la red.»

Sacar de Ajustes cualquier lista para cambiar de persona. Eso deja de ser la forma de entrar.

- [ ] **Step 2: Probar en el navegador**

1. Conectar una wallet de testnet con trustline de USDC (el checklist que ya existe en la app, `addUsdcTrustline` / `swapXlmForUsdc`, sirve para conseguir los 100 USDC de prueba; no construir otro canje).
2. Guardar nombre «Elena Vargas» y lugar «Naranjo». Recargar. El nombre sigue.
3. Con la wallet admin, abrir el fondo: tesorera = wallet de Marta, asiento = wallet de Elena. Si solo hay una wallet a mano, anotar que el sábado cada persona conecta la suya, y no simular cuatro firmas con una sola G.

---

### Task 8: La categoría firma y el número sale del contrato

**Files:**
- Modify: `app/src/encomun/pages/Fondo.tsx`
- Modify: `app/src/encomun/chain.ts`
- Modify: `app/src/encomun/EncomunApp.tsx` (quitar «Cambiar» si sigue en el shell)

**Interfaces:**
- Consumes: `leerFondo`, `firmar`, `usdcToStroops`, `nombres.lista`, cliente `fondos`.
- Produces: la pantalla del día a día de abajo.

El query de la pantalla deja de usar `api.mesa` para montos. Usa `leerFondo` más `nombres.lista`. El nombre de la wallet conectada sale del directorio. Si no hay nombre, la cabecera dice la address corta y un enlace a Ajustes: «Poné tu nombre».

Quitar el botón «Cambiar» y la lista de personas del cuerpo.

`Firmar` solo existe si hay `address`. Si no, el botón dice «Conectar wallet» y no llama al contrato.

Textos de la tarjeta blanca, antes de firmar:

| Acción | Texto |
| --- | --- |
| Poner, sin deuda | Van {n} USDC de tu wallet a {frasco}. |
| Poner, con deuda | Primero se pagan {cubre} USDC de tu adelanto. El resto entra a {frasco}. |
| Pedir | Se apartan {n} USDC de {frasco}. El USDC sale cuando otra persona firme que lo vio. |
| Yo lo vi | Van {n} USDC del fondo a {nombre}. Confirmas que viste: {destino}. |
| Adelanto, siendo el asiento | Salen {n} USDC a tu wallet. Quedás debiendo {n} USDC. |
| Adelanto, no siendo el asiento | El asiento es de {nombre o address corta}. |

Después de `signAndSend` sin error, invalidar la query y recién ahí cambiar el número. Si la simulación o la red fallan, el número queda igual y se muestra `errorMessage`.

Líneas abiertas: `fondos` no lista solo. Guardar en la mesa, al pedir y al ver, el id de línea que devolvió el contrato (`POST /api/comunidad/linea` con `id`, `jar`, `asker`, `amount`, `destino`, `status`). Esa tabla es un índice para la pantalla, no el saldo. Al pintar, leer `fondos.linea({ id })` y mostrar la fila solo si el estado es `Apartado`. Quien pide y la tesorera ven «Otra persona tiene que confirmarlo.»

`POST /api/comunidad/linea` no modifica `c_jars`.

- [ ] **Step 1: Query de lectura**

```tsx
const fondo = useQuery({
	queryKey: ["fondos", address],
	queryFn: async () => {
		const [chain, people] = await Promise.all([leerFondo(), nombres.lista()])
		return { chain, people }
	},
})
```

Sacos muestra `fondo.data.chain.sacos`. La plata del grupo muestra `fondo.data.chain.saldo`.

- [ ] **Step 2: Poner**

```tsx
const tx = await fondos.poner(
	{ socio: address, jar: jarArg, amount: usdcToStroops(pending.amount) },
	{ publicKey: address },
)
await firmar(address, signTransaction, async () => tx)
```

`jarArg` es el valor del enum generado, no el string `"sacos"`.

- [ ] **Step 3: Pedir, ver, adelanto**

Igual que poner, con `fondos.pedir`, `fondos.vi` y `fondos.adelanto`. `pedir` devuelve el id: después de `signAndSend`, `nombres` no guarda el id; llamar `POST /api/comunidad/linea`.

- [ ] **Step 4: Recorrer en el navegador**

Hace falta USDC de prueba en la wallet y el fondo ya abierto (tarea 7).

1. Sacos es la única tarjeta. La barra tiene cinco botones.
2. Poner 8. La tarjeta dice «Van 8 USDC de tu wallet a Sacos.» Cancelar no cambia el número.
3. Firmar. Sacos sube 8 solo cuando la transacción entra. El libro local puede mostrar el nombre; el monto se contrasta con `jar_de`.
4. Pedir 5 con destino «Sacos de yute». Sacos baja 5. El USDC de quien pidió no sube todavía.
5. Con otra wallet que no sea la tesorera ni quien pidió, «Yo lo vi». Recién ahí sube el USDC de quien pidió.
6. Con una wallet que no es el asiento, Adelanto no arma firma: muestra de quién es el asiento.
7. Con el asiento, adelanto 4. Su USDC sube 4 y el próximo Poner dice primero la deuda.

Si no hay segunda wallet, parar en el paso 4 y decirlo. No marcar el paso 5 como visto.

---

### Task 9: Mainnet, sin ejecutar

No cambiar `STELLAR_SCAFFOLD_ENV` a production. No poner un RPC de mainnet. No reemplazar el SAC de USDC por el de mainnet.

Cuando el equipo lo pida aparte, el corte es: id del contrato ya desplegado a mano, USDC de Circle en mainnet, y las mismas funciones. Hasta esa frase, la app dice «testnet» en Ajustes.

## Qué se ve un sábado

1. Cada persona entra con su wallet y guarda su nombre.
2. La tesorera abre el fondo una vez, con su address y la del asiento.
3. Alguien pone USDC en Sacos. El frasco de la pantalla es `jar_de`.
4. Alguien pide. El frasco baja y el USDC sigue en el contrato.
5. Otra persona, que no pidió y no es la tesorera, firma «Yo lo vi». Ahí sale el USDC.
6. El asiento pide adelanto. La próxima vez que pone, la firma dice que primero paga lo que debe.

## Self-review

- Una categoría en el cuerpo y el resto en la barra: tarea 1. Ajustes es la quinta pestaña.
- USDC real en testnet: tareas 3, 4 y 8. La mesa deja de ser el saldo en la tarea 8.
- Deuda antes del frasco: test `la_deuda_se_cobra_antes_del_frasco` y el texto de Poner.
- Testigo: test `no_confirma_quien_pidio_ni_la_tesorera`.
- Asiento: test `el_adelanto_solo_lo_firma_el_asiento`.
- Nombres fuera de la cadena: tarea 5.
- Mainnet no se ejecuta: tarea 9.
- Trustless Work no se usa. El contrato es el que retiene el USDC.
