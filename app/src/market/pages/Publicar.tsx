import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useNotification } from "../../hooks/useNotification"
import { useWallet } from "../../hooks/useWallet"
import { errorMessage } from "../../lib/errors"
import { api } from "../api"
import { chainPostProblem, chainProposeFromPyme } from "../chain"
import { useActorName } from "../components/Who"
import { useMode } from "../mode"
import { formatUsdc } from "../money"
import styles from "../styles.module.css"

const PRESETS = [5, 10, 15, 20, 30]
const RUBROS = [
	{ id: "videos", label: "Videos" },
	{ id: "web", label: "Web" },
	{ id: "marca", label: "Marca" },
] as const

export function Publicar() {
	const { role } = useMode()
	const actorName = useActorName()
	const { address, signTransaction } = useWallet()
	const { addNotification } = useNotification()
	const nav = useNavigate()
	const qc = useQueryClient()
	const [title, setTitle] = useState("")
	const [category, setCategory] = useState<(typeof RUBROS)[number]["id"]>("videos")
	const [body, setBody] = useState("")
	const [amount, setAmount] = useState(10)
	const [busy, setBusy] = useState(false)

	const gemma = useQuery({ queryKey: ["gemma"], queryFn: api.gemma })
	const twins = useQuery({
		queryKey: ["twins", title, body, category],
		queryFn: () => api.twins(title, body, category),
		enabled: title.length > 8 && body.length > 20,
	})

	const look = twins.data
	const gemelos = look?.twins ?? []
	const metaIfJoin = (look?.amountUsdc ?? 0) + amount

	async function postOwn() {
		let chainId: number | undefined
		if (address) {
			chainId = Number(
				await chainPostProblem(address, signTransaction, {
					title,
					category,
					amountUsdc: amount,
				}),
			)
		}
		return api.postProblem({
			title,
			category,
			body,
			amountUsdc: amount,
			chainId,
		})
	}

	async function publicar() {
		setBusy(true)
		try {
			await postOwn()
			addNotification(`Publicado. Tu parte: ${formatUsdc(amount)} USDC.`, "success")
			await qc.invalidateQueries()
			void nav("/")
		} catch (e) {
			addNotification(errorMessage(e), "error")
		} finally {
			setBusy(false)
		}
	}

	async function sumarme() {
		setBusy(true)
		try {
			const mine = await postOwn()
			const ids = [...gemelos.map((t) => t.id), mine.id]
			const pool = await api.createPool(ids, look?.summary)
			if (address) {
				try {
					const chainId = Number(
						await chainProposeFromPyme(address, signTransaction, ids),
					)
					await api.patchPool(pool.id, { chainId })
				} catch (e) {
					addNotification(errorMessage(e), "error")
				}
			}
			addNotification("Te sumaste. Un solo encargo.", "success")
			await qc.invalidateQueries()
			void nav(`/encargo/${pool.id}`)
		} catch (e) {
			addNotification(errorMessage(e), "error")
		} finally {
			setBusy(false)
		}
	}

	if (role !== "pyme") {
		return (
			<section>
				<h1 className={styles.display}>Publicar es de la pyme.</h1>
				<p className={styles.lede}>
					En Ajustes elegí Pyme. El usuario toma encargos, no los publica.
				</p>
				<Link to="/ajustes">
					<button type="button" className={styles.primary}>
						Ir a Ajustes
					</button>
				</Link>
			</section>
		)
	}

	return (
		<section>
			<p className={styles.kicker}>{actorName ?? "Tu comercio"}</p>
			<h1 className={styles.display}>Contalo en una frase.</h1>
			<p className={styles.lede}>
				El rubro, dos o tres oraciones y cuánto pone tu comercio.
			</p>

			{title.length > 8 && body.length <= 20 ? (
				<p className={styles.meta}>
					Con dos o tres oraciones vemos si hay gemelos.
				</p>
			) : null}
			{title.length > 8 &&
			body.length > 20 &&
			twins.isFetched &&
			gemelos.length === 0 ? (
				<p className={styles.empty}>Nadie pidió esto todavía. Publicá el tuyo.</p>
			) : null}

			{gemelos.length > 0 && (
				<article className={styles.card}>
					<p className={styles.kicker}>
						{gemma.data?.ok ? "La máquina vio gemelos" : "Mismo pedido"}
					</p>
					<p>{look?.summary}</p>
					<p className={styles.meta}>
						{gemma.data?.ok
							? "Escrito en esta máquina. No arma el encargo sola."
							: "Plantilla. La máquina no respondió."}
					</p>
					<div className={styles.names}>
						{gemelos.map((t) => (
							<span key={t.id}>
								<span>
									{t.pymeName}
									<em>{t.neighborhood}</em>
								</span>
								<b>{formatUsdc(t.amountUsdc)}</b>
							</span>
						))}
					</div>
					<div className={styles.plate}>
						<strong>
							{formatUsdc(metaIfJoin)}
							<span>USDC</span>
						</strong>
						<span>si te sumás</span>
					</div>
					<button
						type="button"
						className={styles.primary}
						disabled={busy}
						onClick={() => void sumarme()}
					>
						Sumarme a ese encargo
					</button>
				</article>
			)}

			<div className={styles.form}>
				<label>
					El problema en una frase
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Video de 20 segundos del plato del día"
						maxLength={80}
					/>
				</label>
				<label>
					Rubro
					<select
						value={category}
						onChange={(e) =>
							setCategory(e.target.value as (typeof RUBROS)[number]["id"])
						}
					>
						{RUBROS.map((r) => (
							<option key={r.id} value={r.id}>
								{r.label}
							</option>
						))}
					</select>
				</label>
				<label>
					El detalle
					<textarea
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Qué le pasa al comercio, en dos o tres oraciones."
					/>
				</label>
				<div>
					<p className={styles.kicker}>Cuánto pone</p>
					<div className={styles.chips}>
						{PRESETS.map((n) => (
							<button
								key={n}
								type="button"
								className={amount === n ? styles.primary : undefined}
								onClick={() => setAmount(n)}
							>
								{n} USDC
							</button>
						))}
					</div>
				</div>
				<button
					type="button"
					className={styles.primary}
					disabled={busy || title.length < 8 || body.length < 20}
					onClick={() => void publicar()}
				>
					Publicar el mío
				</button>
			</div>
		</section>
	)
}
