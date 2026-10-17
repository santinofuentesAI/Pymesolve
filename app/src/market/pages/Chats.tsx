import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { errorMessage } from "../../lib/errors"
import { api } from "../api"
import { useMode } from "../mode"
import { formatUsdc } from "../money"
import { setAppMode } from "../theme"
import styles from "../styles.module.css"
import { type ChatMessage, type Pool, type Role } from "../types"

function mios(pools: Pool[], role: Role, actorId: string): Pool[] {
	return pools.filter((p) => {
		if (p.status === "Cancelled") return false
		if (role === "dev") return p.dev_id === actorId
		if (role === "pyme") return p.members.some((m) => m.pyme_id === actorId)
		return false
	})
}

function abiertos(pools: Pool[]): Pool[] {
	return pools.filter((p) => p.status === "Open" || p.status === "Proposed")
}

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

export function Chats() {
	const { id } = useParams()
	const nav = useNavigate()
	const qc = useQueryClient()
	const { role, actorId } = useMode()
	const [draft, setDraft] = useState("")
	const [note, setNote] = useState("")
	const bottom = useRef<HTMLDivElement>(null)
	const pools = useQuery({ queryKey: ["pools"], queryFn: api.pools })
	const list = mios(pools.data ?? [], role, actorId)
	const poolId = Number(id)
	const picked =
		Number.isFinite(poolId) && poolId > 0
			? list.find((p) => p.id === poolId)
			: list[0]
	const chat = useQuery({
		queryKey: ["chat", picked?.id],
		queryFn: () => api.messages(picked!.id),
		enabled: Boolean(picked),
		refetchInterval: 3000,
	})

	useEffect(() => {
		bottom.current?.scrollIntoView({ block: "end" })
	}, [chat.data?.length, picked?.id])

	useEffect(() => {
		setDraft("")
		setNote("")
	}, [picked?.id])

	const send = useMutation({
		mutationFn: (body: string) => api.sendMessage(picked!.id, body),
		onSuccess: async () => {
			setDraft("")
			await qc.invalidateQueries({ queryKey: ["chat", picked?.id] })
		},
		onError: (e) => setNote(errorMessage(e)),
	})

	const take = useMutation({
		mutationFn: (pool: Pool) => api.claim(pool.id),
		onSuccess: async (pool) => {
			await qc.invalidateQueries({ queryKey: ["pools"] })
			nav(`/chats/${pool.id}`)
		},
		onError: (e) => setNote(errorMessage(e)),
	})

	if (role === "admin") {
		return (
			<section>
				<h1 className={styles.display}>Los chats de la mesa están en la bandeja.</h1>
				<Link to="/asistente">
					<button type="button" className={styles.primary}>
						Abrir bandeja
					</button>
				</Link>
			</section>
		)
	}

	const pendientes = role === "dev" ? abiertos(pools.data ?? []) : []

	return (
		<section className={styles.chatPage}>
			<p className={styles.kicker}>Chats</p>
			<h1 className={styles.display}>
				{role === "dev" ? "Tus chats con pymes." : "Tus chats del encargo."}
			</h1>
			{note ? <p className={styles.note}>{note}</p> : null}
			{pools.isLoading ? <p>Abriendo chats…</p> : null}

			{!pools.isLoading && list.length === 0 ? (
				<>
					<p className={styles.empty}>
						{role === "dev"
							? "El chat se abre cuando tomás el encargo."
							: "El chat se abre cuando estás en un encargo."}
					</p>
					{pendientes.length > 0 ? (
						<div className={styles.list}>
							{pendientes.map((p) => (
								<div key={p.id} className={styles.listRow}>
									<div>
										<p className={styles.kicker}>
											{p.members.length} comercios ·{" "}
											{formatUsdc(p.committed_usdc)} USDC
										</p>
										<p>
											<strong>{p.title}</strong>
										</p>
									</div>
									<button
										type="button"
										className={styles.primary}
										disabled={take.isPending}
										onClick={() => take.mutate(p)}
									>
										Tomar y hablar
									</button>
								</div>
							))}
						</div>
					) : (
						<p>
							<Link className={styles.link} to="/encargos">
								Ver encargos
							</Link>
						</p>
					)}
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
				</>
			) : null}

			{list.length > 1 ? (
				<div className={styles.list}>
					{list.map((p) => (
						<button
							key={p.id}
							type="button"
							className={`${styles.listRow} ${picked?.id === p.id ? styles.primary : ""}`}
							onClick={() => nav(`/chats/${p.id}`)}
						>
							<div>
								<p className={styles.kicker}>
									{p.members.length} comercios · {formatUsdc(p.committed_usdc)}{" "}
									USDC
								</p>
								<p>
									<strong>{p.title}</strong>
								</p>
							</div>
							<span>Abrir</span>
						</button>
					))}
				</div>
			) : null}

			{picked ? (
				<div className={styles.thread}>
					<p className={styles.kicker}>
						{picked.members.length} comercios · {formatUsdc(picked.committed_usdc)}{" "}
						USDC
					</p>
					<p>
						<strong>{picked.title}</strong>
					</p>
					<p className={styles.lede}>
						{picked.members.map((m) => m.name).join(", ")}
						{picked.dev_id === actorId ? " · vos el oficio" : ""}
					</p>
					<div className={styles.chat}>
						{chat.isLoading ? <p>Abriendo el hilo…</p> : null}
						{(chat.data ?? []).length === 0 && !chat.isLoading ? (
							<p className={styles.empty}>Escribí el primer mensaje.</p>
						) : null}
						{(chat.data ?? []).map((m: ChatMessage) => (
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
						<div ref={bottom} />
					</div>
					<div className={styles.composer}>
						<textarea
							rows={2}
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							placeholder="Una duda, un avance, un no."
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault()
									if (draft.trim() && !send.isPending) {
										send.mutate(draft.trim())
									}
								}
							}}
						/>
						<button
							type="button"
							className={styles.primary}
							disabled={send.isPending || !draft.trim()}
							onClick={() => send.mutate(draft.trim())}
						>
							Enviar
						</button>
					</div>
					<p>
						<Link className={styles.link} to={`/encargo/${picked.id}`}>
							Ver el encargo
						</Link>
					</p>
				</div>
			) : null}
		</section>
	)
}
