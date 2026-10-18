import { modeHeaders } from "./mode"
import {
	type ChatMessage,
	type DirectMessage,
	type Offer,
	type Pool,
	type Problem,
	type TwinGroup,
	type TwinLook,
	type Liked,
	type Molde,
	type User,
} from "./types"

async function req<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(path, {
		...init,
		headers: {
			"content-type": "application/json",
			...modeHeaders(),
			...(init?.headers ?? {}),
		},
	})
	if (!res.ok) {
		let message = `Error ${res.status}`
		try {
			const body = (await res.json()) as { error?: string }
			if (body.error) message = body.error
		} catch {
			/* empty */
		}
		throw new Error(message)
	}
	return (await res.json()) as T
}

export const api = {
	pymes: () => req<User[]>("/api/pymes"),
	devs: () => req<User[]>("/api/devs"),
	problems: (q = "", category = "") => {
		const p = new URLSearchParams()
		if (q) p.set("q", q)
		if (category) p.set("category", category)
		const s = p.toString()
		return req<Problem[]>(`/api/problems${s ? `?${s}` : ""}`)
	},
	twins: (title: string, body: string, category: string) => {
		const p = new URLSearchParams({ title, body, category })
		return req<TwinLook>(`/api/twins?${p}`)
	},
	user: (id: string) => req<User>(`/api/users/${encodeURIComponent(id)}`),
	saveProfile: (data: {
		id?: string
		kind?: "pyme" | "dev"
		name: string
		trade?: string
		bio?: string
		neighborhood: string
		github?: string
		drive?: string
		social?: string
		linkedin?: string
	}) =>
		req<User>("/api/profile", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	cards: (kind: "pyme" | "dev") =>
		req<{ cards: User[] }>(`/api/cards?kind=${kind}`),
	interest: (targetId: string, kind: "pyme" | "dev") =>
		req<{ ok: boolean }>("/api/interests", {
			method: "POST",
			body: JSON.stringify({ targetId, kind }),
		}),
	liked: () => req<Liked[]>("/api/interests"),
	moldes: (mine = false) =>
		req<Molde[]>(`/api/moldes${mine ? "?mine=1" : ""}`),
	joinMolde: (id: number) =>
		req<{ ok: boolean; waiting: number }>(`/api/moldes/${id}/sumar`, {
			method: "POST",
			body: "{}",
		}),
	openChat: (targetId: string) =>
		req<{ id: number }>("/api/dms", {
			method: "POST",
			body: JSON.stringify({ targetId }),
		}),
	directMessages: (id: number) =>
		req<DirectMessage[]>(`/api/dms/${id}/messages`),
	sendDirect: (id: number, body: string) =>
		req<DirectMessage[]>(`/api/dms/${id}/messages`, {
			method: "POST",
			body: JSON.stringify({ body }),
		}),
	offers: (poolId: number) => req<Offer[]>(`/api/pools/${poolId}/offers`),
	proposeOffer: (poolId: number, amountUsdc: number, note = "") =>
		req<Offer[]>(`/api/pools/${poolId}/offers`, {
			method: "POST",
			body: JSON.stringify({ amountUsdc, note }),
		}),
	acceptOffer: (poolId: number, offerId: number) =>
		req<Pool>(`/api/pools/${poolId}/offers/${offerId}/accept`, {
			method: "POST",
			body: "{}",
		}),
	ledger: () =>
		req<{ at: string; actor_name: string; body: string }[]>("/api/ledger"),
	gemma: () => req<{ ok: boolean; model: string }>("/api/gemma"),
	reset: () =>
		req<{ ok: boolean; pymes: number; oficios: number }>("/api/reset", {
			method: "POST",
			body: "{}",
		}),
	groups: () => req<TwinGroup[]>("/api/groups"),
	postProblem: (data: {
		title: string
		category: string
		body: string
		amountUsdc: number
		chainId?: number
	}) =>
		req<Problem>("/api/problems", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	pools: () => req<Pool[]>("/api/pools"),
	pool: (id: number) => req<Pool>(`/api/pools/${id}`),
	recipes: () => req<Pool[]>("/api/recipes"),
	createPool: (problemIds: number[], summary?: string) =>
		req<Pool>("/api/pools", {
			method: "POST",
			body: JSON.stringify({ problemIds, summary }),
		}),
	patchPool: (id: number, data: Record<string, unknown>) =>
		req<Pool>(`/api/pools/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	join: (id: number) =>
		req<Pool>(`/api/pools/${id}/join`, { method: "POST", body: "{}" }),
	claim: (id: number, wallet?: string) =>
		req<Pool>(`/api/pools/${id}/claim`, {
			method: "POST",
			body: JSON.stringify({ wallet }),
		}),
	messages: (id: number) => req<ChatMessage[]>(`/api/pools/${id}/messages`),
	sendMessage: (id: number, body: string) =>
		req<ChatMessage[]>(`/api/pools/${id}/messages`, {
			method: "POST",
			body: JSON.stringify({ body }),
		}),
	deliver: (
		id: number,
		data: {
			kind: "plan" | "delivery"
			url: string
			explanation: string
			letter?: string
			letterHash?: string
		},
	) =>
		req<Pool>(`/api/pools/${id}/deliver`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	fund: (id: number) =>
		req<Pool>(`/api/pools/${id}/fund`, { method: "POST", body: "{}" }),
	vote: (id: number, accept: boolean) =>
		req<Pool>(`/api/pools/${id}/vote`, {
			method: "POST",
			body: JSON.stringify({ accept }),
		}),
	summon: (id: number, reason: string) =>
		req<{ summonId: number; pool: Pool }>(`/api/pools/${id}/summon`, {
			method: "POST",
			body: JSON.stringify({ reason }),
		}),
	summons: () =>
		req<
			{
				id: number
				pool_id: number
				title: string
				committed_usdc: number
				caller_name: string
				reason: string
				created_at: string
			}[]
		>("/api/summons"),
	summonCase: (id: number) =>
		req<{
			summon: {
				id: number
				pool_id: number
				caller_id: string
				reason: string
			}
			brief: {
				body: string
				suggested_dev: number
				suggested_refund: number
			} | null
			pool: Pool
			messages: ChatMessage[]
		}>(`/api/summons/${id}`),
	verdict: (id: number, devAmount: number, refundAmount: number) =>
		req<Pool>(`/api/summons/${id}/verdict`, {
			method: "POST",
			body: JSON.stringify({ devAmount, refundAmount }),
		}),
	saveDev: (data: {
		id?: string
		name: string
		trade: string
		bio: string
		github?: string
		drive?: string
		social?: string
	}) => req<User>("/api/devs", { method: "POST", body: JSON.stringify(data) }),
	altas: () =>
		req<
			{
				id: number
				user_id: string
				kind: string
				url: string
				name: string
				trade: string
			}[]
		>("/api/altas"),
	reviewProof: (id: number, status: "aprobado" | "rechazado") =>
		req<{ ok: boolean }>(`/api/proofs/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ status }),
		}),
	eco: (id: number, note: string) =>
		req<{ ok: boolean }>(`/api/recipes/${id}/eco`, {
			method: "POST",
			body: JSON.stringify({ note }),
		}),
	github: (user: string) =>
		req<{
			login: string
			name: string | null
			publicRepos: number
			createdAt: string
			htmlUrl: string
			repos: { name: string; htmlUrl: string; updatedAt: string }[]
		}>(`/api/github/${encodeURIComponent(user)}`),
}
