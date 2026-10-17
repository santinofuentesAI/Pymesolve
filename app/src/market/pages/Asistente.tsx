import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "../api"
import { useMode } from "../mode"
import { formatUsdc } from "../money"
import styles from "../styles.module.css"

export function Asistente() {
	const { role } = useMode()
	const summons = useQuery({
		queryKey: ["summons"],
		queryFn: api.summons,
		enabled: role === "admin",
	})

	if (role !== "admin") return <p>Solo la mesa ve esta bandeja.</p>

	return (
		<section>
			<p className={styles.kicker}>Mesa</p>
			<h1 className={styles.display}>Te llamaron a estos chats.</h1>
			<p className={styles.lede}>
				Sin llamada, este chat no aparece. El USDC sigue en el retén.
			</p>
			{(summons.data ?? []).length === 0 && (
				<p className={styles.empty}>Nadie te llamó todavía.</p>
			)}
			<div className={styles.list}>
				{(summons.data ?? []).map((s) => (
					<Link key={s.id} to={`/asistente/${s.id}`} className={styles.card}>
						<p>
							<strong>{s.title}</strong>
						</p>
						<p>
							{s.caller_name} · {formatUsdc(s.committed_usdc)} USDC
						</p>
						<p>{s.reason}</p>
					</Link>
				))}
			</div>
		</section>
	)
}
