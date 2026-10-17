# EnComún — el libro de la cosecha

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El fondo de Naranjo muestra quién puso, en cuál de tres frascos cayó, quién ocupa el asiento del adelanto, y qué plata salió sin que otro socio la haya visto.

**Architecture:** Hay tres frascos fijos: Sacos, Flete y Adelanto. Un aporte elige frasco y queda con el nombre del socio. El Adelanto tiene un solo asiento, visible toda la cosecha. Cobrar de ese frasco pinta una mancha en quien se sienta, por ese monto. Su próximo aporte tapa la mancha antes de llenar ningún frasco. Sacos y Flete salen con un destino escrito, y la línea queda abierta hasta que un tercer socio dice que lo vio. Ni quien cobra ni la tesorera pueden cerrarla. El contrato `fondos` guarda frascos, asiento, mancha y líneas abiertas. SQLite guarda los nombres. Trustless Work suelta el USDC cuando la línea nace, y el libro sigue manchado o abierto hasta que se tapa o se ve.

**Tech Stack:** Soroban SDK 26, Scaffold Stellar v1, React 19, Vite, SQLite (`node:sqlite`), Trustless Work API V1 `@trustless-work/escrow@3.0.5`.

## Global Constraints

- Testnet only.
- UI en español. El producto se llama EnComún.
- Los nombres no van a la cadena.
- Toda firma pasa por `useWallet().signTransaction`.
- No editar `app-lib/clients/*`.
- No subir Trustless Work de `3.0.5`.
- Errores del contrato con `#[contracterror]` y comentario en español.

## El problema que se ve en la página

La asociación junta plata para la cosecha y el cuaderno de la tesorera se puede reescribir. Nadie ve quién puso, ni si el flete se gastó en flete, ni quién se llevó el adelanto. EnComún lo deja en tres objetos:

- **Frasco.** La plata entra con nombre a Sacos, Flete o Adelanto. No existe un retiro en blanco.
- **Asiento.** Una sola persona puede llevarse el adelanto en la cosecha. El nombre está escrito arriba del frasco. Para sentarse otro, quien está sentado se levanta, o los otros tres escriben el nombre nuevo.
- **Mancha y visto.** El adelanto queda pintado en esa persona hasta que su propio saco lo tapa. Sacos y flete quedan en rojo hasta que otro socio, que no es quien cobró ni la tesorera, dice «lo vi».

## Recorrido de cinco minutos

1. El libro abre en Naranjo. Tres frascos. El asiento del adelanto dice Elena.
2. Jorge aporta 20 USDC y lo pone en Sacos. El frasco crece con su nombre.
3. Luis intenta cobrar el adelanto. La página dice que el asiento es de Elena.
4. Elena cobra 12. El frasco baja y queda la mancha: «Elena debe 12».
5. Marta saca 10 de Sacos para «sacos de yute de esta semana». La línea queda abierta: «salió y nadie lo vio». Marta no puede cerrarla.
6. Jorge entra y toca «Lo vi». La línea se cierra con su nombre.
7. Elena aporta de nuevo. El libro dice «este saco tapa el adelanto» y la mancha baja antes de que crezca un frasco.

---

### Task 1: Frascos, asiento y mancha en el contrato

**Files:**
- Modify: `contracts/fondos/src/lib.rs`
- Modify: `contracts/fondos/src/test.rs`

**Interfaces:**
- Consumes: `open_fund`, `pledge`, `mark_funded`
- Produces:
  - `enum Jar { Sacos, Flete, Adelanto }`
  - `pour(member, fund_id, jar, amount)` suma al frasco. Si el socio tiene mancha, el monto tapa mancha primero y el resto entra al frasco.
  - `sit(member, fund_id)` ocupa el asiento solo si está vacío.
  - `stand(seated, fund_id)` lo deja vacío.
  - `seat_by_others(voter, fund_id, next)` cuenta firmas de socios que no son el sentado. A la tercera firma, `next` se sienta.
  - `draw_advance(seated, fund_id, amount)` solo si `seated` es el asiento, el frasco Adelanto alcanza, y suma `stain`.
  - `stain_of(fund_id, member) -> i128`

Errores nuevos: `WrongSeat = 11`, `EmptyJar = 12`, `StainFirst = 13`.

- [ ] **Step 1: Write the failing test**

```rust
#[test]
fn advance_paints_the_seat_until_their_own_sack_covers_it() {
    let (env, marta, client) = setup();
    let elena = Address::generate(&env);
    let fund_id = client.open_fund(&marta, &text(&env, "Cosecha"), &text(&env, "Naranjo"));
    client.pledge(&elena, &fund_id, &(TEN * 20));
    client.mark_funded(&elena, &fund_id, &(TEN * 20));
    client.pour(&elena, &fund_id, &Jar::Adelanto, &(TEN * 20));
    client.sit(&elena, &fund_id);
    assert_eq!(
        client.try_draw_advance(&marta, &fund_id, &(TEN * 12)),
        Err(Ok(Error::WrongSeat))
    );
    client.draw_advance(&elena, &fund_id, &(TEN * 12));
    assert_eq!(client.stain_of(&fund_id, &elena), TEN * 12);
    client.pledge(&elena, &fund_id, &(TEN * 8));
    client.mark_funded(&elena, &fund_id, &(TEN * 8));
    client.pour(&elena, &fund_id, &Jar::Sacos, &(TEN * 8));
    assert_eq!(client.stain_of(&fund_id, &elena), TEN * 4);
    assert_eq!(client.jar_of(&fund_id, &Jar::Sacos), 0);
}
```

- [ ] **Step 2: Run** `cargo test -p fondos advance_paints_the_seat --offline`
Expected: FAIL because `Jar` and `draw_advance` do not exist.

- [ ] **Step 3: Implement the three jars, the single seat, and stain-first pour.** `pour` moves `min(stain, amount)` off the stain and only the remainder into the chosen jar.

- [ ] **Step 4: Run** `cargo test -p fondos --offline`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contracts/fondos/src/lib.rs contracts/fondos/src/test.rs
git commit -m "feat: an advance stays on the person until their next sack covers it"
```

### Task 2: Sacos y flete quedan abiertos hasta que otro los ve

**Files:**
- Modify: `contracts/fondos/src/lib.rs`
- Modify: `contracts/fondos/src/test.rs`

**Interfaces:**
- Consumes: `Jar::Sacos`, `Jar::Flete`, `Fund.opener` como tesorera
- Produces: `open_use(member, fund_id, jar, amount, destino) -> u32` deja la línea `Open`. `witness(member, line_id)` la pasa a `Seen`. Falla si `member` es quien cobró o es la tesorera. Adelanto no usa este camino.

Errores nuevos: `NeedsWitness = 14`, `CannotWitness = 15`.

- [ ] **Step 1: Write the failing test**

```rust
#[test]
fn sacks_stay_open_until_someone_else_saw_them() {
    let (env, marta, client) = setup();
    let jorge = Address::generate(&env);
    let fund_id = client.open_fund(&marta, &text(&env, "Cosecha"), &text(&env, "Naranjo"));
    client.pledge(&marta, &fund_id, &(TEN * 15));
    client.mark_funded(&marta, &fund_id, &(TEN * 15));
    client.pour(&marta, &fund_id, &Jar::Sacos, &(TEN * 15));
    let line = client.open_use(&marta, &fund_id, &Jar::Sacos, &(TEN * 10), &text(&env, "Sacos de yute"));
    assert_eq!(client.try_witness(&marta, &line), Err(Ok(Error::CannotWitness)));
    client.witness(&jorge, &line);
    assert_eq!(client.line_status(&line), LineStatus::Seen);
}
```

- [ ] **Step 2: Run** `cargo test -p fondos sacks_stay_open --offline` and confirm FAIL.
- [ ] **Step 3: Store `UseLine { jar, amount, destino, recipient, witness, status }`.** `witness` requires a member who is neither recipient nor opener.
- [ ] **Step 4: Run** `cargo test -p fondos --offline` Expected: PASS
- [ ] **Step 5: Commit** `feat: sacks and freight stay open until another member saw them`

### Task 3: El libro con frascos, asiento y mancha

**Files:**
- Modify: `server/fondo.mjs`
- Modify: `app/src/encomun/api.ts`
- Modify: `app/src/encomun/pages/Fondo.tsx`
- Modify: `app/src/encomun/styles.module.css`

**Interfaces:**
- Consumes: socios sembrados (Marta tesorera, Luis, Elena, Jorge)
- Produces: `jars: { sacos, flete, adelanto }`, `seatId`, `stains[]`, `openLines[]`. Rutas `POST /api/comunidad/verter` `{ jar, amount }`, `POST /api/comunidad/adelanto` `{ amount }`, `POST /api/comunidad/usar` `{ jar, amount, destino }`, `POST /api/comunidad/vi` `{ id }`.

- [ ] **Step 1: Al verter, si el actor tiene mancha, descontarla primero y anotar en el libro `este saco tapa el adelanto`.**
- [ ] **Step 2: `adelanto` solo si `actor.id === seatId`.** Si no: `El asiento es de Elena.`
- [ ] **Step 3: `usar` crea línea abierta. `vi` rechaza a la tesorera y a quien cobró.**
- [ ] **Step 4: Dibujar tres frascos en la hoja. El de Adelanto muestra el asiento y, si hay mancha, la franja roja con el nombre y el monto. Las líneas abiertas dicen `salió y nadie lo vio` con el botón `Lo vi`.**
- [ ] **Step 5: Commit** `feat: show the harvest book as jars, a seat, and an open line`

### Task 4: Firmar en testnet

**Files:**
- Create: `app/src/encomun/chain.ts`
- Modify: `app/src/encomun/pages/Fondo.tsx`

**Interfaces:**
- Consumes: cliente `fondos` generado con `npm run contracts:build` desde `app/`
- Produces: `chainPour`, `chainDrawAdvance`, `chainOpenUse`, `chainWitness`, cada una con `signAndSend` de `useWallet()`

- [ ] **Step 1: Deploy desde `app/`:** `npm run contracts:build`. Esperado: cliente `fondos` generado.
- [ ] **Step 2: Cada acción escribe la mesa y, con wallet, la misma acción firma el contrato.** Sin wallet el folio dice `sin firma`.
- [ ] **Step 3: Sacar de un frasco llama `releaseFunds` de Trustless Work solo si hay escrow, y la línea de sacos o flete sigue abierta hasta `vi`.**
- [ ] **Step 4: Commit** `feat: sign jars, the seat, and the witness on fondos`

### Task 5: El guion y el README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Ensayar el recorrido de cinco minutos en http://127.0.0.1:5173/ con Ajustes para cambiar de socio.**
- [ ] **Step 2: El párrafo del README nombra a Elena en el asiento, la mancha del adelanto y a Jorge diciendo que vio los sacos.**
