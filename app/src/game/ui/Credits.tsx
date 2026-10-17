// Créditos del proyecto. Volver con el botón, B/Esc o confirm.
import { useGameStore } from "../store"
import Menu from "./Menu"
import type { MenuItem } from "./Menu"
import styles from "./ui.module.css"

export default function Credits() {
	const navigate = useGameStore((s) => s.navigate)

	const back = () => navigate("menu")

	const items: MenuItem[] = [{ id: "back", label: "Volver", onSelect: back }]

	return (
		<div className={styles.overlay}>
			<section className={styles.panel}>
				<h1 className={styles.title}>Créditos</h1>

				<div className={styles.creditLines}>
					<p className={styles.creditLine}>
						<span className={styles.creditKey}>Idea y dirección:</span> Tú
					</p>
					<p className={styles.creditLine}>
						<span className={styles.creditKey}>Desarrollo con IA:</span> Claude
						(Opus 4.8), con Sonnet 5.5 y Haiku 5.5
					</p>
					<p className={styles.creditLine}>
						Construido sobre Scaffold Stellar · Stellar testnet
					</p>
					<p className={styles.creditFun}>Gracias por jugar. WAGMI.</p>
				</div>

				<Menu items={items} onBack={back} />
			</section>
		</div>
	)
}
