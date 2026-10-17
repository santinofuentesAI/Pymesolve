import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { rubro } from "../labels"
import { useMode } from "../mode"
import { formatUsdc } from "../money"
import styles from "../styles.module.css"
import { setAppMode } from "../theme"
import { type Pool, type Role } from "../types"

function mirada(role: Role): { kicker: string; title: string; lede: string } {
	switch (role) {
		case "pyme":
			return {
				kicker: "Tu negocio",
				title: "Encontrá quién te lo hace.",
				lede: "Publicá lo que te falta. Un oficio lo toma. Si otro pide lo mismo, se juntan.",
			}
		case "dev":
			return {
				kicker: "Usuario",
				title: "Hay encargos para tomar.",
				lede: "Negocios que arrancan buscan oficio. Tomás uno y cobrás esa meta.",
			}
		case "admin":
			return {
				kicker: "La mesa",
				title: "Mirás, no tomás.",
				lede: "Entrás a un chat solo si un comercio te llama.",
			}
		default: {
			const neverRole: never = role
			return neverRole
		}
	}
}

function pasoDe(role: Role, pool: Pool, actorId: string): string {
	switch (role) {
		case "dev":
			if (pool.dev_id === actorId) return "Seguir el encargo"
			if (pool.dev_id) return "Ver el encargo"
			return "Ver para tomar"
		case "admin":
			return "Abrir el encargo"
		case "pyme":
			return pool.members.some((m) => m.pyme_id === actorId)
				? "Seguir mi parte"
				: "Abrir ese encargo"
		default: {
			const neverRole: never = role
			return neverRole
		}
	}
}

export function Problemas() {
	const { role, actorId } = useMode()
	const look = mirada(role)
	const [draft, setDraft] = useState("")
	const [q, setQ] = useState("")
	useEffect(() => {
		const timer = window.setTimeout(() => setQ(draft.trim()), 250)
		return () => window.clearTimeout(timer)
	}, [draft])
	const searching = q.length >= 2
	const problems = useQuery({
		queryKey: ["problems", q],
		queryFn: () => api.problems(q),
		enabled: searching,
	})
	const pools = useQuery({ queryKey: ["pools"], queryFn: api.pools })

	const featured = useMemo(() => {
		const open = (pools.data ?? []).find(
			(p) => p.status === "Open" || p.status === "Proposed",
		)
		return open ?? pools.data?.[0]
	}, [pools.data])

	const hit = useMemo(() => {
		if (!searching) return null
		return problems.data?.[0] ?? null
	}, [problems.data, searching])
	const hitPool = useMemo(() => {
		if (!hit?.poolId) return null
		return (pools.data ?? []).find((p) => p.id === hit.poolId) ?? null
	}, [hit, pools.data])

	return (
		<section>
			<p className={styles.kicker}>{look.kicker}</p>
			<h1 className={styles.display}>{look.title}</h1>
			<p className={styles.lede}>{look.lede}</p>

			{role !== "admin" ? (
				<button
					type="button"
					className={styles.invite}
					onClick={() => setAppMode("dopamina")}
				>
					<span className={styles.kicker}>Opcional</span>
					<strong>
						{role === "dev" ? "Pasar comercios" : "Pasar oficios"}
					</strong>
					<em>A la derecha se pone verde. A la izquierda se va.</em>
				</button>
			) : null}

			<label className={styles.search}>
				{role === "dev" ? "Buscar ofertas" : "Buscar"}
				<input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder={
						role === "dev"
							? "video, whatsapp, Desamparados"
							: "video, marca, Hatillo"
					}
					enterKeyHint="search"
				/>
			</label>

			{searching ? (
				problems.isFetching ? (
					<p>Buscando una sola oferta…</p>
				) : hit ? (
					<article className={styles.card}>
						<p className={styles.kicker}>Un solo resultado · {rubro(hit.category)}</p>
						<h2 className={styles.job}>{hit.title}</h2>
						<p>{hit.body}</p>
						<div className={styles.names}>
							<Link to={`/perfil/${hit.pymeId}`}>
								<span>
									{hit.pymeName}
									<em>{hit.neighborhood}</em>
								</span>
								<b>{formatUsdc(hit.amountUsdc)}</b>
							</Link>
						</div>
						{hitPool ? (
							<div className={styles.plate}>
								<strong>{formatUsdc(hitPool.committed_usdc)}</strong>
								<span>
									USDC
									<br />
									{hitPool.members.length} comercios
								</span>
							</div>
						) : (
							<p className={styles.empty}>Todavía no se juntó con nadie.</p>
						)}
						{hit.poolId ? (
							<Link className={styles.block} to={`/encargo/${hit.poolId}`}>
								<button type="button" className={styles.primary}>
									Abrir ese encargo
								</button>
							</Link>
						) : null}
					</article>
				) : (
					<p className={styles.empty}>
						Nada con esa frase. Probá video, whatsapp o un barrio.
					</p>
				)
			) : featured ? (
				<article className={styles.card}>
					<p className={styles.kicker}>Un solo encargo</p>
					<h2 className={styles.job}>{featured.title}</h2>
					<p>{featured.summary}</p>
					<div className={styles.plate}>
						<strong>{formatUsdc(featured.committed_usdc)}</strong>
						<span>
							USDC
							<br />
							{featured.members.length} comercios
						</span>
					</div>
					<div className={styles.names}>
						{featured.members.map((m) => (
							<Link
								key={m.pyme_id}
								to={`/perfil/${m.pyme_id}`}
								className={m.pyme_id === actorId ? styles.you : undefined}
							>
								<span>
									{m.name}
									{m.pyme_id === actorId ? " · vos" : ""}
									<em>{m.neighborhood}</em>
								</span>
								<b>{formatUsdc(m.amount_usdc)}</b>
							</Link>
						))}
					</div>
					<Link className={styles.block} to={`/encargo/${featured.id}`}>
						<button type="button" className={styles.primary}>
							{pasoDe(role, featured, actorId)}
						</button>
					</Link>
				</article>
			) : (
				<p className={styles.empty}>Todavía no hay un problema publicado.</p>
			)}
		</section>
	)
}
