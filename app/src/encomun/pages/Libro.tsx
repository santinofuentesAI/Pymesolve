import type { Note } from "../api"
import styles from "../styles.module.css"

export function cuando(iso: string): string {
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ""
	return date.toLocaleString("es-CR", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function Libro({ notes }: { notes: Note[] }) {
	return (
		<section className={`${styles.block} ${styles.toneLibro}`}>
			<h1>Libro</h1>
			<p>Acá queda escrito quién puso plata y quién la pidió.</p>
			{notes.length === 0 ? (
				<p>Cuando alguien ponga o pida, queda escrito acá.</p>
			) : (
				<ul className={styles.rows}>
					{notes.map((note) => (
						<li key={note.id}>
							<p>{note.note}</p>
							{cuando(note.created_at) ? <time>{cuando(note.created_at)}</time> : null}
						</li>
					))}
				</ul>
			)}
		</section>
	)
}
