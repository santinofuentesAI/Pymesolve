import { type Member, type Pool } from "./types"

export function formatUsdc(n: number) {
	if (Number.isInteger(n)) return `${n}`
	return n.toFixed(2).replace(/\.00$/, "")
}

export function fundedUsdc(members: Member[]) {
	return members
		.filter((m) => m.funded)
		.reduce((sum, m) => sum + m.amount_usdc, 0)
}

export function pledgedUsdc(members: Member[]) {
	return members.reduce((sum, m) => sum + m.amount_usdc, 0)
}

export function splitMilestones(total: number) {
	const safe = Math.max(Math.round(total * 100) / 100, 1)
	const plan = Math.round(safe * 0.2 * 100) / 100
	const delivery = Math.round((safe - plan) * 100) / 100
	return { plan, delivery, total: safe }
}

export function padFolio(id: number) {
	return String(id).padStart(4, "0")
}

export function goalOf(pool: Pool) {
	const pledged = pledgedUsdc(pool.members)
	return pledged > 0 ? pledged : pool.committed_usdc
}
