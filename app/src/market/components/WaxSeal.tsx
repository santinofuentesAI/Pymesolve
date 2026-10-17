import { claridad } from "../carta"
import styles from "../styles.module.css"

export function WaxSeal({
	hash,
	letter,
}: {
	hash: string | null
	letter: string | null
}) {
	if (!hash) {
		return (
			<div className={`${styles.wax} ${styles.waxEmpty}`}>
				<span>sin sello</span>
			</div>
		)
	}
	const score = letter ? claridad(letter) : 0
	return (
		<div className={styles.wax} title={hash}>
			<strong>SELLO</strong>
			<span>{hash.slice(0, 8)}</span>
			<em>claridad {score}/10</em>
		</div>
	)
}
