import { NavLink, Route, Routes, useLocation } from "react-router-dom"
import { WalletButton } from "../components/WalletButton"
import { Who } from "./components/Who"
import { useMode } from "./mode"
import { Ajustes } from "./pages/Ajustes"
import { Altas } from "./pages/Altas"
import { Asistente } from "./pages/Asistente"
import { AsistenteCaso } from "./pages/AsistenteCaso"
import { Dopamina } from "./pages/Dopamina"
import { Chats } from "./pages/Chats"
import { Encargo } from "./pages/Encargo"
import { Encargos } from "./pages/Encargos"
import { Libro } from "./pages/Libro"
import { MesaInicio } from "./pages/MesaInicio"
import { Perfil } from "./pages/Perfil"
import { Problemas } from "./pages/Problemas"
import { Publicar } from "./pages/Publicar"
import styles from "./styles.module.css"
import { usePrefs } from "./theme"
import { type Role } from "./types"

function tabsFor(
	role: Role,
	_actorId: string,
): { to: string; label: string; end: boolean }[] {
	switch (role) {
		case "pyme":
			return [
				{ to: "/", label: "Problemas", end: true },
				{ to: "/encargos", label: "Encargos", end: false },
				{ to: "/publicar", label: "Publicar", end: false },
				{ to: "/libro", label: "Libro", end: false },
				{ to: "/ajustes", label: "Ajustes", end: false },
			]
		case "dev":
			return [
				{ to: "/", label: "Ofertas", end: true },
				{ to: "/encargos", label: "Encargos", end: false },
				{ to: "/chats", label: "Chats", end: false },
				{ to: "/libro", label: "Libro", end: false },
				{ to: "/ajustes", label: "Ajustes", end: false },
			]
		case "admin":
			return [
				{ to: "/", label: "Mesa", end: true },
				{ to: "/mesa", label: "Altas", end: false },
				{ to: "/asistente", label: "Chats", end: false },
				{ to: "/libro", label: "Libro", end: false },
				{ to: "/ajustes", label: "Ajustes", end: false },
			]
		default: {
			const neverRole: never = role
			return neverRole
		}
	}
}

function homeOf(role: Role, dopamina: boolean) {
	if (role === "admin") return <MesaInicio />
	if (dopamina) return <Dopamina />
	return <Problemas />
}

export default function MarketApp() {
	const { theme, appMode } = usePrefs()
	const { role, actorId } = useMode()
	const loc = useLocation()
	const tabs = tabsFor(role, actorId)

	return (
		<div className={styles.shell} data-theme={theme} data-mode={appMode}>
			<div className={styles.frame}>
				<header className={styles.header}>
					<NavLink to="/" className={styles.logo}>
						PymeSolve
						<span>Quién te lo hace</span>
					</NavLink>
					<WalletButton />
				</header>
				<Who />
				<main className={styles.main}>
					<Routes>
						<Route
							path="/"
							element={homeOf(role, appMode === "dopamina")}
						/>
						<Route path="/encargos" element={<Encargos />} />
						<Route path="/encargo/:id" element={<Encargo />} />
						<Route path="/chats" element={<Chats />} />
						<Route path="/chats/:id" element={<Chats />} />
						<Route path="/publicar" element={<Publicar />} />
						<Route path="/libro" element={<Libro />} />
						<Route path="/ajustes" element={<Ajustes />} />
						<Route path="/perfil/:id" element={<Perfil />} />
						<Route path="/mesa" element={<Altas />} />
						<Route path="/asistente" element={<Asistente />} />
						<Route path="/asistente/:id" element={<AsistenteCaso />} />
					</Routes>
				</main>
				<nav className={styles.tabbar} aria-label="Secciones">
					{tabs.map((tab) => (
						<NavLink
							key={tab.to}
							to={tab.to}
							end={tab.end}
							className={({ isActive }) => {
								const on =
									isActive ||
									(tab.to === "/encargos" &&
										loc.pathname.startsWith("/encargo")) ||
									(tab.to === "/chats" &&
										loc.pathname.startsWith("/chats")) ||
									(tab.to === "/asistente" &&
										loc.pathname.startsWith("/asistente"))
								return `${styles.tab} ${on ? styles.tabOn : ""}`
							}}
						>
							{tab.label}
						</NavLink>
					))}
				</nav>
			</div>
		</div>
	)
}
