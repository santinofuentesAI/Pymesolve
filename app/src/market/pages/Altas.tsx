import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../api"
import { useMode } from "../mode"
import styles from "../styles.module.css"

export function Altas() {
	const { role } = useMode()
	const qc = useQueryClient()
	const altas = useQuery({ queryKey: ["altas"], queryFn: api.altas })

	if (role !== "admin") {
		return <p>Solo la mesa mira las altas.</p>
	}

	return (
		<section>
			<p className={styles.kicker}>Altas</p>
			<h1 className={styles.display}>Enlaces para mirar con calma.</h1>
			<p className={styles.lede}>
				Una persona real revisa GitHub, Drive, LinkedIn o Fiverr. Tarda días.
			</p>
			{(altas.data ?? []).length === 0 && (
				<p className={styles.empty}>No hay nadie en revisión.</p>
			)}
			<div className={styles.list}>
				{(altas.data ?? []).map((p) => (
					<div key={p.id} className={styles.card}>
						<p>
							<strong>{p.name}</strong> · {p.trade} · {p.kind}
						</p>
						<p>
							<a href={p.url} target="_blank" rel="noreferrer">
								{p.url}
							</a>
						</p>
						<div className={styles.row}>
							<button
								type="button"
								className={styles.primary}
								onClick={() =>
									void api.reviewProof(p.id, "aprobado").then(() =>
										qc.invalidateQueries({ queryKey: ["altas"] }),
									)
								}
							>
								Es real
							</button>
							<button
								type="button"
								onClick={() =>
									void api.reviewProof(p.id, "rechazado").then(() =>
										qc.invalidateQueries({ queryKey: ["altas"] }),
									)
								}
							>
								Devolver
							</button>
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
