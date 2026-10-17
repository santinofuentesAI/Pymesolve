import { useQuery } from "@tanstack/react-query"
import { api } from "../api"
import { useMode } from "../mode"
import styles from "../styles.module.css"

function dia(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return ""
	return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" })
}

export function Libro() {
	const { role, actorId } = useMode()
	const ledger = useQuery({
		queryKey: ["ledger", role, actorId],
		queryFn: api.ledger,
	})
	const mesa = role === "admin"

	return (
		<section>
			<p className={styles.kicker}>Movimientos</p>
			<h1 className={styles.display}>Quién se sumó y qué pasó.</h1>
			<p className={styles.lede}>
				{mesa
					? "La mesa ve los nombres. A la red van la cuenta, el monto, el rubro y el estado."
					: "Se ve si alguien se sumó, depositó o tomó el encargo. Los nombres de otros no salen: Un comercio, Un oficio. Vos sí."}
			</p>
			{ledger.isLoading && <p>Abriendo el libro…</p>}
			{(ledger.data ?? []).length === 0 && (
				<p className={styles.empty}>Todavía no hay un movimiento.</p>
			)}
			<div className={styles.list}>
				{(ledger.data ?? []).map((row, i) => (
					<div key={`${row.at}-${i}`} className={styles.listRow}>
						<div>
							<p className={styles.kicker}>
								{row.actor_name}
								{row.at ? ` · ${dia(row.at)}` : ""}
							</p>
							<p>
								<strong>{row.body}</strong>
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
