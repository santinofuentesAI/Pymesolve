import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useNotification } from "../../hooks/useNotification"
import { errorMessage } from "../../lib/errors"
import { api } from "../api"
import { Coins } from "../components/Coins"
import { MondayCard } from "../components/MondayCard"
import { OnChainNote } from "../components/OnChainNote"
import { WaxSeal } from "../components/WaxSeal"
import { useMode } from "../mode"
import styles from "../styles.module.css"

export function Recetas() {
	const recipes = useQuery({ queryKey: ["recipes"], queryFn: api.recipes })
	const { role } = useMode()
	const qc = useQueryClient()
	const { addNotification } = useNotification()

	return (
		<div>
			<p className={styles.kicker}>El barrio ya pagó</p>
			<h1 className={styles.display}>Las recetas quedan abiertas.</h1>
			<p className={styles.lede}>
				Cuando el retén se libera, la carta al mostrador pasa a ser del barrio.
				Otra panadería no vuelve a pagar el mismo trabajo: deja un eco si la
				usó.
			</p>
			<OnChainNote>
				El sello de la carta (hash) sigue en el contrato. El eco es de la mesa,
				no de la cadena.
			</OnChainNote>
			{recipes.data?.length === 0 && (
				<p className={styles.empty}>Todavía no hay una receta cerrada.</p>
			)}
			<div className={styles.grid}>
				{(recipes.data ?? []).map((p) => (
					<article key={p.id} className={styles.ticket}>
						<div className={styles.braidTop}>
							<span className={styles.status}>Receta · {p.category}</span>
							<WaxSeal hash={p.letter_hash} letter={p.letter} />
						</div>
						<Link to={`/encargo/${p.id}`}>
							<strong>{p.title}</strong>
						</Link>
						<p className={styles.calle}>
							{(p.ecos ?? []).length} ecos ·{" "}
							{p.members.map((m) => m.neighborhood).join(" · ")}
						</p>
						{p.letter && <MondayCard letter={p.letter} />}
						<Coins members={p.members} />
						{(p.ecos ?? []).map((e) => (
							<p key={e.pyme_id} className={styles.note}>
								{e.pyme_name}: {e.note}
							</p>
						))}
						{role === "pyme" && (
							<button
								onClick={() =>
									void api
										.eco(p.id, "Lo usamos en el local. Sirve.")
										.then(() => {
											addNotification("Dejaste un eco", "success")
											void qc.invalidateQueries({ queryKey: ["recipes"] })
										})
										.catch((err: unknown) =>
											addNotification(errorMessage(err), "error"),
										)
								}
							>
								Lo usamos en el local
							</button>
						)}
					</article>
				))}
			</div>
		</div>
	)
}
