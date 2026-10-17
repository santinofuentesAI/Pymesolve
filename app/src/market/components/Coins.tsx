import styles from "../styles.module.css"
import  { type Member } from "../types"

export function Coins({ members }: { members: Member[] }) {
	return (
		<div className={styles.coins} aria-label="Monedas nominadas">
			{members.map((m) => (
				<div
					key={m.pyme_id}
					className={`${styles.coin} ${m.funded ? styles.filled : ""}`}
					title={m.name}
				>
					<strong>{m.amount_usdc} USDC</strong>
					<span>{m.name.split(" ").slice(-1)[0]}</span>
				</div>
			))}
		</div>
	)
}
