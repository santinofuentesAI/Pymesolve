export type PasoId =
	| "entrar"
	| "nombre"
	| "plata"
	| "abrir"
	| "unirse"
	| "listo"

export type Paso = {
	id: PasoId
	texto: string
	accion: "entrar" | "plata" | "ajustes" | "ninguna"
	boton: string
}

export function pasoActual(input: {
	address: string | undefined
	cavosListo: boolean
	nombre: string | undefined
	tienePlata: boolean
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
	if (!input.tienePlata) {
		return {
			id: "plata",
			texto:
				"Falta plata en tu cuenta. Se carga una vez y después ya podés poner en el fondo.",
			accion: "plata",
			boton: "Cargar plata de prueba",
		}
	}
	if (!input.abierta) {
		return {
			id: "abrir",
			texto:
				"Falta abrir el fondo una sola vez. Ahí se dice quién puede pedir el adelanto.",
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
