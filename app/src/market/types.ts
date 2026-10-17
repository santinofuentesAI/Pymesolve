export type Role = "pyme" | "dev" | "admin"

export type PoolStatus =
	| "Proposed"
	| "Open"
	| "Claimed"
	| "EscrowReady"
	| "Funded"
	| "Delivered"
	| "Disputed"
	| "Released"
	| "Resolved"
	| "Cancelled"

export type User = {
	id: string
	kind: Role
	name: string
	trade: string
	bio: string
	neighborhood: string
	verified: number
	wallet: string | null
	github: string | null
	drive: string | null
	social: string | null
	linkedin: string | null
	demo: number
	bullets?: string[]
	pedido?: { title: string; body: string; category: string }
}

export type Problem = {
	id: number
	pymeId: string
	pymeName: string
	neighborhood: string
	title: string
	category: string
	body: string
	amountUsdc: number
	chainId: number | null
	poolId: number | null
	createdAt: string
	score?: number
}

export type Member = {
	pool_id: number
	pyme_id: string
	joined: number
	amount_usdc: number
	funded: number
	vote: number | null
	name: string
	neighborhood: string
	trade: string
}

export type Delivery = {
	id: number
	pool_id: number
	kind: "plan" | "delivery"
	url: string
	explanation: string
	created_at: string
}

export type Pool = {
	id: number
	title: string
	category: string
	summary: string
	status: PoolStatus
	chain_id: number | null
	escrow: string | null
	dev_id: string | null
	committed_usdc: number
	letter: string | null
	letter_hash: string | null
	created_at: string
	members: Member[]
	problems?: Problem[]
	deliveries?: Delivery[]
	dev?: User | null
	ecos?: { pyme_id: string; pyme_name: string; note: string }[]
	summon?: {
		id: number
		pool_id: number
		caller_id: string
		reason: string
		status: string
		created_at: string
	} | null
	offers?: Offer[]
	brief?: {
		lede: string
		puntos: string[]
		ia: boolean
	}
}

export type ChatMessage = {
	id: number
	pool_id: number
	actor_id: string
	actor_name: string
	role: Role
	kind: "chat" | "system"
	body: string
	created_at: string
}

export type Offer = {
	id: number
	pool_id: number
	actor_id: string
	actor_name?: string
	role: Role
	amount_usdc: number
	status: "open" | "accepted" | "rejected"
	note: string
	created_at: string
}

export type TwinLook = {
	twins: Problem[]
	summary: string
	amountUsdc: number
}

export type TwinGroup = {
	category: string
	problemIds: number[]
	names: string[]
	amountUsdc: number
	summary: string
}

export function statusLabel(status: PoolStatus): string {
	switch (status) {
		case "Proposed":
			return "Esperando firmas"
		case "Open":
			return "Busca un dev"
		case "Claimed":
			return "Tomado"
		case "EscrowReady":
			return "Listo para aportar"
		case "Funded":
			return "USDC retenido"
		case "Delivered":
			return "Aceptado"
		case "Disputed":
			return "En la mesa"
		case "Released":
			return "Pagado"
		case "Resolved":
			return "Sentenciado"
		case "Cancelled":
			return "Cancelado"
		default: {
			const _never: never = status
			return _never
		}
	}
}
