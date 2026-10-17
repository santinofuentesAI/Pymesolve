import { stellarNetwork } from "@stellar-scaffold/app-lib"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useCavosState } from "../../cavos/context"
import { useWallet } from "../../hooks/useWallet"
import { errorMessage } from "../../lib/errors"
import { USDC_BALANCE_KEY } from "../../trustless/config"
import { nombres } from "../api"
import { cargarPlataDePrueba, monto } from "../plata"
import { abrirFondo, leerFondo, unirse } from "../chain"
import styles from "../styles.module.css"
import {
	setMotion,
	setTheme,
	usePrefs,
	type MotionName,
	type ThemeName,
} from "../theme"

const THEMES: { id: ThemeName; label: string; hint: string; swatch: string }[] =
	[
		{
			id: "cosecha",
			label: "Cosecha",
			hint: "Papel claro",
			swatch: styles.swatchCosecha ?? "",
		},
		{
			id: "campo",
			label: "Campo",
			hint: "Verde claro",
			swatch: styles.swatchCampo ?? "",
		},
		{
			id: "noche",
			label: "Noche",
			hint: "Fondo oscuro",
			swatch: styles.swatchNoche ?? "",
		},
	]

const MOTION: { id: MotionName; label: string }[] = [
	{ id: "tocar", label: "Se mueve al tocar" },
	{ id: "quieto", label: "Quieto" },
]

export function Ajustes() {
	const { theme, motion } = usePrefs()
	const { address, balances, signTransaction, updateBalances } = useWallet()
	const cavos = useCavosState()
	const qc = useQueryClient()
	const fondo = useQuery({
		queryKey: ["fondos", address],
		queryFn: () => leerFondo(address),
	})
	const gente = useQuery({
		queryKey: ["nombres"],
		queryFn: () => nombres.lista(),
	})
	const [name, setName] = useState("")
	const [place, setPlace] = useState("")
	const [asiento, setAsiento] = useState("")
	const [busy, setBusy] = useState("")
	const [note, setNote] = useState("")

	const usdc = balances[USDC_BALANCE_KEY]?.balance
	const chain = fondo.data
	const mio = address
		? gente.data?.find((person) => person.address === address)
		: undefined
	const tieneNombre = Boolean(mio?.name.trim())
	const tieneUsdc = monto(usdc) > 0
	const pasoNumero = !address
		? 1
		: !tieneNombre
			? 2
			: !tieneUsdc
				? 3
				: !chain?.abierta || !chain.esSocio
					? 4
					: 5

	function abierto(n: number) {
		return pasoNumero === n && busy === ""
	}

	async function act(label: string, fn: () => Promise<unknown>) {
		setBusy(label)
		setNote("")
		try {
			await fn()
			await updateBalances()
			await qc.invalidateQueries({ queryKey: ["fondos"] })
			await qc.invalidateQueries({ queryKey: ["nombres"] })
			setNote(`${label}.`)
		} catch (err) {
			setNote(errorMessage(err))
		} finally {
			setBusy("")
		}
	}

	async function prepararPlata() {
		if (!address) return
		setBusy("plata")
		setNote("Cargando plata de prueba…")
		try {
			await cargarPlataDePrueba(address, signTransaction, balances, setNote)
			await updateBalances()
			setNote("Listo. Ya tenés dólares de prueba.")
		} catch (err) {
			setNote(errorMessage(err))
		} finally {
			setBusy("")
		}
	}

	return (
		<section className={`${styles.block} ${styles.settings}`}>
			<h1>Ajustes</h1>
			<p>Tu cuenta, el color de la app y cómo está armada.</p>
			{note ? <p className={styles.note}>{note}</p> : null}

			<h2>Para usar el fondo</h2>
			<ol className={styles.steps}>
				<li>
					<strong>1. Entrar</strong>
					<p>Con tu correo, para que la plata salga de tu cuenta.</p>
					{address ? (
						<p>Listo{cavos?.email ? `, ${cavos.email}` : ""}.</p>
					) : (
						<>
							<button
								type="button"
								className={styles.primary}
								disabled={!abierto(1) || !cavos}
								onClick={() => cavos?.signIn()}
							>
								Entrar
							</button>
							{!cavos ? (
								<p>
									El ingreso con correo todavía no está activado en esta compu.
								</p>
							) : null}
						</>
					)}
				</li>
				<li>
					<strong>2. Tu nombre</strong>
					<p>El grupo tiene que ver quién sos.</p>
					{tieneNombre ? (
						<p>
							Listo, {mio?.name}
							{mio?.place ? ` · ${mio.place}` : ""}.
						</p>
					) : (
						<>
							<label>
								Nombre
								<input
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</label>
							<label>
								Lugar
								<input
									value={place}
									onChange={(event) => setPlace(event.target.value)}
								/>
							</label>
							<button
								type="button"
								className={styles.primary}
								disabled={!abierto(2) || name.trim().length < 2 || !address}
								onClick={() => {
									if (!address) return
									void act("Nombre guardado", () =>
										nombres.guardar(address, name.trim(), place.trim()),
									)
								}}
							>
								Guardar mi nombre
							</button>
						</>
					)}
				</li>
				<li>
					<strong>3. Plata de prueba</strong>
					<p>Dólares de prueba para el fondo. Lo otro solo paga la red.</p>
					{tieneUsdc ? (
						<p>Listo. Ya tenés dólares de prueba.</p>
					) : stellarNetwork === "TESTNET" ? (
						<button
							type="button"
							className={styles.primary}
							disabled={!abierto(3)}
							onClick={() => void prepararPlata()}
						>
							Cargar plata de prueba
						</button>
					) : (
						<p>La plata de prueba solo está en la red de prueba.</p>
					)}
				</li>
				<li>
					<strong>4. Entrar al grupo</strong>
					{chain?.esSocio ? (
						<p>Ya estás. Volvé a Sacos.</p>
					) : chain && !chain.abierta ? (
						<>
							<p>Se hace una sola vez. Decí quién puede pedir el adelanto.</p>
							<label>
								Quién puede pedir el adelanto
								<input
									value={asiento}
									onChange={(event) => setAsiento(event.target.value.trim())}
								/>
							</label>
							<button
								type="button"
								disabled={!abierto(4)}
								onClick={() => setAsiento(address ?? "")}
							>
								Soy yo
							</button>
							<button
								type="button"
								className={styles.primary}
								disabled={
									!abierto(4) ||
									!address ||
									!asiento.startsWith("G") ||
									asiento.length !== 56
								}
								onClick={() => {
									if (!address) return
									void act("Fondo abierto", () =>
										abrirFondo(address, signTransaction, asiento),
									)
								}}
							>
								Abrir el fondo
							</button>
						</>
					) : (
						<button
							type="button"
							className={styles.primary}
							disabled={!abierto(4) || !address}
							onClick={() => {
								if (!address) return
								void act("Ya estás en el fondo", () =>
									unirse(address, signTransaction),
								)
							}}
						>
							Unirme
						</button>
					)}
				</li>
			</ol>

			<h2>Tema</h2>
			<div className={styles.themePick}>
				{THEMES.map((item) => (
					<button
						key={item.id}
						type="button"
						className={`${item.swatch} ${theme === item.id ? styles.pickOn : ""}`}
						onClick={() => setTheme(item.id)}
					>
						<strong>{item.label}</strong>
						<span>{item.hint}</span>
					</button>
				))}
			</div>

			<h2>Movimiento</h2>
			<div className={`${styles.themePick} ${styles.motionPick}`}>
				{MOTION.map((item) => (
					<button
						key={item.id}
						type="button"
						className={motion === item.id ? styles.on : undefined}
						onClick={() => setMotion(item.id)}
					>
						{item.label}
					</button>
				))}
			</div>

			<details className={styles.facts}>
				<summary>Cómo está hecha</summary>
				<ul>
					<li>
						La pantalla es esta app, armada con Scaffold Stellar. El número de
						la plata sale del contrato en la red de prueba.
					</li>
					<li>
						<a
							href="https://stellar.expert/explorer/testnet/contract/CDCT2WEDIHZY54FOZ5VN6B5TWHSVABEEBPLWZX7WWEWUSIA7ZHKPUP6I"
							target="_blank"
							rel="noreferrer"
						>
							Ver el contrato
						</a>
					</li>
					<li>
						Se entra con correo o Google. Esa cuenta es la que pone la plata.
					</li>
					<li>Los nombres no van a la red. Solo la cuenta.</li>
					<li>El USDC es la plata del grupo. El XLM solo paga la red.</li>
				</ul>
				<p className={styles.hint}>
					Poner entra plata. Pedir queda abierto hasta que otra persona lo ve.
					El adelanto lo firma una sola persona.
				</p>
			</details>
		</section>
	)
}
