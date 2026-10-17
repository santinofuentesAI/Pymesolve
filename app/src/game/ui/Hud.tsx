// HUD de partida: ronda, marcador, aviso de turno y toast de eventos.
// Overlay no interactivo (pointer-events: none); solo reacciona al input en tu turno.
import { useInput } from "../input"
import { useGameStore } from "../store"
import styles from "./ui.module.css"

function deltaClass(delta: number): string | undefined {
	if (delta > 0) return styles.deltaPos
	if (delta < 0) return styles.deltaNeg
	return styles.deltaZero
}

function formatDelta(delta: number): string {
	return delta > 0 ? `+${delta}` : String(delta)
}

export default function Hud() {
	const match = useGameStore((s) => s.match)

	useInput((action) => {
		const store = useGameStore.getState()
		if (store.match?.phase !== "awaitRoll") return
		if (action === "confirm") {
			store.rollDice()
		} else if (action === "back") {
			store.resetToMenu()
		}
	})

	if (!match) return null

	const current = match.players[match.current]
	const cpuTurn =
		match.phase === "cpuRoll" ||
		match.phase === "rolling" ||
		match.phase === "stepping"
	const lastEvent = match.lastEvent

	return (
		<div className={styles.hud}>
			<div className={styles.roundBadge}>
				<span>
					Ronda {match.round} / {match.totalRounds}
				</span>
				{match.dice !== null ? (
					<span className={styles.diceBadge}>🎲 {match.dice}</span>
				) : null}
			</div>

			<ol className={styles.scoreboard}>
				{match.players.map((player, index) => {
					const isCurrent = index === match.current
					return (
						<li
							key={player.id}
							className={`${styles.scoreRow} ${isCurrent ? styles.scoreRowCurrent : ""}`}
						>
							<span
								className={styles.dot}
								style={{
									background: player.color,
									boxShadow: `0 0 8px ${player.color}`,
								}}
							/>
							<span className={styles.scoreName}>{player.name}</span>
							{player.isCPU ? <span className={styles.cpuTag}>CPU</span> : null}
							<span className={styles.scoreCoins}>🪙 {player.coins}</span>
						</li>
					)
				})}
			</ol>

			{match.phase === "awaitRoll" ? (
				<div className={styles.prompt}>Pulsa A / Espacio para tirar 🎲</div>
			) : cpuTurn ? (
				<div className={styles.waiting}>Turno de {current?.name}…</div>
			) : null}

			{lastEvent ? (
				<div
					key={`${lastEvent.playerId}-${match.round}-${match.current}`}
					className={styles.toast}
				>
					<span className={styles.toastEmoji}>{lastEvent.emoji}</span>
					<span className={styles.toastText}>{lastEvent.text}</span>
					<span
						className={`${styles.toastDelta} ${deltaClass(lastEvent.delta)}`}
					>
						{formatDelta(lastEvent.delta)}
					</span>
				</div>
			) : null}

			<div className={styles.exitHint}>Salir (B / Esc)</div>
		</div>
	)
}
