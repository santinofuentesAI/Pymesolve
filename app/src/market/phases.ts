import { type Pool, type PoolStatus } from "./types"

export type PhaseId =
	| "juntar"
	| "firmar"
	| "oficio"
	| "depositar"
	| "carta"
	| "cerrar"

export type Phase = {
	id: PhaseId
	label: string
	hint: string
	done: boolean
	current: boolean
}

const ORDER: PoolStatus[] = [
	"Proposed",
	"Open",
	"Claimed",
	"EscrowReady",
	"Funded",
	"Delivered",
	"Disputed",
	"Released",
	"Resolved",
	"Cancelled",
]

function atLeast(status: PoolStatus, ref: PoolStatus) {
	return ORDER.indexOf(status) >= ORDER.indexOf(ref)
}

export function phasesOf(pool: Pool): Phase[] {
	const n = pool.members.length
	const joined = pool.members.filter((m) => m.joined).length
	const funded = pool.members.filter((m) => m.funded).length
	const s = pool.status
	const closed =
		s === "Released" || s === "Resolved" || s === "Cancelled"

	const current = currentPhase(pool)

	const rows: Omit<Phase, "current">[] = [
		{
			id: "juntar",
			label: "Juntar",
			hint: `${n} comercios`,
			done: true,
		},
		{
			id: "firmar",
			label: "Confirmar",
			hint: `${joined}/${n} dijeron que sí`,
			done: joined >= n && n > 0,
		},
		{
			id: "oficio",
			label: "Oficio",
			hint: pool.dev?.name ?? "busca un oficio",
			done: Boolean(pool.dev_id),
		},
		{
			id: "depositar",
			label: "Depositar",
			hint: `${funded}/${n} en el retén`,
			done: funded >= n && n > 0 && atLeast(s, "Funded"),
		},
		{
			id: "carta",
			label: "Carta",
			hint: pool.letter_hash ? "sellada" : "falta el lunes",
			done: Boolean(pool.letter_hash),
		},
		{
			id: "cerrar",
			label: "Cerrar",
			hint: closed ? statusHint(s) : "mayoría o mesa",
			done: closed,
		},
	]

	return rows.map((row) => ({
		...row,
		current: !closed && row.id === current,
	}))
}

export function currentPhase(pool: Pool): PhaseId {
	const n = pool.members.length
	const joined = pool.members.filter((m) => m.joined).length
	const funded = pool.members.filter((m) => m.funded).length
	const s = pool.status

	switch (s) {
		case "Proposed":
			return joined >= n && n > 0 ? "oficio" : "firmar"
		case "Open":
			return "oficio"
		case "Claimed":
		case "EscrowReady":
			return funded >= n && n > 0 ? "carta" : "depositar"
		case "Funded":
			return pool.letter_hash ? "cerrar" : "carta"
		case "Delivered":
		case "Disputed":
			return "cerrar"
		case "Released":
		case "Resolved":
		case "Cancelled":
			return "cerrar"
		default: {
			const _never: never = s
			return _never
		}
	}
}

function statusHint(status: PoolStatus) {
	switch (status) {
		case "Released":
			return "pagado"
		case "Resolved":
			return "sentenciado"
		case "Cancelled":
			return "cancelado"
		case "Disputed":
			return "en la mesa"
		case "Proposed":
		case "Open":
		case "Claimed":
		case "EscrowReady":
		case "Funded":
		case "Delivered":
			return "abierto"
		default: {
			const _never: never = status
			return _never
		}
	}
}
