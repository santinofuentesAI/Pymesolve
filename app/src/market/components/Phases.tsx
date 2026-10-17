import { phasesOf } from "../phases"
import styles from "../styles.module.css"
import { type Pool } from "../types"

export function Phases({ pool }: { pool: Pool }) {
	return (
		<ol className={styles.phases} aria-label="Fases del encargo">
			{phasesOf(pool).map((p) => (
				<li
					key={p.id}
					className={`${styles.phase} ${p.done ? styles.phaseDone : ""} ${p.current ? styles.phaseNow : ""}`}
				>
					<span className={styles.phaseMark} aria-hidden>
						{p.done ? "●" : p.current ? "◐" : "○"}
					</span>
					<strong>{p.label}</strong>
					<em>{p.hint}</em>
				</li>
			))}
		</ol>
	)
}
