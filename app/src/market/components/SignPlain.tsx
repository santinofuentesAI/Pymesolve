import { type ReactNode } from "react"
import styles from "../styles.module.css"

/** Una frase de mostrador antes de que salte la wallet. */
export function SignPlain({ children }: { children: ReactNode }) {
	return <p className={styles.plain}>{children}</p>
}
