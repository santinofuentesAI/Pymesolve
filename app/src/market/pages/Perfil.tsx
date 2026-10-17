import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { api } from "../api"
import { oficio, rubro } from "../labels"
import { useMode } from "../mode"
import { formatUsdc } from "../money"
import styles from "../styles.module.css"

export function Perfil() {
	const { id } = useParams()
	const { actorId } = useMode()
	const user = useQuery({
		queryKey: ["user", id],
		queryFn: () => api.user(id!),
		enabled: Boolean(id),
	})
	const problems = useQuery({
		queryKey: ["problems"],
		queryFn: () => api.problems(),
	})
	const pools = useQuery({ queryKey: ["pools"], queryFn: api.pools })
	const gh = useQuery({
		queryKey: ["gh", user.data?.github],
		queryFn: () => api.github(user.data!.github!),
		enabled: Boolean(user.data?.github && user.data.verified),
	})

	if (user.isLoading) return <p>Abriendo el perfil…</p>
	const me = user.data
	if (!me) return <p className={styles.empty}>No está esa persona.</p>

	const published = (problems.data ?? []).filter((p) => p.pymeId === me.id)
	const done = (pools.data ?? []).filter(
		(p) =>
			p.dev_id === me.id && (p.status === "Released" || p.status === "Resolved"),
	)

	return (
		<section>
			<div className={styles.hero}>
				<p className={styles.kicker}>
					{me.kind === "dev" ? "Oficio" : "Comercio"} · {oficio(me.trade)} ·{" "}
					{me.neighborhood}
				</p>
				<h1>{me.name}</h1>
			</div>
			<article className={styles.card}>
				<p className={styles.kicker}>
					{me.kind === "dev" ? "Qué hace" : "Qué es este comercio"}
				</p>
				<p>{me.bio || "Todavía no se presentó."}</p>
			</article>
			{me.pedido ? (
				<article className={styles.card}>
					<p className={styles.kicker}>Qué pide</p>
					<p>
						<strong>{me.pedido.title}.</strong> {me.pedido.body}
					</p>
				</article>
			) : null}
			{(me.bullets ?? []).length > 0 && (
				<article className={styles.card}>
					<p className={styles.kicker}>
						{me.kind === "dev"
							? "En qué le sirve a una pyme"
							: "El lunes, concreto"}
					</p>
					<ul className={styles.bullets}>
						{(me.bullets ?? []).map((b) => (
							<li key={b}>{b}</li>
						))}
					</ul>
				</article>
			)}
			{me.kind === "dev" && !me.verified && (
				<p className={styles.note}>
					En revisión. La mesa mira el enlace. Hasta que diga que sí, no toma
					encargos.
				</p>
			)}
			{me.kind === "dev" && me.verified && (
				<p>La mesa ya lo miró. Puede tomar encargos.</p>
			)}
			{me.kind === "pyme" && (
				<div className={styles.list}>
					{published.map((p) => (
						<div key={p.id} className={styles.listRow}>
							<div>
								<p>
									<strong>{p.title}</strong>
								</p>
								<p>{p.body}</p>
								<p>
									{rubro(p.category)} · {formatUsdc(p.amountUsdc)} USDC
								</p>
							</div>
							{p.poolId ? (
								<Link to={`/encargo/${p.poolId}`}>Ver</Link>
							) : null}
						</div>
					))}
				</div>
			)}
			{me.kind === "dev" && me.verified && (
				<div>
					{gh.data && (
						<div className={styles.card}>
							<p className={styles.kicker}>GitHub</p>
							<p>
								{gh.data.publicRepos} repos · desde{" "}
								{new Date(gh.data.createdAt).getFullYear()}
							</p>
							<ul className={styles.bullets}>
								{gh.data.repos.map((r) => (
									<li key={r.name}>
										<a href={r.htmlUrl} target="_blank" rel="noreferrer">
											{r.name}
										</a>
									</li>
								))}
							</ul>
						</div>
					)}
					{done.length > 0 && (
						<div className={styles.list}>
							{done.map((p) => (
								<div key={p.id} className={styles.listRow}>
									<p>
										<strong>{p.title}</strong>
									</p>
									<Link to={`/encargo/${p.id}`}>Carta</Link>
								</div>
							))}
						</div>
					)}
					<ul className={styles.bullets}>
						{me.drive ? (
							<li>
								<a href={me.drive} target="_blank" rel="noreferrer">
									Drive
								</a>
							</li>
						) : null}
						{me.social ? (
							<li>
								<a href={me.social} target="_blank" rel="noreferrer">
									Portafolio
								</a>
							</li>
						) : null}
						{me.linkedin ? (
							<li>
								<a href={me.linkedin} target="_blank" rel="noreferrer">
									LinkedIn o Fiverr
								</a>
							</li>
						) : null}
					</ul>
				</div>
			)}
			{me.id === actorId && (
				<p>
					<Link className={styles.link} to="/ajustes">
						Editar en Ajustes
					</Link>
				</p>
			)}
		</section>
	)
}
