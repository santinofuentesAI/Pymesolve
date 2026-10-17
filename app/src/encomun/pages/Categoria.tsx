import { useEffect, useState } from "react"
import { jarLabel, type ChainLine, type JarName } from "../api"
import { historia, type Paso } from "../flow"
import styles from "../styles.module.css"

const PRESETS = [5, 8, 10, 20]

type Modo = "poner" | "pedir"

export type CategoriaProps = {
	jar: JarName
	jarAmount: number
	deuda: number
	nombres: string[]
	seatName: string
	soyAsiento: boolean
	paso: Paso
	listo: boolean
	conocido: boolean
	lines: ChainLine[]
	nombreDe: (address: string) => string
	puedeVer: (asker: string) => boolean
	esQuienPidio: (asker: string) => boolean
	error: string
	busy: boolean
	pasoBusy: boolean
	cuentaTexto: string | null
	pendingText: string | null
	onAccion: (accion: "entrar" | "plata" | "ajustes") => void
	onConfirm: () => void
	onCancel: () => void
	onPoner: (amount: number) => void
	onPedir: (amount: number, destino: string) => void
	onAdelanto: (amount: number) => void
	onVer: (line: ChainLine) => void
	onDevolver: (line: ChainLine) => void
}

export function Categoria(props: CategoriaProps) {
	const [modo, setModo] = useState<Modo>("poner")
	const [texto, setTexto] = useState("8")
	const [destino, setDestino] = useState("")
	const monto = Number(texto)
	const montoOk = Number.isInteger(monto) && monto >= 1 && monto <= 200
	const destinoOk = destino.trim().length >= 8
	const puedePedir = props.jar !== "adelanto" || props.soyAsiento
	const pideDetalle = modo === "pedir" && props.jar !== "adelanto"

	useEffect(() => {
		setModo("poner")
		setDestino("")
	}, [props.jar])

	function elegir(next: Modo) {
		setModo(next)
	}

	function seguir() {
		if (!montoOk) return
		if (!props.listo) return
		if (modo === "poner") props.onPoner(monto)
		else if (props.jar === "adelanto") props.onAdelanto(monto)
		else if (destinoOk) props.onPedir(monto, destino.trim())
	}

	return (
		<section className={`${styles.block} ${toneClass(props.jar)}`}>
			<h1>{jarLabel(props.jar)}</h1>
			<p className={styles.amount}>
				{props.jarAmount} USDC
				{props.conocido && props.jarAmount === 0 ? (
					<span>Todavía en cero.</span>
				) : null}
			</p>
			{props.cuentaTexto ? <p>En tu cuenta: {props.cuentaTexto} USDC</p> : null}
			<p>{historia(props.jar)}</p>
			{props.nombres.length > 0 ? (
				<p>En el grupo: {props.nombres.join(", ")}.</p>
			) : null}
			{props.deuda > 0 ? (
				<p>Debés {props.deuda} USDC. Lo próximo que pongas paga eso primero.</p>
			) : null}
			{props.error ? <p className={styles.note}>{props.error}</p> : null}

			{props.pendingText ? (
				<div className={styles.sign}>
					<p>{props.pendingText}</p>
					<button
						className={styles.primary}
						type="button"
						disabled={props.busy}
						onClick={props.onConfirm}
					>
						Confirmar
					</button>
					<button type="button" onClick={props.onCancel}>
						Volver
					</button>
				</div>
			) : null}

			{!props.pendingText ? (
				<div className={styles.sign}>
					{!props.listo ? (
						<div className={styles.hint}>
							<p>{props.paso.texto}</p>
							{props.paso.accion === "ninguna" ? null : (
								<button
									className={styles.primary}
									type="button"
									disabled={props.pasoBusy}
									onClick={() => {
										if (props.paso.accion !== "ninguna")
											props.onAccion(props.paso.accion)
									}}
								>
									{props.pasoBusy ? "Cargando…" : props.paso.boton}
								</button>
							)}
						</div>
					) : null}
					<div className={styles.actions}>
						<button
							type="button"
							className={modo === "poner" ? styles.on : undefined}
							onClick={() => elegir("poner")}
						>
							Poner plata
						</button>
						<button
							type="button"
							className={modo === "pedir" ? styles.on : undefined}
							onClick={() => elegir("pedir")}
						>
							Pedir plata
						</button>
					</div>
					{modo === "pedir" && !puedePedir ? (
						<p>
							{props.seatName
								? `Esta plata la pide solo ${props.seatName}. Podés poner plata igual.`
								: "Esta plata la pide una sola persona. Podés poner plata igual."}
						</p>
					) : (
						<>
							<div className={styles.chips}>
								{PRESETS.map((n) => (
									<button
										key={n}
										type="button"
										className={monto === n ? styles.on : undefined}
										onClick={() => setTexto(String(n))}
									>
										{n} USDC
									</button>
								))}
							</div>
							<label>
								Otro monto
								<input
									inputMode="numeric"
									value={texto}
									onChange={(event) =>
										setTexto(event.target.value.replace(/[^\d]/g, ""))
									}
								/>
							</label>
							{!montoOk ? <p>Entre 1 y 200 USDC.</p> : null}
							{pideDetalle ? (
								<label>
									Para qué es
									<input
										value={destino}
										placeholder="Sacos de yute para la entrega"
										onChange={(event) => setDestino(event.target.value)}
									/>
								</label>
							) : null}
							<button
								className={styles.primary}
								type="button"
								disabled={
									!montoOk || (props.listo && pideDetalle && !destinoOk)
								}
								onClick={seguir}
							>
								{modo === "poner"
									? `Poner ${montoOk ? monto : ""} USDC`
									: `Pedir ${montoOk ? monto : ""} USDC`}
							</button>
						</>
					)}
				</div>
			) : null}

			{props.lines.length > 0 ? <h2>Pedidos abiertos</h2> : null}
			{props.lines.map((line) => {
				const quien = props.nombreDe(line.asker)
				return (
					<div key={line.id} className={styles.hint}>
						<p>
							{quien} pidió {line.amount} USDC para: {line.destino}
						</p>
						{props.puedeVer(line.asker) ? (
							<button
								className={styles.primary}
								type="button"
								onClick={() => props.onVer(line)}
							>
								Yo lo vi
							</button>
						) : props.esQuienPidio(line.asker) ? (
							<button type="button" onClick={() => props.onDevolver(line)}>
								Cancelar este pedido
							</button>
						) : (
							<p>Otra persona tiene que confirmarlo.</p>
						)}
					</div>
				)
			})}
		</section>
	)
}

function toneClass(jar: JarName) {
	switch (jar) {
		case "sacos":
			return styles.toneSacos
		case "flete":
			return styles.toneFlete
		case "adelanto":
			return styles.toneAdelanto
		default: {
			const unknown: never = jar
			return unknown
		}
	}
}
