import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../api"
import { useMode } from "../mode"
import { formatUsdc } from "../money"
import { currentPhase, type PhaseId } from "../phases"
import { setAppMode } from "../theme"
import styles from "../styles.module.css"
import { type Pool, type Role } from "../types"

function frase(role: Role, fase: PhaseId, taken: boolean): string {
	if (role === "dev" && fase === "oficio" && !taken) return "Este paso es tuyo."
	if (role === "pyme" && fase === "depositar") return "Te toca dejar tu parte en el retén."
	switch (fase) {
		case "juntar":
			return "Se están juntando."
		case "firmar":
			return "Falta que cada comercio confirme."
		case "oficio":
			return taken ? "Ya hay oficio." : "Busca un oficio."
		case "depositar":
			return "Cada comercio deposita su parte."
		case "carta":
			return "Falta la carta del lunes."
		case "cerrar":
			return "Mayoría, o la mesa si hay pelea."
		default: {
			const neverPhase: never = fase
			return neverPhase
		}
	}
}

function boton(role: Role, fase: PhaseId, taken: boolean): string {
	if (role === "dev" && fase === "oficio" && !taken) return "Tomar este encargo"
	if (role === "pyme") return "Seguir mi parte"
	return "Seguir este encargo"
}

export function Encargos() {
	const { role, actorId } = useMode()
	const nav = useNavigate()
	const pools = useQuery({ queryKey: ["pools"], queryFn: api.pools })
	const pool = (pools.data ?? []).find((p) => p.status !== "Cancelled") ?? pools.data?.[0]

	if (pools.isLoading) return <p>Abriendo el encargo…</p>
	if (!pool) {
		return (
			<section>
				<h1 className={styles.display}>Todavía no hay un encargo.</h1>
				<p className={styles.lede}>Publicá un problema o sumate a uno gemelo.</p>
				<Link to="/publicar">
					<button type="button" className={styles.primary}>
						Publicar
					</button>
				</Link>
			</section>
		)
	}

	const fase = currentPhase(pool)
	const taken = Boolean(pool.dev_id)
	const enChat = (p: Pool) =>
		role === "dev"
			? p.dev_id === actorId
			: p.members.some((m) => m.pyme_id === actorId)

	return (
		<section>
			{role !== "admin" ? (
				<button
					type="button"
					className={styles.invite}
					onClick={() => {
						setAppMode("dopamina")
						nav("/")
					}}
				>
					<span className={styles.kicker}>Opcional</span>
					<strong>
						{role === "dev" ? "Pasar comercios" : "Pasar oficios"}
					</strong>
					<em>A la derecha se pone verde. A la izquierda se va.</em>
				</button>
			) : null}
			<p className={styles.kicker}>Encargo abierto</p>
			<h1 className={styles.display}>{pool.title}</h1>
			<p className={styles.lede}>{pool.summary}</p>
			<div className={styles.plate}>
				<strong>{formatUsdc(pool.committed_usdc)}</strong>
				<span>
					USDC
					<br />
					{frase(role, fase, taken)}
				</span>
			</div>
			<div className={styles.names}>
				{pool.members.map((m) => (
					<Link
						key={m.pyme_id}
						to={`/perfil/${m.pyme_id}`}
						className={m.pyme_id === actorId ? styles.you : undefined}
					>
						<span>
							{m.name}
							{m.pyme_id === actorId ? " · vos" : ""}
							<em>
								{m.neighborhood}
							</em>
						</span>
						<b>{formatUsdc(m.amount_usdc)}</b>
					</Link>
				))}
			</div>
			<Link className={styles.block} to={`/encargo/${pool.id}`}>
				<button type="button" className={styles.primary}>
					Detalles
				</button>
			</Link>
			{enChat(pool) ? (
				<Link className={styles.block} to={`/chats/${pool.id}`}>
					<button type="button">Abrir chat</button>
				</Link>
			) : (
				<Link className={styles.block} to={`/encargo/${pool.id}`}>
					<button type="button">{boton(role, fase, taken)}</button>
				</Link>
			)}
			{role !== "admin" ? (
				<p>
					<Link className={styles.link} to="/chats">
						Chats de mis encargos
					</Link>
				</p>
			) : null}
		</section>
	)
}
