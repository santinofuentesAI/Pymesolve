// DeFiesta — city blocks tucked between the snake's streets.
// Rows of the board sit 3 units apart, so each block is a shallow lot:
// buildings hug the curb and stay out of the tile corridors (the camera
// looks down those corridors). The courtyard around (0, 0) is stalls, not towers.
import { BOARD } from "../board"
import { mulberry32, neonAt } from "./constants"

export interface Building {
	x: number
	z: number
	w: number
	d: number
	h: number
	/** index into NEON */
	color: number
	/** window-texture offsets, in cells (0..7) */
	cellU: number
	cellV: number
}

export interface SignData {
	x: number
	y: number
	z: number
	yaw: number
	width: number
	height: number
	text: string
	color: string
	fontSize: number
}

export interface Stall {
	x: number
	z: number
	yaw: number
	color: number
}

export interface CityData {
	buildings: Building[]
	signs: SignData[]
	stalls: Stall[]
}

interface Spec {
	x: number
	z: number
	w: number
	d: number
	h: number
	color: number
}

// Hand-placed lots. Heights stay in the 2–9 band; near-side (positive z)
// blocks are the short ones so they don't wall off the closest street.
const SPECS: Spec[] = [
	// Lots sit on the columns the dice-camera ray misses, so a close-up
	// never looks through a tower. Right-hand lots stay short: the overview
	// camera is south of them and a tall box there would cover a tile.
	{ x: -4.85, z: 3, w: 0.9, d: 0.8, h: 4.6, color: 0 },
	{ x: -1.85, z: 3, w: 0.9, d: 0.8, h: 9, color: 1 },
	{ x: 1.15, z: 3, w: 0.85, d: 0.8, h: 2.2, color: 2 },
	{ x: -4.85, z: -3, w: 0.9, d: 0.8, h: 6.5, color: 3 },
	{ x: -1.85, z: -3, w: 0.9, d: 0.8, h: 6.2, color: 0 },
	// Skyline just past the south street. Nothing on the board sits behind it.
	{ x: -6.3, z: -6.2, w: 1.2, d: 1, h: 5, color: 4 },
	{ x: -3.5, z: -6.15, w: 1.35, d: 1.05, h: 5.6, color: 2 },
	{ x: -0.7, z: -6.15, w: 1.3, d: 1.05, h: 5.2, color: 3 },
	{ x: 2.2, z: -6.15, w: 1.4, d: 1.05, h: 5.5, color: 0 },
	{ x: 5.1, z: -6.2, w: 1.25, d: 1, h: 5.3, color: 1 },
	// West of the return avenue.
	{ x: -9.25, z: 2.4, w: 1, d: 1.1, h: 3.6, color: 2 },
	{ x: -9.3, z: -0.5, w: 1, d: 1.3, h: 5.8, color: 3 },
	{ x: -9.2, z: -3.3, w: 1.05, d: 1.1, h: 6.2, color: 1 },
	// Low shops on the near side and the east curb.
	{ x: -4.85, z: 6.15, w: 0.85, d: 0.7, h: 2.2, color: 0 },
	{ x: -1.85, z: 6.15, w: 0.85, d: 0.7, h: 2.4, color: 1 },
	{ x: 4.15, z: 6.15, w: 0.8, d: 0.7, h: 2.1, color: 4 },
	{ x: 9.55, z: 1.4, w: 0.85, d: 1.3, h: 1.7, color: 1 },
	{ x: 9.55, z: -2.2, w: 0.85, d: 1.4, h: 1.8, color: 0 },
]

const STALLS: Stall[] = [
	{ x: -3, z: 0, yaw: 0.15, color: 0 },
	{ x: 3, z: 0, yaw: -0.1, color: 1 },
	{ x: 5.9, z: 0.05, yaw: 0.4, color: 3 },
	{ x: -5.9, z: 0.05, yaw: -0.35, color: 4 },
]

export function generateCity(): CityData {
	const rng = mulberry32(2077)
	const buildings: Building[] = SPECS.map((spec) => ({
		...spec,
		cellU: Math.floor(rng() * 8),
		cellV: Math.floor(rng() * 8),
	}))

	const hodl = buildings.find((b) => b.x === -1.85 && b.z === 3)
	const wagmi = buildings.find((b) => b.x === -1.85 && b.z === -3)
	const signs: SignData[] = []
	if (hodl) {
		signs.push({
			x: hodl.x,
			y: hodl.h + 0.42,
			z: hodl.z,
			yaw: 0,
			width: 1.35,
			height: 0.46,
			text: "HODL",
			color: neonAt(hodl.color + 1),
			fontSize: 0.24,
		})
	}
	if (wagmi) {
		signs.push({
			x: wagmi.x,
			y: wagmi.h + 0.42,
			z: wagmi.z,
			yaw: 0,
			width: 1.55,
			height: 0.46,
			text: "WAGMI",
			color: neonAt(wagmi.color + 1),
			fontSize: 0.22,
		})
	}

	return { buildings, signs, stalls: STALLS }
}

/** Distance from a footprint's edge to the nearest track centerline. */
export function trackClearance(
	x: number,
	z: number,
	w: number,
	d: number,
): number {
	const minX = x - w / 2
	const maxX = x + w / 2
	const minZ = z - d / 2
	const maxZ = z + d / 2
	let best = Infinity
	for (let i = 0; i < BOARD.length; i++) {
		const a = BOARD[i]
		const b = BOARD[(i + 1) % BOARD.length]
		if (!a || !b) continue
		if (a.z === b.z) {
			const lo = Math.min(a.x, b.x)
			const hi = Math.max(a.x, b.x)
			const overlaps = maxX >= lo && minX <= hi
			const gapX = overlaps ? 0 : minX > hi ? minX - hi : lo - maxX
			const gapZ = a.z < minZ ? minZ - a.z : a.z > maxZ ? a.z - maxZ : 0
			best = Math.min(best, Math.hypot(gapX, gapZ))
		} else {
			const lo = Math.min(a.z, b.z)
			const hi = Math.max(a.z, b.z)
			const overlaps = maxZ >= lo && minZ <= hi
			const gapZ = overlaps ? 0 : minZ > hi ? minZ - hi : lo - maxZ
			const gapX = a.x < minX ? minX - a.x : a.x > maxX ? a.x - maxX : 0
			best = Math.min(best, Math.hypot(gapX, gapZ))
		}
	}
	return best
}
