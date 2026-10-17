// Menú vertical reutilizable, manejado por input (teclado/mando) y por ratón.
import { useState } from "react"
import { useInput } from "../input"
import styles from "./ui.module.css"

export type MenuItem = {
	id: string
	label: string
	hint?: string
	disabled?: boolean
	onSelect: () => void
}

interface MenuProps {
	title?: string
	items: MenuItem[]
	onBack?: () => void
}

/** Index of the first enabled item, or -1 when every item is disabled. */
function firstEnabled(items: MenuItem[]): number {
	return items.findIndex((item) => !item.disabled)
}

/** Keeps `index` when it points to an enabled item, otherwise falls back. */
function resolveIndex(items: MenuItem[], index: number): number {
	const item = items[index]
	return item && !item.disabled ? index : firstEnabled(items)
}

/** Next enabled index from `from` moving by `dir`, wrapping around. */
function stepIndex(items: MenuItem[], from: number, dir: 1 | -1): number {
	const count = items.length
	for (let k = 1; k <= count; k++) {
		const index = (((from + dir * k) % count) + count) % count
		const item = items[index]
		if (item && !item.disabled) return index
	}
	return from
}

export default function Menu({ title, items, onBack }: MenuProps) {
	const [picked, setPicked] = useState(() => firstEnabled(items))
	const selected = resolveIndex(items, picked)

	useInput((action) => {
		if (action === "up" || action === "down") {
			setPicked(stepIndex(items, selected, action === "up" ? -1 : 1))
		} else if (action === "confirm") {
			const item = items[selected]
			if (item && !item.disabled) item.onSelect()
		} else if (action === "back") {
			onBack?.()
		}
	})

	return (
		<div className={styles.menuWrap}>
			{title ? <p className={styles.caption}>{title}</p> : null}
			<ul className={styles.menu} role="menu">
				{items.map((item, index) => {
					const active = index === selected && !item.disabled
					const classes = [
						styles.item,
						active ? styles.itemActive : "",
						item.disabled ? styles.itemDisabled : "",
					]
						.filter(Boolean)
						.join(" ")

					return (
						<li key={item.id} className={styles.entry}>
							<div
								role="menuitem"
								aria-disabled={item.disabled === true}
								className={classes}
								onMouseEnter={() => {
									if (!item.disabled) setPicked(index)
								}}
								onClick={() => {
									if (item.disabled) return
									setPicked(index)
									item.onSelect()
								}}
							>
								<span className={styles.itemLabel}>{item.label}</span>
							</div>
							{item.hint ? (
								<p className={styles.itemHint}>{item.hint}</p>
							) : null}
						</li>
					)
				})}
			</ul>
		</div>
	)
}
