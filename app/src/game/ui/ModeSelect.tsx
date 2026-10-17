// Selección de modo de juego. Solo "Jugar gratis" está activo hasta la Fase 4 (USDC).
import { useGameStore } from "../store"
import Menu from "./Menu"
import type { MenuItem } from "./Menu"
import styles from "./ui.module.css"

const noop = () => undefined

export default function ModeSelect() {
	const navigate = useGameStore((s) => s.navigate)
	const setMode = useGameStore((s) => s.setMode)

	const back = () => navigate("menu")

	const items: MenuItem[] = [
		{
			id: "free",
			label: "Jugar gratis",
			hint: "Monedas falsas, sin wallet",
			onSelect: () => {
				setMode("free")
				navigate("setup")
			},
		},
		{
			id: "bet_standard",
			label: "Apuesta estándar (USDC)",
			hint: "Buy-in fijo · requiere wallet — Fase 4",
			disabled: true,
			onSelect: noop,
		},
		{
			id: "bet_custom",
			label: "Apuesta libre (USDC)",
			hint: "Tú decides el monto · requiere wallet — Fase 4",
			disabled: true,
			onSelect: noop,
		},
	]

	return (
		<div className={styles.overlay}>
			<section className={styles.panel}>
				<h1 className={styles.title}>Elige modo</h1>

				<Menu items={items} onBack={back} />

				<button type="button" className={styles.ghostBtn} onClick={back}>
					Volver
				</button>
			</section>
		</div>
	)
}
