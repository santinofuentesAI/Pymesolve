import { useState } from "react"
import { Route, Routes } from "react-router-dom"
import { WalletButton } from "../components/WalletButton"
import { Intro } from "./Intro"
import { Fondo } from "./pages/Fondo"
import styles from "./styles.module.css"
import { usePrefs } from "./theme"

const INTRO_KEY = "encomun-intro"

export default function EncomunApp() {
	const [intro, setIntro] = useState(() => {
		try {
			return localStorage.getItem(INTRO_KEY) !== "visto"
		} catch {
			return false
		}
	})
	const { theme, motion } = usePrefs()

	function closeIntro() {
		localStorage.setItem(INTRO_KEY, "visto")
		setIntro(false)
	}

	return (
		<div className={styles.shell} data-theme={theme} data-motion={motion}>
			{intro && <Intro onDone={closeIntro} />}
			<div className={styles.frame}>
				<header className={styles.header}>
					<div className={styles.logo}>
						EnComún
						<span>Fondo de la cosecha</span>
					</div>
					<div className={styles.headerTools}>
						<WalletButton />
						<button type="button" className={styles.explain} onClick={() => setIntro(true)}>
							Cómo funciona
						</button>
					</div>
				</header>
				<main className={styles.main}>
					<Routes>
						<Route path="*" element={<Fondo />} />
					</Routes>
				</main>
			</div>
		</div>
	)
}
