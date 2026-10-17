import { useQuery, useQueryClient } from "@tanstack/react-query"
import { type PointerEvent, useEffect, useRef, useState } from "react"
import { api } from "../api"
import { oficio } from "../labels"
import { useMode } from "../mode"
import styles from "../styles.module.css"
import { setAppMode } from "../theme"
import { type User } from "../types"

const SWIPE = 64

function clip(text: string, n: number): string {
	const t = text.trim()
	if (t.length <= n) return t
	return `${t.slice(0, n).trimEnd()}…`
}

export function Dopamina() {
	const { role, actorId } = useMode()
	const qc = useQueryClient()
	const [deck, setDeck] = useState<"pyme" | "dev">(role === "dev" ? "pyme" : "dev")
	const [i, setI] = useState(0)
	const [shift, setShift] = useState(0)
	const [gone, setGone] = useState<"left" | "right" | null>(null)
	const origin = useRef(0)
	const shiftRef = useRef(0)
	const draggingRef = useRef(false)
	const busy = useRef(false)
	const commitRef = useRef<(dir: "left" | "right") => void>(() => {})
	const cards = useQuery({
		queryKey: ["cards", deck],
		queryFn: () => api.cards(deck),
	})
	const list = (cards.data?.cards ?? []).filter((u) => u.id !== actorId)
	const card = list[i]
	const nextCard = list[i + 1]

	function finish(dir: "left" | "right", user: User | undefined) {
		setGone(null)
		shiftRef.current = 0
		setShift(0)
		busy.current = false
		if (dir === "right" && user) {
			void api.interest(user.id, deck).then(() => {
				void qc.invalidateQueries({ queryKey: ["cards"] })
			})
		}
		setI((n) => n + 1)
	}

	function commit(dir: "left" | "right") {
		if (busy.current || !card) return
		busy.current = true
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		if (reduce) {
			finish(dir, card)
			return
		}
		setGone(dir)
		const user = card
		window.setTimeout(() => finish(dir, user), 280)
	}

	commitRef.current = commit

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			const target = e.target
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement
			) {
				return
			}
			if (e.key === "ArrowLeft") commitRef.current("left")
			if (e.key === "ArrowRight") commitRef.current("right")
		}
		function onUp(e: globalThis.PointerEvent) {
			if (!draggingRef.current) return
			draggingRef.current = false
			const dx = e.clientX - origin.current
			const travel =
				Math.abs(shiftRef.current) >= Math.abs(dx) ? shiftRef.current : dx
			if (travel > SWIPE) commitRef.current("right")
			else if (travel < -SWIPE) commitRef.current("left")
			else {
				shiftRef.current = 0
				setShift(0)
			}
		}
		window.addEventListener("keydown", onKey)
		window.addEventListener("pointerup", onUp)
		window.addEventListener("pointercancel", onUp)
		return () => {
			window.removeEventListener("keydown", onKey)
			window.removeEventListener("pointerup", onUp)
			window.removeEventListener("pointercancel", onUp)
		}
	}, [])

	function down(e: PointerEvent<HTMLElement>) {
		if (gone || busy.current) return
		draggingRef.current = true
		origin.current = e.clientX
		e.currentTarget.setPointerCapture(e.pointerId)
	}

	function move(e: PointerEvent<HTMLElement>) {
		if (!draggingRef.current || gone) return
		e.preventDefault()
		const next = e.clientX - origin.current
		shiftRef.current = next
		setShift(next)
	}

	const moved = shift !== 0 && !gone
	const tilt = moved ? Math.max(-14, Math.min(14, shift / 12)) : 0
	const yesOp = gone === "right" ? 1 : Math.max(0, Math.min(1, (shift - 18) / 50))
	const noOp = gone === "left" ? 1 : Math.max(0, Math.min(1, (-shift - 18) / 50))
	const hotYes = gone === "right" || yesOp > 0.2
	const hotNo = gone === "left" || noOp > 0.2

	return (
		<section className={styles.pass}>
			<p className={styles.kicker}>
				Pasar gente
				{list.length > 0 ? ` · ${Math.min(i + 1, list.length)} de ${list.length}` : ""}
			</p>
			<div className={styles.switch}>
				<button
					type="button"
					className={deck === "pyme" ? styles.primary : undefined}
					onClick={() => {
						setDeck("pyme")
						setI(0)
						setShift(0)
					}}
				>
					Comercios
				</button>
				<button
					type="button"
					className={deck === "dev" ? styles.primary : undefined}
					onClick={() => {
						setDeck("dev")
						setI(0)
						setShift(0)
					}}
				>
					Oficios
				</button>
			</div>
			{cards.isLoading ? (
				<p>Abriendo el mazo…</p>
			) : !card ? (
				<div className={styles.card}>
					<p>Se acabó el mazo.</p>
					<button
						type="button"
						className={styles.primary}
						onClick={() => setAppMode("inicio")}
					>
						Volver a Inicio
					</button>
				</div>
			) : (
				<div className={styles.stage}>
					{gone ? (
						<div
							className={`${styles.flash} ${gone === "right" ? styles.flashYes : styles.flashNo}`}
							aria-hidden
						>
							{gone === "right" ? "Me sirve" : "Ahora no"}
						</div>
					) : null}
					{nextCard ? (
						<article className={styles.deckBack} aria-hidden>
							<p className={styles.kicker}>
								{nextCard.neighborhood} · {oficio(nextCard.trade)}
							</p>
							<h2>{nextCard.name}</h2>
						</article>
					) : null}
					<article
						className={`${styles.deck} ${gone === "left" ? styles.deckLeft : ""} ${gone === "right" ? styles.deckRight : ""} ${hotYes ? styles.deckYes : ""} ${hotNo ? styles.deckNo : ""}`}
						style={
							moved
								? { transform: `translateX(${shift}px) rotate(${tilt}deg)` }
								: gone
									? undefined
									: {
											transform: "translateX(0) rotate(0deg)",
											transition: "transform 120ms linear",
										}
						}
						onPointerDown={down}
						onPointerMove={move}
					>
						<span
							className={`${styles.stamp} ${styles.stampYes}`}
							style={{ opacity: yesOp }}
						>
							Me sirve
						</span>
						<span
							className={`${styles.stamp} ${styles.stampNo}`}
							style={{ opacity: noOp }}
						>
							Ahora no
						</span>
						<div className={styles.deckBody}>
							<p className={styles.kicker}>
								{card.neighborhood} · {oficio(card.trade)}
								{card.kind === "dev" && !card.verified ? " · en revisión" : ""}
							</p>
							<h2>{card.name}</h2>
							<p className={styles.deckBio}>
								{clip(card.bio || "Todavía no se presentó.", 160)}
							</p>
							{card.pedido ? (
								<p className={styles.deckPedido}>
									<strong>{card.pedido.title}</strong>
								</p>
							) : null}
							{(card.bullets ?? []).length > 0 ? (
								<ul className={styles.deckHits}>
									{(card.bullets ?? []).slice(0, 2).map((b) => (
										<li key={b}>{clip(b, 90)}</li>
									))}
								</ul>
							) : null}
						</div>
						<div
							className={styles.deckActions}
							onPointerDown={(e) => e.stopPropagation()}
						>
							<button type="button" onClick={() => commit("left")}>
								Ahora no
							</button>
							<button
								type="button"
								className={styles.primary}
								onClick={() => commit("right")}
							>
								Me sirve
							</button>
						</div>
					</article>
				</div>
			)}
			<p className={styles.lede}>
				Derecha verde: te sirve. Izquierda rojo: se va.{" "}
				<button
					type="button"
					className={styles.linkish}
					onClick={() => setAppMode("inicio")}
				>
					Saltar
				</button>
			</p>
		</section>
	)
}
