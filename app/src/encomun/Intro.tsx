import { useState } from "react"
import styles from "./styles.module.css"

const STEPS = [
	{
		title: "Una sola plata, a la vista",
		body: "El número verde es el dinero de todo el grupo. Todos ven el mismo.",
	},
	{
		title: "Cada plata tiene un uso",
		body: "Sacos es para comprar sacos. Flete es para el camión. Adelanto es un préstamo para una sola persona.",
	},
	{
		title: "Pedir no es sacarla ya",
		body: "Si pedís sacos o flete, otra persona tiene que decir que lo vio. Recién ahí sale la plata.",
	},
]

export function Intro({ onDone }: { onDone: () => void }) {
	const [step, setStep] = useState(0)
	const current = STEPS[step]
	const last = step === STEPS.length - 1
	if (!current) return null

	return (
		<div className={styles.intro}>
			<div className={styles.introPanel}>
				<div className={styles.introTop}>
					<span>
						{step + 1} de {STEPS.length}
					</span>
					<button type="button" onClick={onDone}>
						Cerrar
					</button>
				</div>
				<div className={styles.introBody}>
					<h1>{current.title}</h1>
					<p>{current.body}</p>
				</div>
				<button
					type="button"
					className={styles.primary}
					onClick={() => {
						if (last) onDone()
						else setStep((n) => n + 1)
					}}
				>
					{last ? "Entendido" : "Siguiente"}
				</button>
			</div>
		</div>
	)
}
