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
			tienePlata: false,
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
			tienePlata: false,
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
			tienePlata: false,
			abierta: true,
			esSocio: true,
		})
		assert.equal(paso.id, "nombre")
		assert.equal(paso.accion, "ajustes")
		assert.equal(paso.boton, "Ir a Ajustes")
	})

	it("con nombre y sin plata pide cargarla", () => {
		const paso = pasoActual({
			address: "GAAA",
			cavosListo: true,
			nombre: "Elena",
			tienePlata: false,
			abierta: false,
			esSocio: false,
		})
		assert.equal(paso.id, "plata")
		assert.equal(paso.accion, "plata")
		assert.equal(paso.boton, "Cargar plata de prueba")
	})

	it("con nombre y fondo cerrado pide abrirlo", () => {
		const paso = pasoActual({
			address: "GAAA",
			cavosListo: true,
			nombre: "Elena",
			tienePlata: true,
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
			tienePlata: true,
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
			tienePlata: true,
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
			tienePlata: true,
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
