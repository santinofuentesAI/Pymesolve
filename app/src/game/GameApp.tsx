// DeFiesta — top-level game shell. Switches screens and mounts the board.
import styles from "./game.module.css"
import BoardCanvas from "./scene/BoardCanvas"
import { useGameStore, useTurnController } from "./store"
import Credits from "./ui/Credits"
import Hud from "./ui/Hud"
import MainMenu from "./ui/MainMenu"
import ModeSelect from "./ui/ModeSelect"
import Results from "./ui/Results"
import Settings from "./ui/Settings"
import Setup from "./ui/Setup"
import MinigameScreen from "./ui/Minigame"

function BoardScreen() {
	useTurnController()
	return (
		<div className={styles.board}>
			<BoardCanvas />
			<Hud />
		</div>
	)
}

export default function GameApp() {
	const screen = useGameStore((s) => s.screen)

	return (
		<div className={styles.root}>
			{screen === "menu" && <MainMenu />}
			{screen === "mode" && <ModeSelect />}
			{screen === "setup" && <Setup />}
			{screen === "settings" && <Settings />}
			{screen === "credits" && <Credits />}
			{screen === "board" && <BoardScreen />}
			{screen === "minigame" && <MinigameScreen />}
			{screen === "results" && <Results />}
		</div>
	)
}
