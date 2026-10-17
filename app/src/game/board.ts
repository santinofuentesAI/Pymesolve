// DeFiesta — board definition (one creative crypto/web3/AI themed map).
// Positions are computed on a ring so the whole thing is a single looped track.

export type SpaceType =
	| "start"
	| "airdrop"
	| "gas"
	| "hack"
	| "bull"
	| "bear"
	| "minigame"
	| "auction"
	| "oracle"
	| "nft"

export interface Space {
	index: number
	type: SpaceType
	x: number
	z: number
}

export interface SpaceMeta {
	label: string
	color: string
	emoji: string
	/** One-line gag/explanation shown in the HUD when you land. */
	blurb: string
}

export const SPACE_META: Record<SpaceType, SpaceMeta> = {
	start: {
		label: "GO",
		color: "#ffd24d",
		emoji: "🏁",
		blurb: "GM! Vuelta completa: +2 monedas de airdrop por pasar.",
	},
	airdrop: {
		label: "AIR",
		color: "#8aff80",
		emoji: "🪂",
		blurb: "¡Airdrop sorpresa! +5 monedas caen del cielo.",
	},
	gas: {
		label: "GAS",
		color: "#ff9f45",
		emoji: "⛽",
		blurb: "Gas fees por las nubes: -3 monedas.",
	},
	hack: {
		label: "HACK",
		color: "#ff4d6d",
		emoji: "💀",
		blurb: "¡Te hackearon el bridge! -8 monedas. Not your keys…",
	},
	bull: {
		label: "BULL",
		color: "#38e0c4",
		emoji: "🚀",
		blurb: "Bull market: number go up. +4 monedas.",
	},
	bear: {
		label: "BEAR",
		color: "#a98bff",
		emoji: "🐻",
		blurb: "Bear market: todo en rojo. -4 monedas.",
	},
	minigame: {
		label: "MINI",
		color: "#4db5ff",
		emoji: "🎮",
		blurb: "Casilla de minijuego (llega en la Fase 2).",
	},
	auction: {
		label: "BID",
		color: "#ff6fd8",
		emoji: "🔨",
		blurb: "Casa de subastas: pujas por mejoras (Fase 3).",
	},
	oracle: {
		label: "AI",
		color: "#55d6ff",
		emoji: "🤖",
		blurb: "El oráculo IA decide tu suerte: evento aleatorio.",
	},
	nft: {
		label: "NFT",
		color: "#ff5ce1",
		emoji: "🖼️",
		blurb: "Compras un JPEG carísimo: -2 monedas (right-click save).",
	},
}

// The creative order of the single map (Mario-Party style): one winding lap that
// mixes coin gains, losses, events, shops and minigames.
const LAYOUT: SpaceType[] = [
	"start",
	"airdrop",
	"bull",
	"gas",
	"minigame",
	"oracle",
	"airdrop",
	"nft",
	"bear",
	"bull",
	"minigame",
	"gas",
	"oracle",
	"airdrop",
	"hack",
	"bull",
	"minigame",
	"auction",
	"gas",
	"airdrop",
	"oracle",
	"bear",
	"nft",
	"minigame",
]

// Hand-authored snake, like a Mario Party board: streets that fold back on
// themselves through the city, with the plaza (0, 0) left open for the Star.
// Spacing stays near 2.8 so the tiles read as one connected track.
const POINTS: Array<[number, number]> = [
	[-4.5, 4.5],
	[-1.5, 4.5],
	[1.5, 4.5],
	[4.5, 4.5],
	[7.5, 4.5],
	[7.5, 1.5],
	[4.5, 1.5],
	[1.5, 1.5],
	[-1.5, 1.5],
	[-4.5, 1.5],
	[-4.5, -1.5],
	[-1.5, -1.5],
	[1.5, -1.5],
	[4.5, -1.5],
	[7.5, -1.5],
	[7.5, -4.5],
	[4.5, -4.5],
	[1.5, -4.5],
	[-1.5, -4.5],
	[-4.5, -4.5],
	[-7.5, -4.5],
	[-7.5, -1.5],
	[-7.5, 1.5],
	[-7.5, 4.5],
]

export const BOARD: Space[] = LAYOUT.map((type, index) => {
	const point = POINTS[index] ?? POINTS[0] ?? [0, 0]
	return {
		index,
		type,
		x: point[0],
		z: point[1],
	}
})

export const BOARD_LENGTH = BOARD.length

/** Unit travel direction (x,z) from space `index` to the next space. */
export function directionAt(index: number): { x: number; z: number } {
	const a = BOARD[index % BOARD_LENGTH] ?? BOARD[0]
	const b = BOARD[(index + 1) % BOARD_LENGTH] ?? BOARD[0]
	if (!a || !b) return { x: 1, z: 0 }
	const dx = b.x - a.x
	const dz = b.z - a.z
	const len = Math.hypot(dx, dz) || 1
	return { x: dx / len, z: dz / len }
}
