// Ajustes: sonido, velocidad de la CPU y número de rondas.
import { useState } from "react"
import { useInput } from "../input"
import { useGameStore } from "../store"
import type { CpuSpeed } from "../store"
import styles from "./ui.module.css"

interface Row {
	id: string
	label: string
	value: string
	change: (dir: 1 | -1) => void
}

const CPU_SPEEDS: CpuSpeed[] = ["chill", "normal", "fast"]
const SPEED_LABEL: Record<CpuSpeed, string> = {
	chill: "Tranquila",
	normal: "Normal",
	fast: "Rápida",
}
const ROUND_OPTIONS = [3, 5, 8]

/** Moves through `options` from `current` by `dir`, wrapping around. */
function cycle<T>(options: readonly T[], current: T, dir: 1 | -1): T {
	const index = Math.max(options.indexOf(current), 0)
	const next = (index + dir + options.length) % options.length
	return options[next] ?? current
}

export default function Settings() {
	const settings = useGameStore((s) => s.settings)
	const updateSettings = useGameStore((s) => s.updateSettings)
	const navigate = useGameStore((s) => s.navigate)
	const [focus, setFocus] = useState(0)

	const rows: Row[] = [
		{
			id: "sound",
			label: "Sonido",
			value: settings.sound ? "Sí" : "No",
			change: () => updateSettings({ sound: !settings.sound }),
		},
		{
			id: "cpuSpeed",
			label: "Velocidad CPU",
			value: SPEED_LABEL[settings.cpuSpeed],
			change: (dir) =>
				updateSettings({ cpuSpeed: cycle(CPU_SPEEDS, settings.cpuSpeed, dir) }),
		},
		{
			id: "rounds",
			label: "Rondas",
			value: String(settings.rounds),
			change: (dir) =>
				updateSettings({ rounds: cycle(ROUND_OPTIONS, settings.rounds, dir) }),
		},
	]

	useInput((action) => {
		if (action === "up" || action === "down") {
			const step = action === "up" ? -1 : 1
			setFocus((f) => (f + step + rows.length) % rows.length)
		} else if (action === "left" || action === "right") {
			rows[focus]?.change(action === "left" ? -1 : 1)
		} else if (action === "confirm") {
			rows[focus]?.change(1)
		} else if (action === "back") {
			navigate("menu")
		}
	})

	return (
		<div className={styles.overlay}>
			<section className={styles.panel}>
				<h1 className={styles.title}>Ajustes</h1>

				<ul className={styles.menu} role="menu">
					{rows.map((row, index) => {
						const active = index === focus
						return (
							<li
								key={row.id}
								role="menuitem"
								className={`${styles.item} ${active ? styles.itemActive : ""}`}
								onMouseEnter={() => setFocus(index)}
								onClick={() => {
									setFocus(index)
									row.change(1)
								}}
							>
								<span className={styles.itemLabel}>{row.label}</span>
								<span className={styles.itemValue}>{row.value}</span>
							</li>
						)
					})}
				</ul>

				<p className={styles.helpLine}>
					↑↓ elegir · ←→ cambiar · A/Espacio alternar · B/Esc volver
				</p>

				<button
					type="button"
					className={styles.ghostBtn}
					onClick={() => navigate("menu")}
				>
					Volver
				</button>
			</section>
		</div>
	)
}
