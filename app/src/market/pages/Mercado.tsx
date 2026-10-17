import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { Coins } from "../components/Coins"
import { Desk } from "../components/Desk"
import { OnChainNote } from "../components/OnChainNote"
import { Pot } from "../components/Pot"
import { useMode } from "../mode"
import { formatUsdc, padFolio } from "../money"
import { currentPhase } from "../phases"
import styles from "../styles.module.css"
import { statusLabel, type PoolStatus } from "../types"

export function Mercado() {
	const { role, actorId } = useMode()
	const [q, setQ] = useState("")
	const [category, setCategory] = useState("")
	const problems = useQuery({
		queryKey: ["problems", q, category],
		queryFn: () => api.problems(q, category),
	})
	const pools = useQuery({ queryKey: ["pools"], queryFn: api.pools })
	const groups = useQuery({ queryKey: ["groups"], queryFn: api.groups })

	const openProblems = useMemo(
		() => (problems.data ?? []).filter((p) => !p.poolId),
		[problems.data],
	)

	return (
		<div>
			<div className={styles.hero}>
				<div>
					<p className={styles.kicker}>Talonario de encargos</p>
					<h1 className={styles.display}>El barrio paga una vez.</h1>
					<p className={styles.lede}>
						Cada comercio dice cuánto mete. Si el hueco es el mismo, se junta un
						solo retén. El oficio cobra esa meta, no tres facturas.
					</p>
					<OnChainNote>
						Quién se unió y cuánto comprometió vive en el contrato pools. El
						USDC se deposita al retén cuando hay oficio.
					</OnChainNote>
				</div>
			</div>

			<Desk
				role={role}
				actorId={actorId}
				pools={pools.data ?? []}
				problems={problems.data ?? []}
			/>

			<div className={styles.search}>
				<label>
					Buscar en la libreta
					<input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="videos, turnos, marca…"
					/>
				</label>
				<label>
					Rubro
					<select
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						<option value="">Todos</option>
						<option value="videos">Videos</option>
						<option value="web">Web</option>
						<option value="marca">Marca</option>
					</select>
				</label>
				{role === "admin" && (
					<Link to="/altas">
						<button type="button">Juntar gemelos</button>
					</Link>
				)}
			</div>

			{groups.data && groups.data.length > 0 && (
				<section>
					<p className={styles.kicker}>Ya se pueden juntar</p>
					<div className={styles.grid}>
						{groups.data.map((g) => (
							<div key={g.problemIds.join("-")} className={styles.ticket}>
								<div className={styles.braidTop}>
									<span className={styles.status}>{g.category}</span>
									<span className={styles.amount}>
										{formatUsdc(g.amountUsdc)} USDC
									</span>
								</div>
								<p>{g.summary}</p>
								<div className={styles.names}>
									{g.names.map((n) => (
										<span key={n}>{n}</span>
									))}
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			<div className={styles.sectionHead}>
				<p className={styles.kicker}>Encargos</p>
			</div>
			{pools.isLoading && <p>Abriendo la libreta…</p>}
			{pools.data?.length === 0 && (
				<p className={styles.empty}>Todavía no hay un encargo juntado.</p>
			)}
			<div className={styles.grid}>
				{(pools.data ?? []).map((p) => (
					<Link key={p.id} to={`/encargo/${p.id}`} className={styles.ticket}>
						<div className={styles.braidTop}>
							<span className={styles.folio}>Nº {padFolio(p.id)}</span>
							<span className={styles.status}>
								{statusLabel(p.status as PoolStatus)} · {label(currentPhase(p))}
							</span>
						</div>
						<strong>{p.title}</strong>
						<p className={styles.calle}>
							{p.members.map((m) => m.neighborhood).join(" · ")}
						</p>
						<p>{p.summary}</p>
						<Pot pool={p} />
						<Coins members={p.members} />
					</Link>
				))}
			</div>

			<div className={styles.sectionHead}>
				<p className={styles.kicker}>Problemas sueltos</p>
			</div>
			<div className={styles.grid}>
				{openProblems.map((p) => (
					<article key={p.id} className={styles.ticket}>
						<div className={styles.braidTop}>
							<span className={styles.status}>
								{p.neighborhood} · {p.category}
							</span>
							<span className={styles.amount}>
								{formatUsdc(p.amountUsdc)} USDC
							</span>
						</div>
						<strong>{p.pymeName}</strong>
						<p>{p.title}</p>
						<p>{p.body}</p>
					</article>
				))}
			</div>
		</div>
	)
}

function label(id: ReturnType<typeof currentPhase>) {
	switch (id) {
		case "juntar":
			return "juntar"
		case "firmar":
			return "firmar"
		case "oficio":
			return "oficio"
		case "depositar":
			return "depositar"
		case "carta":
			return "carta"
		case "cerrar":
			return "cerrar"
		default: {
			const _never: never = id
			return _never
		}
	}
}
