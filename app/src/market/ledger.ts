import { fundedUsdc } from "./money"
import { type Member, type Pool, type PoolStatus } from "./types"

export type Stamp = {
	id: string
	title: string
	detail: string
	done: boolean
}

export function stampsOf(pool: Pool): Stamp[] {
	const joined = pool.members.filter((m) => m.joined).length
	const funded = pool.members.filter((m) => m.funded).length
	const s = pool.status
	const after = (...xs: PoolStatus[]) =>
		xs.includes(s) || laterThan(s, xs.at(-1)!)
	return [
		{
			id: "open",
			title: "Se juntaron",
			detail: pool.summary,
			done: true,
		},
		{
			id: "sign",
			title: "Firmas del barrio",
			detail: `${joined} de ${pool.members.length} ya entraron`,
			done: joined > 0,
		},
		{
			id: "dev",
			title: "Hay oficio",
			detail: pool.dev?.name ?? "Todavía busca un dev",
			done: Boolean(pool.dev_id),
		},
		{
			id: "coins",
			title: "Monedas en el retén",
			detail: `${fundedUsdc(pool.members)} de ${pool.committed_usdc} USDC · ${funded} depósitos`,
			done: funded > 0,
		},
		{
			id: "letter",
			title: "Carta sellada",
			detail: pool.letter_hash
				? `sello ${pool.letter_hash.slice(0, 8)}`
				: "Falta la carta al mostrador",
			done: Boolean(pool.letter_hash),
		},
		{
			id: "close",
			title: closeTitle(s),
			detail: closeDetail(s, pool.members),
			done: after("Delivered", "Released", "Resolved", "Disputed"),
		},
	]
}

function laterThan(status: PoolStatus, ref: PoolStatus): boolean {
	const order: PoolStatus[] = [
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
	return order.indexOf(status) > order.indexOf(ref)
}

function closeTitle(status: PoolStatus): string {
	switch (status) {
		case "Disputed":
			return "En la mesa"
		case "Resolved":
			return "Veredicto"
		case "Released":
			return "Pagado"
		case "Cancelled":
			return "Cancelado"
		case "Proposed":
		case "Open":
		case "Claimed":
		case "EscrowReady":
		case "Funded":
		case "Delivered":
			return "Cierre"
		default: {
			const _never: never = status
			return _never
		}
	}
}

function closeDetail(status: PoolStatus, members: Member[]): string {
	const yes = members.filter((m) => m.vote === 1).length
	if (status === "Delivered" || status === "Released") {
		return `Mayoría: ${yes} de ${members.length}`
	}
	if (status === "Disputed" || status === "Resolved") {
		return "El asistente entra solo porque lo llamaron"
	}
	return "Falta la mayoría o el veredicto"
}

export function inkOf(id: string): "copper" | "book" | "ink" | "lacquer" {
	if (id.startsWith("admin")) return "lacquer"
	if (id.startsWith("dev")) return "book"
	let n = 0
	for (const c of id) n += c.charCodeAt(0)
	const rest = n % 3
	if (rest === 0) return "copper"
	if (rest === 1) return "book"
	return "ink"
}

export function speak(text: string) {
	if (typeof window === "undefined" || !window.speechSynthesis) return
	window.speechSynthesis.cancel()
	const u = new SpeechSynthesisUtterance(text)
	u.lang = "es-AR"
	u.rate = 0.95
	window.speechSynthesis.speak(u)
}
