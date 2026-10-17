import { formatUsdc, fundedUsdc, goalOf } from "../money"
import styles from "../styles.module.css"
import { type Pool } from "../types"

export function Pot({ pool }: { pool: Pool }) {
	const goal = goalOf(pool)
	const inPot = fundedUsdc(pool.members)
	const pct = goal > 0 ? Math.min(100, Math.round((inPot / goal) * 100)) : 0

	return (
		<div className={styles.pot} aria-label={`Retén ${inPot} de ${goal} USDC`}>
			<div className={styles.potMeta}>
				<span>En el retén</span>
				<strong>
					{formatUsdc(inPot)}
					<em> / {formatUsdc(goal)} USDC</em>
				</strong>
			</div>
			<div className={styles.potTrack} role="progressbar" aria-valuenow={pct}>
				<span className={styles.potFill} style={{ width: `${pct}%` }} />
			</div>
			<p className={styles.potHint}>
				{pct === 100
					? "Meta cubierta. El oficio trabaja con el USDC retenido."
					: `Faltan ${formatUsdc(goal - inPot)} USDC para la meta.`}
			</p>
		</div>
	)
}
