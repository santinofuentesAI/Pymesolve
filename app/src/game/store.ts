// DeFiesta — central game state (zustand) + the turn controller.
// This is the single source of truth every screen and the 3D scene read from.
import { useEffect } from "react"
import { create } from "zustand"
import { BOARD, BOARD_LENGTH, SPACE_META } from "./board"

export type Screen =
	| "menu"
	| "mode"
	| "setup"
	| "settings"
	| "credits"
	| "board"
	| "minigame"
	| "results"

/** free = fake coins. bet_* = real USDC (wired in Fase 4). */
export type GameMode = "free" | "bet_standard" | "bet_custom"

export type CpuSpeed = "chill" | "normal" | "fast"

export type Phase =
	| "awaitRoll" // human turn: waiting for the roll input
	| "cpuRoll" // cpu turn: will auto-roll
	| "rolling" // dice is tumbling
	| "stepping" // token is hopping space by space
	| "landing" // landed: effect applied, showing the event
	| "turnEnd"
	| "minigame"
	| "gameover"

export interface Player {
	id: string
	name: string
	isCPU: boolean
	color: string
	coins: number
	/** index into BOARD */
	position: number
}

export interface GameEvent {
	playerId: string
	text: string
	emoji: string
	delta: number
}

export interface Match {
	players: Player[]
	current: number
	round: number
	totalRounds: number
	phase: Phase
	dice: number | null
	stepsRemaining: number
	lastEvent: GameEvent | null
}

export interface Settings {
	sound: boolean
	cpuSpeed: CpuSpeed
	rounds: number
}

export type MiniId = "race" | "boxing"
export type MiniStage = "travel" | "tutorial" | "play" | "award"

export interface MiniGame {
	id: MiniId
	stage: MiniStage
	scores: number[]
	/** Bumps on each button press so the 3D scene can play a lunge or step. */
	impulse: number[]
	winnerIds: string[]
	prize: number
}

const MINI_ORDER: MiniId[] = ["race", "boxing"]

function miniForRound(round: number): MiniGame {
	const id = MINI_ORDER[(round - 1) % MINI_ORDER.length] ?? "race"
	return {
		id,
		stage: "travel",
		scores: id === "boxing" ? [100, 100, 100, 100] : [0, 0, 0, 0],
		impulse: [0, 0, 0, 0],
		winnerIds: [],
		prize: 10,
	}
}

interface GameState {
	screen: Screen
	mode: GameMode
	settings: Settings
	/** how many of the 4 seats are humans (1-4), chosen on the setup screen */
	pendingHumans: number
	match: Match | null
	mini: MiniGame | null
	winnerId: string | null

	navigate: (screen: Screen) => void
	setMode: (mode: GameMode) => void
	updateSettings: (patch: Partial<Settings>) => void
	setPendingHumans: (n: number) => void
	startFreeMatch: () => void
	rematch: () => void
	resetToMenu: () => void

	// turn machine (driven by useTurnController)
	rollDice: () => void
	setPhase: (phase: Phase) => void
	stepOnce: () => void
	land: () => void
	nextTurn: () => void

	setMiniStage: (stage: MiniStage) => void
	act: (seat: number) => void
	awardMini: () => void
	continueAfterMini: () => void
}

export const PLAYER_COLORS = ["#ff4d6d", "#4db5ff", "#ffd24d", "#8aff80"]
const CPU_NAMES = ["SatoshiBot", "VitalikAI", "DegenGPT", "HODLer9000"]

const START_COINS = 10

function effectFor(type: (typeof BOARD)[number]["type"]): number {
	switch (type) {
		case "airdrop":
			return 5
		case "gas":
			return -3
		case "hack":
			return -8
		case "bull":
			return 4
		case "bear":
			return -4
		case "nft":
			return -2
		case "oracle":
			return Math.floor(Math.random() * 12) - 5 // -5..+6
		case "start":
		case "minigame":
		case "auction":
			return 0
	}
}

export interface Timings {
	cpu: number
	roll: number
	step: number
	land: number
	turn: number
}

export function timings(speed: CpuSpeed): Timings {
	const k = speed === "fast" ? 0.6 : speed === "chill" ? 1.5 : 1
	return {
		cpu: Math.round(700 * k),
		roll: 2400,
		step: Math.round(330 * k),
		land: 1500,
		turn: 450,
	}
}

export const useGameStore = create<GameState>((set, get) => ({
	screen: "menu",
	mode: "free",
	settings: { sound: true, cpuSpeed: "normal", rounds: 5 },
	pendingHumans: 1,
	match: null,
	mini: null,
	winnerId: null,

	navigate: (screen) => set({ screen }),
	setMode: (mode) => set({ mode }),
	updateSettings: (patch) =>
		set((s) => ({ settings: { ...s.settings, ...patch } })),
	setPendingHumans: (n) => set({ pendingHumans: Math.min(4, Math.max(1, n)) }),

	startFreeMatch: () =>
		set((s) => {
			const humans = s.pendingHumans
			const players: Player[] = []
			for (let i = 0; i < 4; i++) {
				const isCPU = i >= humans
				players.push({
					id: `p${i}`,
					name: isCPU ? (CPU_NAMES[i] ?? "CPU") : `Jugador ${i + 1}`,
					isCPU,
					color: PLAYER_COLORS[i] ?? "#ffffff",
					coins: START_COINS,
					position: 0,
				})
			}
			return {
				mode: "free",
				screen: "board",
				winnerId: null,
				mini: null,
				match: {
					players,
					current: 0,
					round: 1,
					totalRounds: s.settings.rounds,
					phase: players[0]?.isCPU ? "cpuRoll" : "awaitRoll",
					dice: null,
					stepsRemaining: 0,
					lastEvent: null,
				},
			}
		}),

	rematch: () => get().startFreeMatch(),
	resetToMenu: () =>
		set({ screen: "menu", match: null, mini: null, winnerId: null }),

	rollDice: () =>
		set((s) => {
			if (!s.match) return s
			const dice = 1 + Math.floor(Math.random() * 6)
			return {
				match: { ...s.match, dice, stepsRemaining: dice, phase: "rolling" },
			}
		}),

	setPhase: (phase) =>
		set((s) => (s.match ? { match: { ...s.match, phase } } : s)),

	stepOnce: () =>
		set((s) => {
			const m = s.match
			if (!m) return s
			const p = m.players[m.current]
			if (!p) return s
			const position = (p.position + 1) % BOARD_LENGTH
			const passedGo = position === 0
			const players = m.players.map((pl, i) =>
				i === m.current
					? { ...pl, position, coins: pl.coins + (passedGo ? 2 : 0) }
					: pl,
			)
			const stepsRemaining = m.stepsRemaining - 1
			const phase: Phase = stepsRemaining <= 0 ? "landing" : "stepping"
			return { match: { ...m, players, stepsRemaining, phase } }
		}),

	land: () =>
		set((s) => {
			const m = s.match
			if (!m) return s
			const p = m.players[m.current]
			if (!p) return s
			const space = BOARD[p.position]
			if (!space) return s
			const meta = SPACE_META[space.type]
			const delta = effectFor(space.type)
			const players = m.players.map((pl, i) =>
				i === m.current
					? { ...pl, coins: Math.max(0, pl.coins + delta) }
					: pl,
			)
			const lastEvent: GameEvent = {
				playerId: p.id,
				text: meta.blurb,
				emoji: meta.emoji,
				delta,
			}
			return { match: { ...m, players, lastEvent } }
		}),

	nextTurn: () =>
		set((s) => {
			const m = s.match
			if (!m) return s
			const current = (m.current + 1) % m.players.length
			// A round ends when all four players have rolled and moved.
			if (current === 0) {
				return {
					screen: "minigame",
					mini: miniForRound(m.round),
					match: {
						...m,
						phase: "minigame",
						dice: null,
						lastEvent: null,
					},
				}
			}
			const phase: Phase = m.players[current]?.isCPU ? "cpuRoll" : "awaitRoll"
			return {
				match: { ...m, current, phase, dice: null, lastEvent: null },
			}
		}),

	setMiniStage: (stage) =>
		set((s) => (s.mini ? { mini: { ...s.mini, stage } } : s)),

	act: (seat) =>
		set((s) => {
			const mini = s.mini
			const players = s.match?.players
			if (!mini || !players || mini.stage !== "play") return s
			if (seat < 0 || seat >= players.length) return s
			const impulse = mini.impulse.map((count, index) =>
				index === seat ? count + 1 : count,
			)
			if (mini.id === "race") {
				if (mini.scores.some((score) => score >= 100)) return s
				const scores = mini.scores.map((score, index) =>
					index === seat ? Math.min(100, score + 6) : score,
				)
				return { mini: { ...mini, scores, impulse } }
			}
			if (mini.id === "boxing") {
				const alive = mini.scores.filter((health) => health > 0).length
				if (alive <= 1) return s
				const own = mini.scores[seat] ?? 0
				if (own <= 0) return s
				let target = -1
				let highest = 0
				mini.scores.forEach((health, index) => {
					if (index !== seat && health > highest) {
						highest = health
						target = index
					}
				})
				if (target < 0) return { mini: { ...mini, impulse } }
				const scores = mini.scores.map((health, index) =>
					index === target ? Math.max(0, health - 14) : health,
				)
				return { mini: { ...mini, scores, impulse } }
			}
			const unreachable: never = mini.id
			return unreachable
		}),

	awardMini: () =>
		set((s) => {
			const mini = s.mini
			const m = s.match
			if (!mini || !m || mini.stage !== "play") return s
			const best = mini.scores.reduce(
				(max, score) => Math.max(max, score),
				0,
			)
			const winnerIds = m.players
				.filter((_, index) => (mini.scores[index] ?? 0) === best)
				.map((player) => player.id)
			return { mini: { ...mini, stage: "award", winnerIds } }
		}),

	continueAfterMini: () =>
		set((s) => {
			const m = s.match
			const mini = s.mini
			if (!m || !mini) return s
			const players = m.players.map((player) =>
				mini.winnerIds.includes(player.id)
					? { ...player, coins: player.coins + mini.prize }
					: player,
			)
			if (m.round >= m.totalRounds) {
				const winner = [...players].sort((a, b) => b.coins - a.coins)[0]
				return {
					mini: null,
					winnerId: winner ? winner.id : null,
					screen: "results",
					match: {
						...m,
						players,
						phase: "gameover",
						dice: null,
						lastEvent: null,
					},
				}
			}
			return {
				mini: null,
				screen: "board",
				match: {
					...m,
					players,
					round: m.round + 1,
					current: 0,
					phase: players[0]?.isCPU ? "cpuRoll" : "awaitRoll",
					dice: null,
					lastEvent: null,
				},
			}
		}),
}))

/**
 * Drives the turn state machine with timers. Mount it once on the board screen.
 * Human turns ("awaitRoll") wait for the roll input, fired from the board UI.
 */
export function useTurnController() {
	const phase = useGameStore((s) => s.match?.phase)
	const steps = useGameStore((s) => s.match?.stepsRemaining)
	const current = useGameStore((s) => s.match?.current)
	const speed = useGameStore((s) => s.settings.cpuSpeed)

	useEffect(() => {
		if (!phase) return
		const t = timings(speed)
		let id: number | undefined
		switch (phase) {
			case "cpuRoll":
				id = window.setTimeout(() => useGameStore.getState().rollDice(), t.cpu)
				break
			case "rolling":
				id = window.setTimeout(
					() => useGameStore.getState().setPhase("stepping"),
					t.roll,
				)
				break
			case "stepping":
				id = window.setTimeout(() => useGameStore.getState().stepOnce(), t.step)
				break
			case "landing":
				useGameStore.getState().land()
				id = window.setTimeout(() => useGameStore.getState().nextTurn(), t.land)
				break
			case "turnEnd":
				id = window.setTimeout(() => useGameStore.getState().nextTurn(), t.turn)
				break
			case "awaitRoll":
			case "minigame":
			case "gameover":
				break
		}
		return () => {
			if (id) clearTimeout(id)
		}
	}, [phase, steps, current, speed])
}
