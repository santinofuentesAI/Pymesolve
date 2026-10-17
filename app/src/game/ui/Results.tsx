// Pantalla de resultados: ranking por monedas, ganador destacado y opciones de revancha/menú.
import { useGameStore } from "../store"
import Menu from "./Menu"
import type { MenuItem } from "./Menu"
import styles from "./ui.module.css"

export default function Results() {
	const match = useGameStore((s) => s.match)
	const winnerId = useGameStore((s) => s.winnerId)
	const rematch = useGameStore((s) => s.rematch)
	const resetToMenu = useGameStore((s) => s.resetToMenu)

	const ranking = match
		? [...match.players].sort((a, b) => b.coins - a.coins)
		: []

	const back = () => resetToMenu()

	const items: MenuItem[] = [
		{ id: "rematch", label: "🔁 Revancha", onSelect: () => rematch() },
		{ id: "menu", label: "🏠 Menú", onSelect: back },
	]

	return (
		<div className={styles.overlay}>
			<section className={styles.panel}>
				<h1 className={styles.title}>Resultados</h1>

				{ranking.length === 0 ? (
					<p className={styles.emptyNote}>No hay partida que mostrar.</p>
				) : (
					<ol className={styles.rankList}>
						{ranking.map((player, index) => {
							const winner = player.id === winnerId
							return (
								<li
									key={player.id}
									className={`${styles.rankRow} ${winner ? styles.rankWinner : ""}`}
								>
									<span className={styles.rankPos}>{index + 1}</span>
									<span
										className={styles.dot}
										style={{
											background: player.color,
											boxShadow: `0 0 10px ${player.color}`,
										}}
									/>
									<span
										className={styles.rankName}
										style={{ color: player.color }}
									>
										{player.name}
									</span>
									{winner ? (
										<span className={styles.winnerBadge}>👑 Ganador</span>
									) : null}
									<span className={styles.rankCoins}>🪙 {player.coins}</span>
								</li>
							)
						})}
					</ol>
				)}

				<Menu items={items} onBack={back} />
			</section>
		</div>
	)
}
