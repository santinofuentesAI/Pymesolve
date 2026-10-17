import { actorHeaders } from "./mode"

export type JarName = "sacos" | "flete" | "adelanto"

export type Member = {
	id: string
	name: string
	place: string
	role: "socio" | "tesorera"
	trade: string
	pledged: number
	funded: number
	amount: number
	stain: number
}

export type Move = {
	id: number
	kind: "aporte" | "retiro" | "visto"
	member_id: string
	amount: number
	note: string
	name: string
	created_at: string
}

export type UseLine = {
	id: number
	jar: "sacos" | "flete"
	member_id: string
	member_name: string
	amount: number
	destino: string
	status: "abierto" | "visto"
	witness_name: string | null
}

export type Mesa = {
	fund: { name: string; purpose: string; place: string }
	members: Member[]
	moves: Move[]
	jars: { jar: JarName; amount: number }[]
	seat: { id: string; name: string } | null
	lines: UseLine[]
	saldo: number
	socios: number
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(path, {
		...init,
		headers: {
			"content-type": "application/json",
			...actorHeaders(),
			...(init?.headers ?? {}),
		},
	})
	if (!res.ok) {
		let message = `Error ${res.status}`
		try {
			const body = (await res.json()) as { error?: string }
			if (body.error) message = body.error
		} catch {
			/* vacío */
		}
		throw new Error(message)
	}
	return (await res.json()) as T
}

export const api = {
	mesa: () => req<Mesa>("/api/comunidad"),
	verter: (amount: number, jar: JarName) =>
		req<Mesa>("/api/comunidad/verter", {
			method: "POST",
			body: JSON.stringify({ amount, jar }),
		}),
	adelanto: (amount: number) =>
		req<Mesa>("/api/comunidad/adelanto", {
			method: "POST",
			body: JSON.stringify({ amount }),
		}),
	usar: (jar: "sacos" | "flete", amount: number, destino: string) =>
		req<Mesa>("/api/comunidad/usar", {
			method: "POST",
			body: JSON.stringify({ jar, amount, destino }),
		}),
	vi: (id: number) =>
		req<Mesa>("/api/comunidad/vi", {
			method: "POST",
			body: JSON.stringify({ id }),
		}),
}

export type Persona = { address: string; name: string; place: string }

export type ChainLine = {
	id: number
	jar: "sacos" | "flete"
	asker: string
	amount: number
	destino: string
	status: "apartado" | "visto" | "devuelto"
}

export type Note = { id: number; note: string; created_at: string }

export const nombres = {
	lista: () => req<Persona[]>("/api/comunidad/nombres"),
	guardar: (address: string, name: string, place: string) =>
		req<Persona>("/api/comunidad/nombres", {
			method: "POST",
			body: JSON.stringify({ address, name, place }),
		}),
}

export const libro = {
	lineas: () => req<ChainLine[]>("/api/comunidad/lineas"),
	guardarLinea: (line: Omit<ChainLine, "status"> & { status: ChainLine["status"] }) =>
		req<ChainLine>("/api/comunidad/linea", {
			method: "POST",
			body: JSON.stringify(line),
		}),
	notas: () => req<Note[]>("/api/comunidad/notas"),
	anotar: (note: string) =>
		req<{ note: string }>("/api/comunidad/nota", {
			method: "POST",
			body: JSON.stringify({ note }),
		}),
}

export function jarLabel(jar: JarName) {
	switch (jar) {
		case "sacos":
			return "Sacos"
		case "flete":
			return "Flete"
		case "adelanto":
			return "Adelanto"
		default: {
			const unknown: never = jar
			return unknown
		}
	}
}
