import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { useNotification } from "../../hooks/useNotification"
import { useWallet } from "../../hooks/useWallet"
import { errorMessage } from "../../lib/errors"
import { USDC_BALANCE_KEY } from "../../trustless/config"
import { api } from "../api"
import { oficio } from "../labels"
import { cartaIssues, cartaText, hashCarta, type Carta } from "../carta"
import {
	chainClaim,
	chainJoin,
	chainMarkFunded,
	chainMarkReleased,
	chainReviseAmount,
	chainSetEscrow,
	chainSetEvidence,
	chainVote,
} from "../chain"
import { MondayCard } from "../components/MondayCard"
import { Phases } from "../components/Phases"
import { usePoolEscrow } from "../escrow"
import { useMode } from "../mode"
import { formatUsdc } from "../money"
import { currentPhase } from "../phases"
import { cargarPlataDePrueba, monto } from "../plata"
import styles from "../styles.module.css"
import { type PoolStatus, type Role } from "../types"

function rolEnClaro(role: Role): string {
	switch (role) {
		case "dev":
			return "oficio"
		case "pyme":
			return "comercio"
		case "admin":
			return "mesa"
		default: {
			const neverRole: never = role
			return neverRole
		}
	}
}

function bubbleClass(kind: string, role: Role, mine: boolean): string {
	if (kind === "system") return `${styles.bubble} ${styles.system}`
	if (mine) return `${styles.bubble} ${styles.bubbleMine}`
	if (role === "dev") return `${styles.bubble} ${styles.bubbleOther} ${styles.bubbleOficio}`
	return `${styles.bubble} ${styles.bubbleOther}`
}

export function Encargo() {
	const { id } = useParams()
	const loc = useLocation()
	const poolId = Number(id)
	const { role, actorId } = useMode()
	const { address, signTransaction, balances, updateBalances } = useWallet()
	const usdc = monto(balances[USDC_BALANCE_KEY]?.balance)
	const { addNotification } = useNotification()
	const qc = useQueryClient()
	const escrowApi = usePoolEscrow()
	const [draft, setDraft] = useState("")
	const [reason, setReason] = useState("")
	const [offerAmt, setOfferAmt] = useState(10)
	const [carta, setCarta] = useState<Carta>({
		changed: "",
		where: "",
		monday: "",
	})
	const [busy, setBusy] = useState(false)

	const poolQ = useQuery({
		queryKey: ["pool", poolId],
		queryFn: () => api.pool(poolId),
		enabled: Number.isFinite(poolId),
	})
	const chatQ = useQuery({
		queryKey: ["chat", poolId],
		queryFn: () => api.messages(poolId),
		enabled: Number.isFinite(poolId),
		refetchInterval: 4000,
	})
	const pool = poolQ.data
	const chainId = pool?.chain_id ?? undefined
	const fase = pool ? currentPhase(pool) : "juntar"
	const status = (pool?.status ?? "Proposed") as PoolStatus
	const member = pool?.members.find((m) => m.pyme_id === actorId)
	const summoned = Boolean(pool?.summon && pool.summon.status === "open")
	const canChat =
		(role === "dev" && pool?.dev_id === actorId) ||
		Boolean(member) ||
		(role === "admin" && summoned)

	useEffect(() => {
		if (loc.hash !== "#chat" || !canChat) return
		document.getElementById("chat")?.scrollIntoView({ block: "start" })
	}, [loc.hash, canChat, poolQ.data?.id])
	const letterOk = Boolean(pool?.letter_hash && pool.letter)
	const fundedCount = pool?.members.filter((m) => m.funded).length ?? 0
	const canOffer =
		(role === "pyme" && Boolean(member) && !member?.funded) ||
		(role === "dev" && pool?.dev_id === actorId)
	const openOffer = (pool?.offers ?? []).find((o) => o.status === "open")

	async function refresh() {
		await qc.invalidateQueries({ queryKey: ["pool", poolId] })
		await qc.invalidateQueries({ queryKey: ["chat", poolId] })
		await qc.invalidateQueries({ queryKey: ["ledger"] })
	}

	async function act(label: string, fn: () => Promise<unknown>) {
		setBusy(true)
		try {
			await fn()
			addNotification(label, "success")
			await refresh()
		} catch (e) {
			addNotification(errorMessage(e), "error")
		} finally {
			setBusy(false)
		}
	}

	if (poolQ.isLoading) return <p>Abriendo el encargo…</p>
	if (!pool) return <p className={styles.empty}>No está ese encargo.</p>

	return (
		<section>
			<p className={styles.kicker}>{pool.members.length} comercios</p>
			<h1 className={styles.display}>{pool.title}</h1>
			<p className={styles.lede}>{pool.summary}</p>
			{pool.brief ? (
				<article className={styles.card}>
					<p className={styles.kicker}>
						Detalles ·{" "}
						{pool.brief.ia
							? "generada por IA · en esta máquina"
							: "generada por IA · plantilla"}
					</p>
					<p>{pool.brief.lede}</p>
					{(pool.brief.puntos ?? []).length > 0 ? (
						<ul className={styles.bullets}>
							{(pool.brief.puntos ?? []).map((punto) => (
								<li key={punto}>{punto}</li>
							))}
						</ul>
					) : null}
				</article>
			) : null}
			<div className={styles.plate}>
				<strong>{formatUsdc(pool.committed_usdc)}</strong>
				<span>
					USDC
					<br />
					en el retén {fundedCount}/{pool.members.length}
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
								{oficio(m.trade)} · {m.neighborhood}
								{m.funded ? " · en el retén" : ""}
							</em>
						</span>
						<b>{formatUsdc(m.amount_usdc)}</b>
					</Link>
				))}
			</div>
			{pool.dev ? (
				<article className={styles.card}>
					<p className={styles.kicker}>
						Quién lo toma · {oficio(pool.dev.trade)} · {pool.dev.neighborhood}
					</p>
					<p>
						<Link className={styles.link} to={`/perfil/${pool.dev.id}`}>
							{pool.dev.name}
						</Link>
					</p>
					<p>{pool.dev.bio || "Todavía no se presentó."}</p>
				</article>
			) : null}
			<Phases pool={pool} />

			{fase === "firmar" && role === "pyme" && member && !member.joined && (
				<button
					type="button"
					className={styles.primary}
					disabled={busy}
					onClick={() =>
						void act("Confirmaste que entrás", async () => {
							if (address && chainId != null) {
								await chainJoin(address, signTransaction, chainId)
							}
							await api.join(pool.id)
						})
					}
				>
					Confirmo que entro
				</button>
			)}

			{fase === "firmar" && role === "dev" && (
				<p className={styles.empty}>
					Falta que cada comercio confirme que entra.
				</p>
			)}

			{fase === "oficio" && role === "dev" && !pool.dev_id && (
				<button
					type="button"
					className={styles.primary}
					disabled={busy}
					onClick={() =>
						void act("Tomaste el encargo", async () => {
							if (address && chainId != null) {
								await chainClaim(address, signTransaction, chainId)
							}
							await api.claim(pool.id, address)
						})
					}
				>
					Tomar este encargo
				</button>
			)}
			{fase === "oficio" && role === "pyme" && (
				<p className={styles.empty}>Esperando a un oficio. No puede ser una pyme de este encargo.</p>
			)}

			{fase === "depositar" && role === "dev" && pool.dev_id === actorId && !pool.escrow && address && (
				<button
					type="button"
					className={styles.primary}
					disabled={busy}
					onClick={() =>
						void act("Se abrió el retén", async () => {
							const deployed = await escrowApi.deploy(
								address,
								pool.dev?.wallet ?? address,
								pool,
							)
							const contractId = deployed?.contractId
							if (!contractId) return
							if (chainId != null) {
								await chainSetEscrow(address, signTransaction, chainId, contractId)
							}
							await api.patchPool(pool.id, { escrow: contractId, status: "EscrowReady" })
						})
					}
				>
					Abrir el retén
				</button>
			)}

			{fase === "depositar" && role === "pyme" && member && !pool.escrow && (
				<p className={styles.empty}>
					El oficio abre el retén. Después dejás tu parte.
				</p>
			)}

			{fase === "depositar" &&
				role === "pyme" &&
				member?.joined &&
				!member.funded &&
				pool.escrow && (
					<>
						{usdc <= 0 ? (
							<button
								type="button"
								className={styles.primary}
								disabled={busy || !address}
								onClick={() =>
									void act("Plata de prueba lista", async () => {
										if (!address) return
										await cargarPlataDePrueba(
											address,
											signTransaction,
											balances,
										)
										await updateBalances()
									})
								}
							>
								Cargar plata de prueba
							</button>
						) : (
							<button
								type="button"
								className={styles.primary}
								disabled={busy || !address}
								onClick={() =>
									void act("Tu parte quedó en el retén", async () => {
										await escrowApi.fund(
											address!,
											pool.escrow!,
											member.amount_usdc,
										)
										if (chainId != null) {
											await chainMarkFunded(address!, signTransaction, chainId)
										}
										await api.fund(pool.id)
									})
								}
							>
								Depositar {formatUsdc(member.amount_usdc)} USDC
							</button>
						)}
					</>
				)}

			{fase === "carta" && role === "pyme" && (
				<p className={styles.empty}>El oficio deja la carta del lunes.</p>
			)}

			{fase === "carta" && role === "dev" && pool.dev_id === actorId && (
				<div className={styles.form}>
					<p className={styles.kicker}>Carta del lunes</p>
					<textarea
						placeholder="Qué cambió"
						value={carta.changed}
						onChange={(e) => setCarta({ ...carta, changed: e.target.value })}
					/>
					<input
						placeholder="Link de Drive"
						value={carta.where}
						onChange={(e) => setCarta({ ...carta, where: e.target.value })}
					/>
					<textarea
						placeholder="El lunes, filmá el plato y subilo a este Drive."
						value={carta.monday}
						onChange={(e) => setCarta({ ...carta, monday: e.target.value })}
					/>
					{cartaIssues(carta).map((issue) => (
						<p key={issue} className={styles.note}>
							{issue}
						</p>
					))}
					<button
						type="button"
						className={styles.primary}
						disabled={busy || cartaIssues(carta).length > 0}
						onClick={() =>
							void act("Carta sellada", async () => {
								const text = cartaText(carta)
								const hex = await hashCarta(text)
								if (address && chainId != null) {
									await chainSetEvidence(address, signTransaction, chainId, hex)
								}
								if (address && pool.escrow) {
									await escrowApi.markDone(address, pool.escrow, "1", carta.where)
								}
								await api.deliver(pool.id, {
									kind: "delivery",
									url: carta.where,
									explanation: text,
									letter: text,
									letterHash: hex,
								})
							})
						}
					>
						Dejar la carta
					</button>
				</div>
			)}

			{letterOk && pool.letter && <MondayCard letter={pool.letter} />}

			{fase === "cerrar" &&
				role === "pyme" &&
				member &&
				member.vote == null &&
				letterOk && (
					<button
						type="button"
						className={styles.primary}
						disabled={busy}
						onClick={() =>
							void act("Dijiste que lo viste", async () => {
								if (address && chainId != null) {
									await chainVote(address, signTransaction, chainId, true)
								}
								await api.vote(pool.id, true)
							})
						}
					>
						Yo lo vi
					</button>
				)}

			{fase === "cerrar" &&
				role === "admin" &&
				status === "Delivered" &&
				pool.escrow &&
				address && (
					<button
						type="button"
						className={styles.primary}
						disabled={busy}
						onClick={() =>
							void act("Se soltó el USDC", async () => {
								await escrowApi.approve(address, pool.escrow!, "1")
								await escrowApi.release(address, pool.escrow!, "1")
								if (chainId != null) {
									await chainMarkReleased(address, signTransaction, chainId)
								}
								await api.patchPool(pool.id, { status: "Released" })
							})
						}
					>
						Soltar el USDC
					</button>
				)}

			{canChat && (
				<div id="chat">
					<p className={styles.kicker}>
						Chat del encargo ·{" "}
						<Link className={styles.link} to={`/chats/${pool.id}`}>
							Abrir en Chats
						</Link>
					</p>
					<div className={styles.chat}>
						{(chatQ.data ?? []).length === 0 ? (
							<p className={styles.empty}>Todavía no hay mensajes.</p>
						) : null}
						{(chatQ.data ?? []).map((m) => (
							<div
								key={m.id}
								className={bubbleClass(m.kind, m.role, m.actor_id === actorId)}
							>
								<strong>
									{m.actor_name} · {rolEnClaro(m.role)}
								</strong>
								<p>{m.body}</p>
							</div>
						))}
					</div>
					<div className={styles.composer}>
						<textarea
							rows={3}
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							placeholder="Una duda, un avance, un no."
						/>
						<button
							type="button"
							disabled={busy || !draft.trim()}
							onClick={() =>
								void act("Mensaje enviado", async () => {
									await api.sendMessage(pool.id, draft.trim())
									setDraft("")
								})
							}
						>
							Enviar
						</button>
					</div>
					{canOffer && !member?.funded && fundedCount === 0 && status !== "Funded" && (
						<div className={styles.form}>
							<p className={styles.kicker}>Proponer otro monto</p>
							<div className={styles.chips}>
								{[5, 10, 15, 20, 30].map((n) => (
									<button
										key={n}
										type="button"
										className={offerAmt === n ? styles.primary : undefined}
										onClick={() => setOfferAmt(n)}
									>
										{n} USDC
									</button>
								))}
							</div>
							<button
								type="button"
								disabled={busy}
								onClick={() =>
									void act("Propusiste otro monto", async () => {
										await api.proposeOffer(pool.id, offerAmt)
									})
								}
							>
								Proponer {offerAmt} USDC
							</button>
							{openOffer && openOffer.actor_id !== actorId && (
								<button
									type="button"
									className={styles.primary}
									disabled={busy}
									onClick={() =>
										void act("Aceptaste el monto", async () => {
											if (address && chainId != null && role === "pyme") {
												await chainReviseAmount(
													address,
													signTransaction,
													chainId,
													openOffer.amount_usdc,
												)
											}
											await api.acceptOffer(pool.id, openOffer.id)
										})
									}
								>
									Aceptar {formatUsdc(openOffer.amount_usdc)} USDC
								</button>
							)}
						</div>
					)}
					{role === "pyme" && member && letterOk && !summoned && (
						<div className={styles.form}>
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="No incluye lo que pedimos."
							/>
							<button
								type="button"
								disabled={busy || reason.trim().length < 8}
								onClick={() =>
									void act("Llamaste a la mesa", async () => {
										await api.summon(pool.id, reason.trim())
										setReason("")
									})
								}
							>
								Llamar a la mesa
							</button>
						</div>
					)}
				</div>
			)}
			{!address && fase === "depositar" && (
				<p className={styles.note}>
					Entrá arriba para dejar tu parte en el retén.
				</p>
			)}
		</section>
	)
}
