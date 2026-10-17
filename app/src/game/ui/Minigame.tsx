// Fin de ronda: viaje, tutorial, arena 3D y premio.
import { useEffect, useRef } from "react"
import { useInput } from "../input"
import BoxingArena from "../scene/minis/BoxingArena"
import RaceArena from "../scene/minis/RaceArena"
import { useGameStore, type MiniId } from "../store"
import styles from "./Minigame.module.css"

const SEAT_KEYS = ["Space", "KeyF", "KeyJ", "KeyL"] as const
const PLAY_MS = 18000

const COPY: Record<
	MiniId,
	{ title: string; place: string; rules: string; keys: string }
> = {
	race: {
		title: "Quien llegue primero",
		place: "La recta de la fiesta",
		rules:
			"Aporrea tu tecla para correr. El primero en cruzar la meta se lleva 10 monedas. Si se acaba el tiempo, gana quien vaya más adelante.",
		keys: "Jugador 1: Espacio · 2: F · 3: J · 4: L. Las CPU corren solas.",
	},
	boxing: {
		title: "Todos al ring",
		place: "El cuadrilátero",
		rules:
			"Aporrea para golpear a quien más vida tenga. El último en pie se lleva 10 monedas. Si suena la campana, gana quien aguante más.",
		keys: "Jugador 1: Espacio · 2: F · 3: J · 4: L. Las CPU boxean solas.",
	},
}

function hitSeat(code: string): number {
	return SEAT_KEYS.indexOf(code as (typeof SEAT_KEYS)[number])
}

export default function MinigameScreen() {
	const mini = useGameStore((s) => s.mini)
	const players = useGameStore((s) => s.match?.players)
	const round = useGameStore((s) => s.match?.round ?? 1)
	const totalRounds = useGameStore((s) => s.match?.totalRounds ?? 1)
	const setMiniStage = useGameStore((s) => s.setMiniStage)
	const act = useGameStore((s) => s.act)
	const awardMini = useGameStore((s) => s.awardMini)
	const continueAfterMini = useGameStore((s) => s.continueAfterMini)
	const settling = useRef(false)

	useEffect(() => {
		if (mini?.stage !== "travel") return
		const id = window.setTimeout(() => setMiniStage("tutorial"), 1400)
		return () => window.clearTimeout(id)
	}, [mini?.stage, setMiniStage])

	useEffect(() => {
		if (mini?.stage !== "play" || !players) return
		settling.current = false
		const timers: number[] = []
		players.forEach((player, seat) => {
			if (!player.isCPU) return
			const every = mini.id === "race" ? 280 + seat * 50 : 620 + seat * 80
			timers.push(
				window.setInterval(() => {
					if (Math.random() < 0.85) act(seat)
				}, every),
			)
		})
		const clock = window.setTimeout(() => awardMini(), PLAY_MS)
		return () => {
			timers.forEach((id) => window.clearInterval(id))
			window.clearTimeout(clock)
		}
	}, [mini?.stage, mini?.id, players, act, awardMini])

	useEffect(() => {
		if (mini?.stage !== "play") return
		const done =
			mini.id === "race"
				? mini.scores.some((score) => score >= 100)
				: mini.scores.filter((health) => health > 0).length <= 1
		if (!done || settling.current) return
		settling.current = true
		const id = window.setTimeout(() => awardMini(), 700)
		return () => window.clearTimeout(id)
	}, [mini, awardMini])

	useInput((action) => {
		if (!mini) return
		if (action !== "confirm") return
		if (mini.stage === "tutorial") setMiniStage("play")
		else if (mini.stage === "award") continueAfterMini()
		else if (mini.stage === "play") act(0)
	})

	useEffect(() => {
		if (mini?.stage !== "play") return
		const onKey = (event: KeyboardEvent) => {
			const seat = hitSeat(event.code)
			if (seat > 0) act(seat)
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [mini?.stage, act])

	if (!mini || !players) return null
	const copy = COPY[mini.id]
	const winners = players.filter((player) => mini.winnerIds.includes(player.id))

	return (
		<div className={styles.stage} data-game={mini.id}>
			{mini.stage === "play" && mini.id === "race" && <RaceArena />}
			{mini.stage === "play" && mini.id === "boxing" && <BoxingArena />}
			{mini.stage === "play" && (
				<div className={styles.hud}>
					<p className={styles.kicker}>
						Ronda {round}/{totalRounds} · {copy.title}
					</p>
					<div className={styles.chips}>
						{players.map((player, seat) => (
							<div key={player.id} className={styles.chip}>
								<span style={{ color: player.color }}>{player.name}</span>
								<strong>
									{mini.id === "race"
										? `${mini.scores[seat] ?? 0}%`
										: `${mini.scores[seat] ?? 0}`}
								</strong>
							</div>
						))}
					</div>
				</div>
			)}
			{mini.stage !== "play" && (
				<div className={styles.intro}>
					<p className={styles.kicker}>
						{mini.stage === "travel" && "Cambio de lugar"}
						{mini.stage === "tutorial" && `Ronda ${round} de ${totalRounds}`}
						{mini.stage === "award" && "Resultado"}
					</p>
					<h1 className={styles.title}>{copy.title}</h1>
					<p className={styles.place}>{copy.place}</p>
					{mini.stage === "tutorial" && (
						<div className={styles.card}>
							<p className={styles.rules}>{copy.rules}</p>
							<p className={styles.keys}>{copy.keys}</p>
						</div>
					)}
					{mini.stage === "award" && (
						<div className={styles.winners}>
							{winners.map((player) => (
								<p key={player.id} className={styles.winner}>
									{player.name} +{mini.prize}
								</p>
							))}
						</div>
					)}
					<p className={styles.prompt}>
						{mini.stage === "travel" && "En camino…"}
						{mini.stage === "tutorial" && "A para empezar"}
						{mini.stage === "award" &&
							(round >= totalRounds ? "A para ver el resultado" : "A para volver al tablero")}
					</p>
				</div>
			)}
		</div>
	)
}
