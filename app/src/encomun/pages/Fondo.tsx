import { fondos } from "@stellar-scaffold/app-lib/clients"
import { shortAddress } from "@stellar-scaffold/app-lib"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useCavosState } from "../../cavos/context"
import { useWallet } from "../../hooks/useWallet"
import { errorMessage } from "../../lib/errors"
import { USDC_BALANCE_KEY } from "../../trustless/config"
import { jarLabel, libro, nombres, type JarName, type Persona } from "../api"
import { devolver, leerFondo, pedir, poner, tomarAdelanto, ver } from "../chain"
import { pasoActual, textoDeConfirmacion } from "../flow"
import { cargarPlataDePrueba, monto } from "../plata"
import { Ajustes } from "./Ajustes"
import { Categoria } from "./Categoria"
import { Libro } from "./Libro"
import styles from "../styles.module.css"

type Tab = JarName | "libro" | "ajustes"
type ToneTab = Exclude<Tab, "ajustes">

const TABS = ["sacos", "flete", "adelanto", "libro", "ajustes"] as const

const vacio = {
	abierta: false,
	sacos: 0,
	flete: 0,
	adelanto: 0,
	saldo: 0,
	apartado: 0,
	asiento: "",
	tesorera: "",
	deuda: 0,
	esSocio: false,
}

type Pending =
	| { kind: "poner"; jar: JarName; amount: number }
	| { kind: "pedir"; jar: "sacos" | "flete"; amount: number; destino: string }
	| { kind: "adelanto"; amount: number }
	| { kind: "ver"; id: number; text: string }
	| { kind: "devolver"; id: number; jar: "sacos" | "flete"; amount: number }

function tabLabel(item: Tab) {
	switch (item) {
		case "sacos":
		case "flete":
		case "adelanto":
			return jarLabel(item)
		case "libro":
			return "Libro"
		case "ajustes":
			return "Ajustes"
		default: {
			const unknown: never = item
			return unknown
		}
	}
}

function toneOf(tab: ToneTab) {
	switch (tab) {
		case "sacos":
			return styles.toneSacos
		case "flete":
			return styles.toneFlete
		case "adelanto":
			return styles.toneAdelanto
		case "libro":
			return styles.toneLibro
		default: {
			const unknown: never = tab
			return unknown
		}
	}
}

function nameOf(people: Persona[], address: string) {
	return people.find((person) => person.address === address)?.name
}

export function Fondo() {
	const { address, balances, signTransaction, updateBalances } = useWallet()
	const cavos = useCavosState()
	const qc = useQueryClient()
	const fondo = useQuery({
		queryKey: ["fondos", address],
		queryFn: async () => {
			const [chain, people, rows, notes] = await Promise.all([
				leerFondo(address),
				nombres.lista(),
				libro.lineas(),
				libro.notas(),
			])
			const lines = []
			for (const row of rows) {
				const tx = await fondos.linea({ id: row.id })
				const status = tx.result.status
				if (status.tag === "Apartado") lines.push(row)
			}
			return { chain, people, lines, notes }
		},
	})
	const [tab, setTab] = useState<Tab>("sacos")
	const [pending, setPending] = useState<Pending | null>(null)
	const [error, setError] = useState("")
	const [plataBusy, setPlataBusy] = useState(false)

	const run = useMutation({
		mutationFn: async (fn: () => Promise<void>) => fn(),
		onSuccess: async () => {
			setError("")
			setPending(null)
			await qc.invalidateQueries({ queryKey: ["fondos"] })
		},
		onError: (err: Error) => setError(err.message),
	})

	const chain = fondo.data?.chain ?? vacio
	const people = fondo.data?.people ?? []
	const openLines = fondo.data?.lines ?? []
	const notes = fondo.data?.notes ?? []
	const myName = address ? nameOf(people, address) : undefined
	const seatName = chain.asiento
		? (nameOf(people, chain.asiento) ?? shortAddress(chain.asiento))
		: ""
	const jarAmount =
		tab === "sacos"
			? chain.sacos
			: tab === "flete"
				? chain.flete
				: tab === "adelanto"
					? chain.adelanto
					: 0
	const lines =
		tab === "sacos" || tab === "flete"
			? openLines.filter((line) => line.jar === tab)
			: []
	const ponerAmount = pending?.kind === "poner" ? pending.amount : 0
	const cover = Math.min(chain.deuda, ponerAmount)
	const rest = ponerAmount - cover
	const cuentaRaw = address ? balances[USDC_BALANCE_KEY]?.balance : undefined
	const paso = pasoActual({
		address,
		cavosListo: Boolean(cavos),
		nombre: myName,
		tienePlata: monto(cuentaRaw) > 0,
		abierta: chain.abierta,
		esSocio: chain.esSocio,
	})
	const listo = paso.id === "listo" && !fondo.isLoading && Boolean(fondo.data)

	async function cargar() {
		if (!address) return
		setPlataBusy(true)
		setError("")
		try {
			await cargarPlataDePrueba(address, signTransaction, balances)
			await updateBalances()
		} catch (err) {
			setError(errorMessage(err))
		} finally {
			setPlataBusy(false)
		}
	}

	function signCopy(item: Pending) {
		switch (item.kind) {
			case "poner":
				return textoDeConfirmacion({
					kind: "poner",
					amount: item.amount,
					jarLabel: jarLabel(item.jar),
					cover,
					rest,
				})
			case "pedir":
				return textoDeConfirmacion({
					kind: "pedir",
					amount: item.amount,
					jarLabel: jarLabel(item.jar),
					destino: item.destino,
					cover: 0,
					rest: item.amount,
				})
			case "adelanto":
				return textoDeConfirmacion({
					kind: "adelanto",
					amount: item.amount,
					jarLabel: "Adelanto",
					cover: 0,
					rest: item.amount,
				})
			case "ver":
				return item.text
			case "devolver":
				return textoDeConfirmacion({
					kind: "devolver",
					amount: item.amount,
					jarLabel: jarLabel(item.jar),
					cover: 0,
					rest: item.amount,
				})
			default: {
				const unknown: never = item
				return unknown
			}
		}
	}

	async function anotar(note: string) {
		try {
			await libro.anotar(note)
		} catch {
			/* El libro es un índice. La plata ya quedó en el contrato. */
		}
	}

	async function firmar(item: Pending) {
		if (!address) return
		const quien = myName ?? shortAddress(address)
		switch (item.kind) {
			case "poner":
				await run.mutateAsync(async () => {
					await poner(address, signTransaction, item.jar, item.amount)
					await anotar(
						cover > 0
							? `${quien} paga ${cover} USDC de adelanto y pone ${rest} en ${jarLabel(item.jar)}`
							: `${quien} puso ${item.amount} USDC en ${jarLabel(item.jar)}`,
					)
				})
				return
			case "pedir":
				await run.mutateAsync(async () => {
					const id = await pedir(
						address,
						signTransaction,
						item.jar,
						item.amount,
						item.destino,
					)
					await libro.guardarLinea({
						id,
						jar: item.jar,
						asker: address,
						amount: item.amount,
						destino: item.destino,
						status: "apartado",
					})
					await anotar(
						`${quien} apartó ${item.amount} USDC de ${jarLabel(item.jar)}: ${item.destino}`,
					)
				})
				return
			case "adelanto":
				await run.mutateAsync(async () => {
					await tomarAdelanto(address, signTransaction, item.amount)
					await anotar(`${quien} pidió ${item.amount} USDC de adelanto`)
				})
				return
			case "ver":
				await run.mutateAsync(async () => {
					await ver(address, signTransaction, item.id)
					await libro.guardarLinea({
						id: item.id,
						jar: "sacos",
						asker: address,
						amount: 1,
						destino: "visto",
						status: "visto",
					})
					await anotar(`${quien} confirmó un pedido`)
				})
				return
			case "devolver":
				await run.mutateAsync(async () => {
					await devolver(address, signTransaction, item.id)
					await libro.guardarLinea({
						id: item.id,
						jar: item.jar,
						asker: address,
						amount: item.amount,
						destino: "devuelto",
						status: "devuelto",
					})
					await anotar(
						`${quien} devolvió ${item.amount} USDC a ${jarLabel(item.jar)}`,
					)
				})
				return
			default: {
				const unknown: never = item
				return unknown
			}
		}
	}

	return (
		<div className={styles.stack}>
			{tab === "ajustes" ? null : (
				<>
					<p className={styles.purpose}>
						La plata de la cosecha, a la vista.
						<span>Todos ven el mismo número y para qué se usa.</span>
					</p>

					<section className={styles.total}>
						<span>Plata del grupo</span>
						<strong>{fondo.isLoading ? "…" : `${chain.saldo} USDC`}</strong>
					</section>
				</>
			)}

			{fondo.isLoading ? (
				<p className={styles.status}>Leyendo la plata…</p>
			) : null}
			{fondo.isError ? (
				<div className={styles.sign}>
					<p>No se pudo leer la plata.</p>
					<button
						className={styles.primary}
						type="button"
						onClick={() => void fondo.refetch()}
					>
						Probar de nuevo
					</button>
				</div>
			) : null}

			{tab === "ajustes" ? (
				<Ajustes />
			) : tab === "libro" ? (
				<Libro notes={notes} />
			) : (
				<Categoria
					jar={tab}
					jarAmount={jarAmount}
					deuda={chain.deuda}
					nombres={people.map((person) => person.name)}
					seatName={seatName}
					soyAsiento={Boolean(address) && address === chain.asiento}
					paso={paso}
					listo={listo}
					conocido={Boolean(fondo.data)}
					lines={lines}
					nombreDe={(who) => nameOf(people, who) ?? shortAddress(who)}
					puedeVer={(asker) =>
						Boolean(address) && asker !== address && address !== chain.tesorera
					}
					esQuienPidio={(asker) => asker === address}
					error={error}
					busy={run.isPending}
					pasoBusy={plataBusy}
					cuentaTexto={address ? (cuentaRaw ?? "0") : null}
					pendingText={pending ? signCopy(pending) : null}
					onAccion={(accion) => {
						switch (accion) {
							case "entrar":
								cavos?.signIn()
								return
							case "plata":
								void cargar()
								return
							case "ajustes":
								setTab("ajustes")
								return
							default: {
								const unknown: never = accion
								return unknown
							}
						}
					}}
					onConfirm={() => {
						if (pending) void firmar(pending)
					}}
					onCancel={() => setPending(null)}
					onPoner={(amount) => setPending({ kind: "poner", jar: tab, amount })}
					onPedir={(amount, destino) => {
						if (tab === "adelanto") return
						setPending({ kind: "pedir", jar: tab, amount, destino })
					}}
					onAdelanto={(amount) => setPending({ kind: "adelanto", amount })}
					onVer={(line) =>
						setPending({
							kind: "ver",
							id: line.id,
							text: textoDeConfirmacion({
								kind: "ver",
								amount: line.amount,
								jarLabel: jarLabel(line.jar),
								destino: line.destino,
								cover: 0,
								rest: line.amount,
								askerName:
									nameOf(people, line.asker) ?? shortAddress(line.asker),
							}),
						})
					}
					onDevolver={(line) =>
						setPending({
							kind: "devolver",
							id: line.id,
							jar: line.jar,
							amount: line.amount,
						})
					}
				/>
			)}

			<nav className={styles.tabbar} aria-label="Secciones">
				{TABS.map((item) => (
					<button
						key={item}
						type="button"
						className={`${styles.tab} ${tab === item ? `${styles.tabOn} ${item === "ajustes" ? "" : toneOf(item)}` : ""}`}
						onClick={() => {
							setTab(item)
							setPending(null)
							setError("")
						}}
					>
						{tabLabel(item)}
					</button>
				))}
			</nav>
		</div>
	)
}
