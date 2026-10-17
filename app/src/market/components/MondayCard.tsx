import { parseCarta } from "../carta"
import { speak } from "../ledger"
import styles from "../styles.module.css"

export function MondayCard({ letter }: { letter: string }) {
	const c = parseCarta(letter)
	if (!c.monday && !c.changed) return null
	return (
		<article className={styles.monday}>
			<p className={styles.kicker}>Ficha del lunes</p>
			<h3>Pegala al mostrador</h3>
			<ol>
				{c.changed && <li>{c.changed}</li>}
				{c.where && (
					<li>
						Abrí esta carpeta:{" "}
						<a href={c.where} target="_blank" rel="noreferrer">
							{c.where}
						</a>
					</li>
				)}
				{c.monday && <li>{c.monday}</li>}
			</ol>
			<button type="button" onClick={() => speak(letter)}>
				Leela en voz alta
			</button>
		</article>
	)
}
