import { Link } from "react-router-dom"
import { formatUsdc } from "../money"
import { currentPhase } from "../phases"
import styles from "../styles.module.css"
import { type Pool, type Problem } from "../types"

export function Desk({
	role,
	actorId,
	pools,
	problems,
}: {
	role: "pyme" | "dev" | "admin"
	actorId: string
	pools: Pool[]
	problems: Problem[]
}) {
	if (role === "pyme") {
		const mine = pools.filter((p) =>
			p.members.some((m) => m.pyme_id === actorId),
		)
		const toSign = mine.find((p) => {
			const m = p.members.find((x) => x.pyme_id === actorId)
			return m && !m.joined
		})
		const toFund = mine.find((p) => {
			const m = p.members.find((x) => x.pyme_id === actorId)
			return (
				m &&
				m.joined &&
				!m.funded &&
				(p.status === "EscrowReady" || p.status === "Claimed")
			)
		})
		const loose = problems.filter((p) => p.pymeId === actorId && !p.poolId)

		if (!toSign && !toFund && loose.length === 0 && mine.length === 0) {
			return (
				<div className={styles.desk}>
					<p className={styles.kicker}>Tu mostrador</p>
					<p>
						Todavía no publicaste. Decí el hueco y cuánto querés meter: el
						barrio puede juntarse.
					</p>
					<Link to="/publicar" className={styles.deskCta}>
						Publicar un problema
					</Link>
				</div>
			)
		}

		return (
			<div className={styles.desk}>
				<p className={styles.kicker}>Tu mostrador</p>
				<div className={styles.deskRow}>
					{toFund && (
						<Link to={`/encargo/${toFund.id}`} className={styles.deskItem}>
							<span>Depositar ahora</span>
							<strong>
								{formatUsdc(
									toFund.members.find((m) => m.pyme_id === actorId)
										?.amount_usdc ?? 0,
								)}{" "}
								USDC
							</strong>
							<em>{toFund.title}</em>
						</Link>
					)}
					{toSign && (
						<Link to={`/encargo/${toSign.id}`} className={styles.deskItem}>
							<span>Falta tu firma</span>
							<strong>Entrar al encargo</strong>
							<em>{toSign.title}</em>
						</Link>
					)}
					{loose.map((p) => (
						<div key={p.id} className={styles.deskItem}>
							<span>Suelto</span>
							<strong>{formatUsdc(p.amountUsdc)} USDC</strong>
							<em>{p.title}</em>
						</div>
					))}
					{mine
						.filter((p) => p !== toSign && p !== toFund)
						.slice(0, 2)
						.map((p) => (
							<Link
								key={p.id}
								to={`/encargo/${p.id}`}
								className={styles.deskItem}
							>
								<span>{labelPhase(currentPhase(p))}</span>
								<strong>{formatUsdc(p.committed_usdc)} USDC</strong>
								<em>{p.title}</em>
							</Link>
						))}
				</div>
			</div>
		)
	}

	if (role === "dev") {
		const open = pools.filter(
			(p) => p.status === "Open" || p.status === "Proposed",
		)
		const mine = pools.filter((p) => p.dev_id === actorId)
		return (
			<div className={styles.desk}>
				<p className={styles.kicker}>Tu oficio</p>
				<div className={styles.deskRow}>
					<div className={styles.deskItem}>
						<span>Buscan oficio</span>
						<strong>{open.length}</strong>
						<em>encargos abiertos en la mesa</em>
					</div>
					<div className={styles.deskItem}>
						<span>Tus tomas</span>
						<strong>{mine.length}</strong>
						<em>trabajos que ya firmaste</em>
					</div>
					<Link to="/perfil" className={styles.deskCta}>
						Mi oficio
					</Link>
				</div>
			</div>
		)
	}

	const waiting = pools.filter((p) => p.status === "Proposed")
	return (
		<div className={styles.desk}>
			<p className={styles.kicker}>La mesa</p>
			<div className={styles.deskRow}>
				<div className={styles.deskItem}>
					<span>A juntar</span>
					<strong>{waiting.length}</strong>
					<em>encargos esperando firmas</em>
				</div>
				<Link to="/asistente" className={styles.deskCta}>
					Ver llamadas
				</Link>
			</div>
		</div>
	)
}

function labelPhase(id: ReturnType<typeof currentPhase>) {
	switch (id) {
		case "juntar":
			return "Juntando"
		case "firmar":
			return "Firmas"
		case "oficio":
			return "Oficio"
		case "depositar":
			return "Depósito"
		case "carta":
			return "Carta"
		case "cerrar":
			return "Cierre"
		default: {
			const _never: never = id
			return _never
		}
	}
}
