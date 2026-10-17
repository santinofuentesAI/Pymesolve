# EnComún en el día a día

**Goal:** Un socio abre EnComún, pone USDC de su wallet en una categoría, y el grupo ve el movimiento. Pedir y confirmar siguen esa misma firma.

**Architecture:** Cada persona entra con su wallet. El nombre sigue fuera de la cadena. El contrato `fondos` anota la categoría, el monto y si el gasto sigue abierto. Trustless Work guarda el USDC de esa categoría y solo lo suelta cuando la pantalla ya mostró la regla. La mesa local deja de ser la fuente del saldo.

**Tech Stack:** Soroban SDK 26, Scaffold Stellar v1, React 19, `useWallet().signTransaction`, Trustless Work API V1 `@trustless-work/escrow@3.0.5`.

## Cómo se usa un día normal

1. Elena abre la app. Arriba dice su nombre, no un botón de cambiar persona.
2. Ve la plata del grupo y entra a Sacos.
3. Toca 8 y **Poner 8 USDC**. La pantalla dice: «Van 8 USDC de tu wallet a Sacos. Firmar.»
4. Firma. Sacos pasa de 10 a 18. El libro dice «Elena puso 8 USDC en Sacos».
5. Jorge entra a Sacos, escribe «sacos de yute» y toca **Pedir**. La plata sale y queda «por confirmar».
6. Luis entra a Sacos y toca **Yo lo vi**. Sin eso, el gasto sigue abierto.
7. El adelanto solo lo firma Elena. La próxima vez que ella pone plata, la pantalla dice primero «esto paga lo que debes» y el resto entra a la categoría.

## Qué falta para que eso sea verdad

Hoy el número cambia en la mesa local, sin wallet y sin USDC. El día a día necesita cuatro piezas, en este orden:

1. **Entrar con la wallet.** Una persona, una firma. Se acaba el cambio de nombre en la misma pantalla.
2. **Poner mueve USDC.** El botón de la categoría arma la transacción, la persona firma, y el frasco sube solo si la firma salió bien.
3. **Pedir y confirmar firman la regla.** Pedir deja la línea abierta. Yo lo vi la cierra, y no puede firmarlo quien pidió ni la tesorera.
4. **El adelanto se descuenta solo.** Si Elena debe, su próximo depósito paga esa deuda antes de sumar a una categoría, y el texto de la firma lo dice.

Testnet. Nombres fuera de la cadena. Errores del contrato en español.
