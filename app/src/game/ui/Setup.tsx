// Configuración de la partida libre: cuántos asientos son humanos (el resto, CPU).
import { useInput } from "../input"
import { PLAYER_COLORS, useGameStore } from "../store"
import styles from "./ui.module.css"

const SEATS = [0, 1, 2, 3]

export default function Setup() {
	const pendingHumans = useGameStore((s) => s.pendingHumans)
	const rounds = useGameStore((s) => s.settings.rounds)
	const navigate = useGameStore((s) => s.navigate)
	const setPendingHumans = useGameStore((s) => s.setPendingHumans)
	const startFreeMatch = useGameStore((s) => s.startFreeMatch)

	useInput((action) => {
		const store = useGameStore.getState()
		if (action === "left") {
			store.setPendingHumans(store.pendingHumans - 1)
		} else if (action === "right") {
			store.setPendingHumans(store.pendingHumans + 1)
		} else if (action === "confirm") {
			store.startFreeMatch()
		} else if (action === "back") {
			store.navigate("mode")
		}
	})

	return (
		<div className={styles.overlay}>
			<section className={styles.panel}>
				<h1 className={styles.title}>Partida libre</h1>

				<div className={styles.menuWrap}>
					<p className={styles.caption}>Jugadores humanos (1-4)</p>
					<div className={styles.stepper}>
						<button
							type="button"
							className={styles.stepBtn}
							aria-label="Quitar un jugador humano"
							disabled={pendingHumans <= 1}
							onClick={() => setPendingHumans(pendingHumans - 1)}
						>
							−
						</button>
						<span className={styles.stepValue}>{pendingHumans}</span>
						<button
							type="button"
							className={styles.stepBtn}
							aria-label="Añadir un jugador humano"
							disabled={pendingHumans >= 4}
							onClick={() => setPendingHumans(pendingHumans + 1)}
						>
							+
						</button>
					</div>
				</div>

				<ul className={styles.seats}>
					{SEATS.map((i) => {
						const human = i < pendingHumans
						return (
							<li
								key={i}
								className={
									human ? styles.seat : `${styles.seat} ${styles.seatCpu}`
								}
							>
								<span
									className={styles.seatBar}
									style={{ background: PLAYER_COLORS[i] }}
								/>
								<span className={styles.seatName}>
									{human ? `Jugador ${i + 1}` : "CPU"}
								</span>
								<span className={styles.seatKind}>
									{human ? "Humano" : "Bot"}
								</span>
							</li>
						)
					})}
				</ul>

				<p className={styles.helpLine}>
					Rondas: {rounds} · cámbialas en Ajustes
				</p>

				<button
					type="button"
					className={styles.primaryBtn}
					onClick={() => startFreeMatch()}
				>
					Empezar
				</button>

				<button
					type="button"
					className={styles.ghostBtn}
					onClick={() => navigate("mode")}
				>
					Volver
				</button>

				<p className={styles.helpLine}>
					←→ cambiar humanos · A/Espacio empezar · B/Esc volver
				</p>
			</section>
		</div>
	)
}
