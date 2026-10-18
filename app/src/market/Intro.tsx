import { useState } from "react"
import styles from "./styles.module.css"

const STEPS: {
	kicker: string
	title: string
	body?: string
	points?: string[]
}[] = [
	{
		kicker: "El problema",
		title: "El mismo video. Tres veces.",
		body: "Una soda, una pulpería y un salón necesitan 20 segundos del plato. Hoy pagan tres presupuestos por un solo trabajo.",
	},
	{
		kicker: "Costa Rica",
		title: "36.098 pymes ya registradas.",
		body: "De 2022 a 2026 casi se duplicaron en el MEIC. 98 de cada 100 empresas del país son pymes. No es un nicho: es el mostrador.",
	},
	{
		kicker: "Qué resuelve",
		title: "Pagan una vez.",
		body: "Cada una pone 10. La meta es 30 USDC. Un oficio cobra esa meta, no tres trabajos sueltos.",
	},
	{
		kicker: "¿Quién me lo hace?",
		title: "El oficio que ya tiene la carta.",
		body: "Si el pedido se parece a uno que ya se resolvió, se le ofrece primero a quien lo dejó escrito.",
	},
	{
		kicker: "¿Y si nadie lo toma?",
		title: "Sigue abierto.",
		body: "No se inventa un trabajador. Primero la dueña de la carta. Después, oficios que dijeron que ese rubro les sirve.",
	},
	{
		kicker: "¿Y si se lleva la plata?",
		title: "La plata espera.",
		body: "Sale con la carta del lunes y un “Yo lo vi” de otra persona. Quien pide el trabajo no se confirma a sí mismo.",
	},
	{
		kicker: "¿Mi nombre queda público?",
		title: "El nombre se queda afuera.",
		body: "El barrio y el chat también. En el libro, la otra pyme aparece como “Un comercio”.",
	},
	{
		kicker: "¿Una máquina decide?",
		title: "No firma y no mueve plata.",
		body: "Tampoco verifica gente. Quién cobra lo deciden la carta, “Yo lo vi” y, si hay pelea, la mesa.",
	},
	{
		kicker: "¿Esto es plata de verdad?",
		title: "En la demo, no vale.",
		body: "Es plata de prueba para ver el camino. Lo que se enseña es el trato: una vez, no tres.",
	},
	{
		kicker: "Qué hace",
		title: "Una app, un encargo.",
		points: [
			"Junta el mismo pedido.",
			"Muestra el precio de sumarte y el de hacerlo solo.",
			"Guarda la carta para el próximo grupo.",
			"Pasa oficios como un mazo.",
		],
	},
	{
		kicker: "La próxima",
		title: "Esa carta se cobra otra vez.",
		body: "El lunes queda el ritual. El próximo grupo no empieza de cero: se suma, y el oficio lo cobra de nuevo.",
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
						Saltar
					</button>
				</div>
				<div className={styles.introBody}>
					<p className={styles.kicker}>{current.kicker}</p>
					<h1>{current.title}</h1>
					{current.body ? <p>{current.body}</p> : null}
					{current.points ? (
						<ul>
							{current.points.map((point) => (
								<li key={point}>{point}</li>
							))}
						</ul>
					) : null}
				</div>
				<div className={styles.introNav}>
					<button
						type="button"
						disabled={step === 0}
						onClick={() => setStep((n) => n - 1)}
					>
						Atrás
					</button>
					<button
						type="button"
						className={styles.primary}
						onClick={() => {
							if (last) onDone()
							else setStep((n) => n + 1)
						}}
					>
						{last ? "Empezar" : "Siguiente"}
					</button>
				</div>
			</div>
		</div>
	)
}
