import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "../api"
import { useMode } from "../mode"
import styles from "../styles.module.css"
import { type Role } from "../types"

export function roleLabel(role: Role): string {
	switch (role) {
		case "pyme":
			return "Comercio"
		case "dev":
			return "Usuario"
		case "admin":
			return "Mesa"
		default: {
			const neverRole: never = role
			return neverRole
		}
	}
}

export function useActorName(): string | undefined {
	const { role, actorId } = useMode()
	const pymes = useQuery({ queryKey: ["pymes"], queryFn: api.pymes })
	const devs = useQuery({ queryKey: ["devs"], queryFn: api.devs })
	if (role === "admin") return "La mesa"
	const list = role === "dev" ? devs.data : pymes.data
	return list?.find((u) => u.id === actorId)?.name
}

export function Who() {
	const { role, actorId } = useMode()
	const pymes = useQuery({ queryKey: ["pymes"], queryFn: api.pymes })
	const devs = useQuery({ queryKey: ["devs"], queryFn: api.devs })
	const loading = role === "dev" ? devs.isLoading : role === "pyme" ? pymes.isLoading : false
	const me =
		role === "dev"
			? devs.data?.find((u) => u.id === actorId)
			: role === "pyme"
				? pymes.data?.find((u) => u.id === actorId)
				: undefined
	const name =
		role === "admin" ? "La mesa" : loading ? "…" : (me?.name ?? "Elegí quién sos")

	return (
		<Link to="/ajustes" className={styles.who}>
			<strong>{name}</strong>
			<span>
				{roleLabel(role)}
				{role === "dev" && me && !me.verified ? " · en revisión" : ""}
			</span>
		</Link>
	)
}
