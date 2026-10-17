import { pools } from "@stellar-scaffold/app-lib/clients"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useCavosState } from "../../cavos/context"
import { useWallet } from "../../hooks/useWallet"
import { errorMessage } from "../../lib/errors"
import { explorerUrl, USDC_BALANCE_KEY } from "../../trustless/config"
import { api } from "../api"
import { OFICIO_OPCIONES, RUBRO_OPCIONES } from "../labels"
import { resetSession, setMode, useMode } from "../mode"
import { cargarPlataDePrueba, monto } from "../plata"
import styles from "../styles.module.css"
import { setAppMode, setTheme, usePrefs, type ThemeName } from "../theme"
import { type Role } from "../types"

const THEMES: { id: ThemeName; label: string; hint: string; swatch: string }[] = [
	{
		id: "papel",
		label: "Papel claro",
		hint: "Fondo claro",
		swatch: styles.swatchPapel ?? "",
	},
	{
		id: "campo",
		label: "Verde campo",
		hint: "Verde",
		swatch: styles.swatchCampo ?? "",
	},
	{
		id: "noche",
		label: "Noche",
		hint: "Fondo oscuro",
		swatch: styles.swatchNoche ?? "",
	},
]

export function Ajustes() {
	const { role, actorId } = useMode()
	const { theme } = usePrefs()
	const { address, balances, signTransaction, updateBalances } = useWallet()
	const cavos = useCavosState()
	const qc = useQueryClient()
	const nav = useNavigate()
	const pymes = useQuery({ queryKey: ["pymes"], queryFn: api.pymes })
	const devs = useQuery({ queryKey: ["devs"], queryFn: api.devs })
	const gemma = useQuery({ queryKey: ["gemma"], queryFn: api.gemma })
	const me =
		role === "admin"
			? undefined
			: [...(pymes.data ?? []), ...(devs.data ?? [])].find((u) => u.id === actorId)
	const [name, setName] = useState(me?.name ?? "")
	const [place, setPlace] = useState(me?.neighborhood ?? "")
	const [trade, setTrade] = useState(me?.trade ?? "")
	const [bio, setBio] = useState(me?.bio ?? "")
	const [github, setGithub] = useState(me?.github ?? "")
	const [drive, setDrive] = useState(me?.drive ?? "")
	const [social, setSocial] = useState(me?.social ?? "")
	const [linkedin, setLinkedin] = useState(me?.linkedin ?? "")
	const [busy, setBusy] = useState("")
	const [note, setNote] = useState("")
	const [sureReset, setSureReset] = useState(false)

	useEffect(() => {
		if (!me) return
		setName(me.name)
		setPlace(me.neighborhood)
		setTrade(me.trade)
		setBio(me.bio ?? "")
		setGithub(me.github ?? "")
		setDrive(me.drive ?? "")
		setSocial(me.social ?? "")
		setLinkedin(me.linkedin ?? "")
	}, [me])

	const usdc = monto(balances[USDC_BALANCE_KEY]?.balance)
	const contractId = pools.options.contractId as string | undefined

	async function act(label: string, fn: () => Promise<unknown>) {
		setBusy(label)
		setNote("")
		try {
			await fn()
			setNote(`${label}.`)
		} catch (e) {
			setNote(errorMessage(e))
		} finally {
			setBusy("")
		}
	}

	return (
		<section className={styles.settings}>
			<p className={styles.kicker}>Ajustes</p>
			<h1 className={styles.display}>
				{role === "admin"
					? "La mesa y el color."
					: role === "dev"
						? "Tu oficio y el color."
						: "Tu comercio y el color."}
			</h1>
			{note ? <p className={styles.note}>{note}</p> : null}

			<h2>Entrar</h2>
			{address ? (
				<p>Listo{cavos?.email ? `, ${cavos.email}` : ""}.</p>
			) : (
				<>
					<p className={styles.lede}>
						Correo o Google te arma la cuenta. No hace falta una wallet.
					</p>
					{cavos ? (
						<button
							type="button"
							className={styles.primary}
							onClick={() => cavos.signIn()}
						>
							Entrar
						</button>
					) : (
						<p>
							El ingreso con correo o Google se activa con el App ID de
							Cavos. Mientras, usá una wallet de Stellar arriba.
						</p>
					)}
				</>
			)}

			{role === "admin" && (
				<div className={styles.list}>
					<Link className={styles.listRow} to="/mesa">
						<div>
							<p className={styles.kicker}>Altas</p>
							<p>
								<strong>Mirar enlaces de oficios</strong>
							</p>
						</div>
					</Link>
					<Link className={styles.listRow} to="/asistente">
						<div>
							<p className={styles.kicker}>Chats</p>
							<p>
								<strong>Solo si un comercio te llamó</strong>
							</p>
						</div>
					</Link>
				</div>
			)}

			{role !== "admin" ? (
				<>
					<h2>{role === "dev" ? "Cómo te presentás" : "Tu comercio"}</h2>
					<p className={styles.lede}>
						{role === "dev"
							? "La pyme lee esto antes de dejarte el encargo: qué hacés, para quién y cómo cobrás."
							: "El oficio lee esto para saber qué es el local, no solo el pedido."}
					</p>
					<div className={styles.form}>
						<label>
							Nombre
							<input value={name} onChange={(e) => setName(e.target.value)} />
						</label>
						<label>
							Barrio
							<input value={place} onChange={(e) => setPlace(e.target.value)} />
						</label>
						<label>
							{role === "dev" ? "Oficio" : "Rubro"}
							<select
								value={trade}
								onChange={(e) => setTrade(e.target.value)}
							>
								{trade &&
								!(role === "dev" ? OFICIO_OPCIONES : RUBRO_OPCIONES).some(
									(opt) => opt.id === trade,
								) ? (
									<option value={trade}>{trade}</option>
								) : null}
								{(role === "dev" ? OFICIO_OPCIONES : RUBRO_OPCIONES).map(
									(opt) => (
										<option key={opt.id} value={opt.id}>
											{opt.label}
										</option>
									),
								)}
							</select>
						</label>
						<label>
							{role === "dev" ? "Qué hacés" : "Qué es este comercio"}
							<textarea
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								maxLength={420}
								placeholder={
									role === "dev"
										? "Qué hacés, para quién y cómo cobrás."
										: "Qué venden, a qué hora y qué les falta."
								}
							/>
						</label>
						{role === "dev" && (
							<>
								<label>
									Drive o videos del trabajo
									<input
										value={drive}
										onChange={(e) => setDrive(e.target.value)}
										placeholder="https://…"
									/>
								</label>
								<label>
									Página o WhatsApp
									<input
										value={social}
										onChange={(e) => setSocial(e.target.value)}
										placeholder="https://…"
									/>
								</label>
								<label>
									GitHub
									<input
										value={github}
										onChange={(e) => setGithub(e.target.value)}
										placeholder="usuario"
									/>
								</label>
								<label>
									LinkedIn o Fiverr
									<input
										value={linkedin}
										onChange={(e) => setLinkedin(e.target.value)}
										placeholder="https://…"
									/>
								</label>
							</>
						)}
						<button
							type="button"
							disabled={busy !== "" || name.trim().length < 2}
							onClick={() =>
								void act("Presentación guardada", async () => {
									await api.saveProfile({
										id: actorId,
										kind: role === "dev" ? "dev" : "pyme",
										name: name.trim(),
										trade: trade.trim(),
										bio: bio.trim(),
										neighborhood: place.trim(),
										github: github.trim() || undefined,
										drive: drive.trim() || undefined,
										social: social.trim() || undefined,
										linkedin: linkedin.trim() || undefined,
									})
									await qc.invalidateQueries()
								})
							}
						>
							Guardar
						</button>
					</div>
				</>
			) : (
				<p className={styles.note}>
					La mesa no publica ni toma encargos. No hace falta portafolio.
				</p>
			)}

			{role !== "admin" ? (
				<>
					<h2>Plata de prueba</h2>
					{usdc > 0 ? (
						<p>Listo. {usdc} USDC de prueba.</p>
					) : (
						<button
							type="button"
							className={styles.primary}
							disabled={!address || busy !== ""}
							onClick={() =>
								void act("Plata de prueba lista", async () => {
									if (!address) return
									await cargarPlataDePrueba(
										address,
										signTransaction,
										balances,
										setNote,
									)
									await updateBalances()
								})
							}
						>
							Cargar plata de prueba
						</button>
					)}
				</>
			) : null}

			<h2>Tema</h2>
			<div className={styles.chips}>
				{THEMES.map((t) => (
					<button
						key={t.id}
						type="button"
						className={theme === t.id ? styles.primary : undefined}
						onClick={() => setTheme(t.id)}
					>
						<span className={`${styles.swatch} ${t.swatch}`} />
						{t.label}
					</button>
				))}
			</div>

			<h2>Datos de prueba</h2>
			<p className={styles.lede}>
				Esta app es de prueba. Sembrar de nuevo borra encargos, chats y
				presentaciones de esta máquina y vuelve a poner los comercios y oficios
				de ejemplo.
			</p>
			<button
				type="button"
				disabled={busy !== ""}
				onClick={() => {
					if (!sureReset) {
						setSureReset(true)
						setNote("Confirmá: se borra todo lo de esta máquina.")
						return
					}
					void act("Datos de prueba listos", async () => {
						await api.reset()
						resetSession()
						setAppMode("inicio")
						setSureReset(false)
						await qc.invalidateQueries()
						nav("/")
					})
				}}
			>
				{sureReset ? "Sí, borrar y sembrar de nuevo" : "Volver a sembrar todo"}
			</button>

			<details className={styles.details}>
				<summary>Probar como otra persona</summary>
				<p className={styles.lede}>
					Solo para esta máquina. Pyme publica, usuario toma, mesa mira.
				</p>
				<div className={styles.chips}>
					{(
						[
							["pyme", "Pyme"],
							["dev", "Usuario"],
							["admin", "Mesa"],
						] as [Role, string][]
					).map(([id, label]) => (
						<button
							key={id}
							type="button"
							className={role === id ? styles.primary : undefined}
							onClick={() => setMode({ role: id })}
						>
							{label}
						</button>
					))}
				</div>
				{role === "pyme" ? (
					<div className={styles.chips}>
						{(pymes.data ?? []).map((p) => (
							<button
								key={p.id}
								type="button"
								className={actorId === p.id ? styles.primary : undefined}
								onClick={() => setMode({ actorId: p.id, role: "pyme" })}
							>
								{p.name}
							</button>
						))}
					</div>
				) : null}
				{role === "dev" ? (
					<div className={styles.chips}>
						{(devs.data ?? []).map((d) => (
							<button
								key={d.id}
								type="button"
								className={actorId === d.id ? styles.primary : undefined}
								onClick={() => setMode({ actorId: d.id, role: "dev" })}
							>
								{d.name}
								{d.verified ? "" : " · revisión"}
							</button>
						))}
					</div>
				) : null}
			</details>

			<details className={styles.details}>
				<summary>Cómo está hecha</summary>
				<p>
					Hecha con Scaffold Stellar. El estado del encargo vive en el contrato
					de la red de prueba. El USDC espera en un retén de Trustless Work.
					Se entra con correo o Google (Cavos). El modelo Gemma 4 E2B corre en
					esta máquina
					{gemma.data?.ok ? ` (${gemma.data.model})` : " si está instalado"}.
				</p>
				{contractId ? (
					<p>
						<a href={explorerUrl(contractId)} target="_blank" rel="noreferrer">
							Ver el contrato en el explorador
						</a>
					</p>
				) : (
					<p>El contrato aparece acá cuando Scaffold lo despliega.</p>
				)}
			</details>
		</section>
	)
}
