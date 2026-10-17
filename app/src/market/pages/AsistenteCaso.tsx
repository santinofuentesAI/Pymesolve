import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useNotification } from "../../hooks/useNotification"
import { useWallet } from "../../hooks/useWallet"
import { errorMessage } from "../../lib/errors"
import { api } from "../api"
import { chainMarkDisputed, chainMarkResolved } from "../chain"
import { usePoolEscrow } from "../escrow"
import { formatUsdc } from "../money"
import styles from "../styles.module.css"

export function AsistenteCaso() {
	const { id } = useParams()
	const summonId = Number(id)
	const { address, signTransaction } = useWallet()
	const { addNotification } = useNotification()
	const escrowApi = usePoolEscrow()
	const nav = useNavigate()
	const qc = useQueryClient()
	const caso = useQuery({
		queryKey: ["summon", summonId],
		queryFn: () => api.summonCase(summonId),
		enabled: Number.isFinite(summonId),
	})
	const [devAmount, setDevAmount] = useState<number | "">("")
	const [opened, setOpened] = useState(false)
	const [reply, setReply] = useState("")

	if (caso.isLoading) return <p>Abriendo el chat…</p>
	if (!caso.data) return <p className={styles.empty}>No está esa llamada.</p>

	const { summon, brief, pool, messages } = caso.data
	const suggestedDev = brief?.suggested_dev ?? pool.committed_usdc * (2 / 3)
	const refund =
		typeof devAmount === "number"
			? Math.max(pool.committed_usdc - devAmount, 0)
			: (brief?.suggested_refund ?? 0)
	const pay = typeof devAmount === "number" ? devAmount : suggestedDev

	return (
		<section>
			<p className={styles.kicker}>Llamada {summon.id}</p>
			<h1 className={styles.display}>{pool.title}</h1>
			<p className={styles.lede}>{summon.reason}</p>
			{brief?.body ? <p className={styles.note}>{brief.body}</p> : null}
			<label className={styles.form}>
				USDC al oficio
				<input
					type="number"
					min={0}
					max={pool.committed_usdc}
					value={devAmount}
					placeholder={String(suggestedDev)}
					onChange={(e) =>
						setDevAmount(e.target.value ? Number(e.target.value) : "")
					}
				/>
			</label>
			<p className={styles.meta}>
				Se paga {formatUsdc(pay)} USDC al oficio. Vuelven {formatUsdc(refund)} a
				las pymes.
			</p>
			<div className={styles.row}>
				<button
					type="button"
					disabled={!address}
					onClick={() => {
						if (!address || !pool.escrow) return
						void escrowApi
							.openDispute(address, pool.escrow, "1")
							.then(async () => {
								if (pool.chain_id != null) {
									await chainMarkDisputed(
										address,
										signTransaction,
										pool.chain_id,
									)
								}
								await api.patchPool(pool.id, { status: "Disputed" })
								setOpened(true)
								addNotification("La mesa entra al retén", "success")
							})
							.catch((e: unknown) => addNotification(errorMessage(e), "error"))
					}}
				>
					Abrir el desacuerdo
				</button>
				<button
					type="button"
					className={styles.primary}
					disabled={!address || !opened}
					onClick={() => {
						if (!address || !pool.escrow) return
						const pymeWallets = pool.members.map(() => address)
						void escrowApi
							.resolve(
								address,
								pool.escrow,
								"1",
								address,
								pymeWallets,
								pay,
								refund,
							)
							.then(async () => {
								if (pool.chain_id != null) {
									await chainMarkResolved(
										address,
										signTransaction,
										pool.chain_id,
										pay,
									)
								}
								await api.verdict(summon.id, pay, refund)
								addNotification("La mesa partió el USDC", "success")
								void qc.invalidateQueries()
								void nav("/asistente")
							})
							.catch((e: unknown) => addNotification(errorMessage(e), "error"))
					}}
				>
					Partir el USDC
				</button>
			</div>
			<p className={styles.kicker}>Chat</p>
			<div className={styles.chat}>
				{messages.map((m) => (
					<div
						key={m.id}
						className={`${styles.bubble} ${m.kind === "system" ? styles.system : ""}`}
					>
						<strong>
							{m.actor_name} · {m.role}
						</strong>
						<p>{m.body}</p>
					</div>
				))}
			</div>
			<div className={styles.composer}>
				<textarea
					rows={3}
					value={reply}
					onChange={(e) => setReply(e.target.value)}
					placeholder="Una pregunta al oficio o a la pyme"
				/>
				<button
					type="button"
					disabled={!reply.trim()}
					onClick={() =>
						void api.sendMessage(pool.id, reply.trim()).then(() => {
							setReply("")
							void qc.invalidateQueries({ queryKey: ["summon", summonId] })
						})
					}
				>
					Escribir
				</button>
			</div>
		</section>
	)
}
