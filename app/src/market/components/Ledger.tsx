import { stampsOf } from "../ledger"
import styles from "../styles.module.css"
import  { type Pool } from "../types"

export function Ledger({ pool }: { pool: Pool }) {
	return (
		<ol className={styles.ledger}>
			{stampsOf(pool).map((s) => (
				<li key={s.id} className={s.done ? styles.ledgerDone : undefined}>
					<strong>{s.title}</strong>
					<span>{s.detail}</span>
				</li>
			))}
		</ol>
	)
}
