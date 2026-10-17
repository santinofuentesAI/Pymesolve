import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import wasm from "vite-plugin-wasm"
import { cavosGoogleRedirectPlugin } from "./cavos-redirect-patch.mjs"

// https://vite.dev/config/
// @cavos/kit@0.2.5 ignores config.redirectUri. This plugin forces the URI
// registered in the Cavos dashboard. It also runs during dep optimization,
// which is the bundle the dev server actually serves.
const cavosGoogleRedirect = cavosGoogleRedirectPlugin()
const present = process.env.PYMESOLVE_PRESENT === "1"

export default defineConfig({
	plugins: [
		cavosGoogleRedirect,
		react(),
		nodePolyfills({
			include: ["buffer"],
			globals: {
				Buffer: true,
			},
		}),
		wasm(),
	],
	build: {
		target: "esnext",
	},
	optimizeDeps: {
		exclude: ["@stellar/stellar-xdr-json"],
		rolldownOptions: {
			plugins: [cavosGoogleRedirect],
		},
	},
	define: {
		global: "window",
	},
	envPrefix: "PUBLIC_",
	server: {
		// Fixed port: Cavos only allows the origins registered in its dashboard
		// (http://localhost:5173), so fail loudly instead of moving to 5174.
		port: 5173,
		strictPort: true,
		host: true,
		// Durante la demo no hay recarga en caliente: un reinicio a mitad
		// del correo deja a Cavos colgado en "Connecting".
		hmr: present ? false : undefined,
		watch: present ? { ignored: ["**"] } : undefined,
		proxy: {
			"/friendbot": {
				target: "http://localhost:8000/friendbot",
				changeOrigin: true,
			},
			"/api": {
				target: "http://127.0.0.1:8787",
				changeOrigin: true,
			},
		},
	},
})
