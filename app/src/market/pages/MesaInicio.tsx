import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "../api"
import styles from "../styles.module.css"

export function MesaInicio() {
	const altas = useQuery({ queryKey: ["altas"], queryFn: api.altas })
	const summons = useQuery({ queryKey: ["summons"], queryFn: api.summons })
	const nAltas = altas.data?.length ?? 0
	const nChats = summons.data?.length ?? 0

	return (
		<section>
			<p className={styles.kicker}>La mesa</p>
			<h1 className={styles.display}>Mirás altas y chats. No tomás encargos.</h1>
			<p className={styles.lede}>
				Entras al chat solo si un comercio te llama por un desacuerdo.
			</p>
			<article className={styles.card}>
				<p className={styles.kicker}>Altas</p>
				<h2>
					{nAltas === 0
						? "Nadie en revisión."
						: nAltas === 1
							? "1 enlace para mirar."
							: `${nAltas} enlaces para mirar.`}
				</h2>
				<Link className={styles.block} to="/mesa">
					<button type="button" className={styles.primary}>
						Revisar altas
					</button>
				</Link>
			</article>
			<article className={styles.card}>
				<p className={styles.kicker}>Chats</p>
				<h2>
					{nChats === 0
						? "Nadie te llamó."
						: nChats === 1
							? "1 chat abierto."
							: `${nChats} chats abiertos.`}
				</h2>
				<Link className={styles.block} to="/asistente">
					<button type="button">Abrir bandeja</button>
				</Link>
			</article>
		</section>
	)
}
