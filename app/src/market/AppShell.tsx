import { useQuery } from "@tanstack/react-query"
import { NavLink, Outlet } from "react-router-dom"
import ConnectAccount from "../components/ConnectAccount"
import { useWallet } from "../hooks/useWallet"
import { USDC_BALANCE_KEY } from "../trustless/config"
import { api } from "./api"
import { useMode } from "./mode"
import styles from "./styles.module.css"

export function AppShell() {
	const { role, actorId } = useMode()
	const { address, balances } = useWallet()
	const usdc = balances[USDC_BALANCE_KEY]?.balance
	const people = useQuery({
		queryKey: ["who", role],
		queryFn: () => (role === "dev" ? api.devs() : api.pymes()),
		enabled: role !== "admin",
	})
	const me =
		role === "admin"
			? { name: "Mesa" }
			: (people.data ?? []).find((u) => u.id === actorId)

	return (
		<div className={styles.shell}>
			<header className={styles.header}>
				<NavLink to="/" className={styles.logo}>
					EnComún
					<span>talonario del barrio</span>
				</NavLink>
				<nav className={styles.nav}>
					<NavLink
						to="/"
						end
						className={({ isActive }) => (isActive ? styles.active : "")}
					>
						Mercado
					</NavLink>
					<NavLink
						to="/recetas"
						className={({ isActive }) => (isActive ? styles.active : "")}
					>
						Recetas
					</NavLink>
					{role === "pyme" && (
						<NavLink
							to="/publicar"
							className={({ isActive }) => (isActive ? styles.active : "")}
						>
							Publicar
						</NavLink>
					)}
					{role === "dev" && (
						<NavLink
							to="/perfil"
							className={({ isActive }) => (isActive ? styles.active : "")}
						>
							Oficio
						</NavLink>
					)}
					{role === "admin" && (
						<NavLink
							to="/altas"
							className={({ isActive }) => (isActive ? styles.active : "")}
						>
							Altas
						</NavLink>
					)}
					{role === "admin" && (
						<NavLink
							to="/asistente"
							className={({ isActive }) => (isActive ? styles.active : "")}
						>
							Asistente
						</NavLink>
					)}
					<NavLink
						to="/ajustes"
						className={({ isActive }) => (isActive ? styles.active : "")}
					>
						Ajustes
					</NavLink>
				</nav>
				<div className={styles.who}>
					<span className={styles.roleChip}>
						{role} · {me?.name ?? actorId}
					</span>
					{address && (
						<span className={styles.cash}>{usdc ?? "0"} USDC</span>
					)}
					<ConnectAccount />
				</div>
			</header>
			<main className={styles.main}>
				<Outlet />
			</main>
			<footer className={styles.footer}>
				<span>Testnet · el USDC espera en el retén, no en la mesa.</span>
				<span>Ficha {role}</span>
			</footer>
		</div>
	)
}
