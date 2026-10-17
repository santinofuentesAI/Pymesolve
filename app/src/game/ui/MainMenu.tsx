// Menú principal: título, navegación y ayuda de controles.
import { useGamepadConnected } from "../input"
import { useGameStore } from "../store"
import Menu from "./Menu"
import type { MenuItem } from "./Menu"
import styles from "./ui.module.css"

export default function MainMenu() {
	const navigate = useGameStore((s) => s.navigate)
	const gamepadConnected = useGamepadConnected()

	const items: MenuItem[] = [
		{ id: "play", label: "Jugar", onSelect: () => navigate("mode") },
		{
			id: "settings",
			label: "Ajustes",
			onSelect: () => navigate("settings"),
		},
		{ id: "credits", label: "Créditos", onSelect: () => navigate("credits") },
	]

	return (
		<div className={styles.overlay}>
			<section className={styles.panel}>
				<header className={styles.header}>
					<h1 className={styles.logo}>DeFiesta</h1>
					<p className={styles.tagline}>
						Cuatro jugadores. Un tablero. Una estrella.
					</p>
				</header>

				<Menu items={items} />

				<footer className={styles.footer}>
					<p className={styles.helpLine}>
						Mando o teclado: mover ↑↓, A/Espacio confirmar, B/Esc atrás
					</p>
					{gamepadConnected ? (
						<p className={styles.helpLine}>Mando conectado</p>
					) : null}
				</footer>
			</section>
		</div>
	)
}
