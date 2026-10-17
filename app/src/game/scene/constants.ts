// DeFiesta — shared constants for the board scene.
import * as THREE from "three"

/** Neon accents: magenta, cyan, purple, pink, electric blue. */
export const NEON = [
	"#ff2bd6",
	"#00e5ff",
	"#7a2bff",
	"#ff5c9a",
	"#2b6bff",
] as const

export const BG_COLOR = "#07071c"
export const FOG_COLOR = "#12122a"

/** Asphalt top, then the colored slab that sits on the street. */
export const STREET_TOP = 0.09
export const TILE_H = 0.26
export const TILE_Y = STREET_TOP + TILE_H / 2
export const TILE_TOP = STREET_TOP + TILE_H

/** Capsule center. The token's feet rest on the slab. */
export const TOKEN_BASE_Y = TILE_TOP + 0.34

/** Dice-block center, above the token origin (Mario Party lift). */
export const DICE_LIFT = 1.6

/** Overview frames the whole snake (x -8..8, z -5..5) with a little air. */
export const CAMERA_POSITION: [number, number, number] = [0, 15.5, 12.4]
export const CAMERA_TARGET: [number, number, number] = [0, 0.2, -0.2]

/** Close 3/4 shot, added to the token's resting position. */
export const CLOSE_OFFSET: [number, number, number] = [2.4, 2.6, 3.2]
export const HEAD_LIFT = 0.32

/** Wall-clock dice beat. Must stay inside the store's 2400 ms rolling phase. */
export const DICE_CAM_IN_MS = 400
export const DICE_JUMP_START_MS = 400
export const DICE_JUMP_END_MS = 900
export const DICE_IMPACT_MS = 650
export const DICE_SPIN_UNTIL_MS = 1900
export const DICE_ROLL_MS = 2400
export const DICE_JUMP_HEIGHT = 1.1
export const DICE_LINGER_MS = 420

export function smoothstep(t: number): number {
	const x = Math.min(1, Math.max(0, t))
	return x * x * (3 - 2 * x)
}

/** 0 at rest, peaks at DICE_JUMP_HEIGHT halfway through the jump window. */
export function rollJump(elapsedMs: number | null): number {
	if (elapsedMs === null) return 0
	const span = DICE_JUMP_END_MS - DICE_JUMP_START_MS
	const t = (elapsedMs - DICE_JUMP_START_MS) / span
	if (t <= 0 || t >= 1) return 0
	return Math.sin(t * Math.PI) * DICE_JUMP_HEIGHT
}

/** 0 overview → 1 close-up → 0 again as the face settles. */
export function cameraCloseWeight(elapsedMs: number | null): number {
	if (elapsedMs === null) return 0
	if (elapsedMs < DICE_CAM_IN_MS) return smoothstep(elapsedMs / DICE_CAM_IN_MS)
	if (elapsedMs < DICE_SPIN_UNTIL_MS) return 1
	const span = DICE_ROLL_MS - DICE_SPIN_UNTIL_MS
	return 1 - smoothstep((elapsedMs - DICE_SPIN_UNTIL_MS) / span)
}

let rolling = false
let startedAt = 0
let endedAt = 0
let generation = 0

export interface RollClock {
	elapsed: number | null
	linger: boolean
	generation: number
}

/**
 * Call once per frame from every reader. The first caller in a frame latches
 * the timestamp; later callers in the same frame see the same clock.
 */
export function syncRoll(phase: string | undefined, now: number): RollClock {
	const isRolling = phase === "rolling"
	if (isRolling && !rolling) {
		startedAt = now
		endedAt = 0
		generation += 1
	} else if (!isRolling && rolling) {
		endedAt = now
		startedAt = 0
	}
	rolling = isRolling
	if (rolling) {
		return { elapsed: now - startedAt, linger: false, generation }
	}
	const linger = endedAt > 0 && now - endedAt < DICE_LINGER_MS
	return { elapsed: null, linger, generation }
}

/** Deterministic PRNG so the city is identical on every render. */
export function mulberry32(seed: number): () => number {
	let a = seed
	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export function neonAt(index: number): string {
	return NEON[index] ?? "#ff2bd6"
}

/** Push a box so its center lands on `at` after a Y rotation (segment heading). */
export function orientedBox(
	width: number,
	height: number,
	depth: number,
	localX: number,
	y: number,
	angle: number,
	at: THREE.Vector3,
): THREE.BufferGeometry {
	const geometry = new THREE.BoxGeometry(width, height, depth)
	geometry.translate(localX, y, 0)
	geometry.rotateY(angle)
	geometry.translate(at.x, 0, at.z)
	return geometry
}
