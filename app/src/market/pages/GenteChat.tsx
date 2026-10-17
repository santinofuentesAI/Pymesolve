import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { errorMessage } from "../../lib/errors"
import { api } from "../api"
import { useMode } from "../mode"
import styles from "../styles.module.css"
import { type DirectMessage, type Role } from "../types"

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

export function GenteChat() {
	const { id } = useParams()
	const { actorId } = useMode()
	const qc = useQueryClient()
	const [thread, setThread] = useState<number | null>(null)
	const [draft, setDraft] = useState("")
	const [note, setNote] = useState("")
	const bottom = useRef<HTMLDivElement>(null)
	const person = useQuery({
		queryKey: ["user", id],
		queryFn: () => api.user(id!),
		enabled: Boolean(id),
	})
	const chat = useQuery({
		queryKey: ["dm", thread],
		queryFn: () => api.directMessages(thread!),
		enabled: thread !== null,
		refetchInterval: 3000,
	})

	const target = id ?? ""
	useEffect(() => {
		if (!target) return
		setThread(null)
		setDraft("")
		void api
			.openChat(target)
			.then((row) => {
				setThread(row.id)
				setNote("")
			})
			.catch((e: unknown) => setNote(errorMessage(e)))
	}, [target])

	useEffect(() => {
		bottom.current?.scrollIntoView({ block: "end" })
	}, [chat.data?.length, thread])

	const send = useMutation({
		mutationFn: (body: string) => api.sendDirect(thread!, body),
		onSuccess: async (rows) => {
			setDraft("")
			qc.setQueryData(["dm", thread], rows)
		},
		onError: (e) => setNote(errorMessage(e)),
	})

	return (
		<section className={styles.chatPage}>
			<p className={styles.kicker}>Gente que me sirve</p>
			<h1 className={styles.display}>{person.data?.name ?? "Chat"}</h1>
			{person.data ? <p className={styles.lede}>{person.data.bio}</p> : null}
			{note ? <p className={styles.note}>{note}</p> : null}
			<div className={styles.chat}>
				{(chat.data ?? []).length === 0 && thread !== null ? (
					<p className={styles.empty}>Escribí el primer mensaje.</p>
				) : null}
				{(chat.data ?? []).map((m: DirectMessage) => (
					<div
						key={m.id}
						className={
							m.actor_id === actorId
								? `${styles.bubble} ${styles.bubbleMine}`
								: `${styles.bubble} ${styles.bubbleOther}`
						}
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
					disabled={thread === null}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault()
							if (draft.trim() && thread !== null && !send.isPending) {
								send.mutate(draft.trim())
							}
						}
					}}
				/>
				<button
					type="button"
					className={styles.primary}
					disabled={send.isPending || thread === null || !draft.trim()}
					onClick={() => send.mutate(draft.trim())}
				>
					Enviar
				</button>
			</div>
			<p>
				<Link className={styles.link} to={`/perfil/${id}`}>
					Ver perfil
				</Link>
			</p>
		</section>
	)
}
