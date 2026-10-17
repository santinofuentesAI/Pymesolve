/**
 * @cavos/kit@0.2.5 ignores `config.redirectUri`. `login()` sends
 * `window.location.origin + window.location.pathname`, which on the home page
 * is `http://localhost:5173/` (trailing slash). The Cavos dashboard for this
 * app has `http://localhost:5173` with no slash, so Google OAuth returns 500.
 * The callback exchange must send that same URI (`handleCallback`'s
 * `redirect_uri`). Email OTP does not use it.
 *
 * Keep the literal in sync with `CAVOS_DEV_ORIGIN` in `src/cavos/config.ts`.
 */
export const CAVOS_REGISTERED_DEV_REDIRECT = "http://localhost:5173"

const HELPER = `function __cavosRegisteredRedirectUri(){if(typeof window==="undefined")return ${JSON.stringify(CAVOS_REGISTERED_DEV_REDIRECT)};var h=window.location.hostname;if(h==="localhost"||h==="127.0.0.1")return ${JSON.stringify(CAVOS_REGISTERED_DEV_REDIRECT)};return window.location.origin}\n`

export function patchCavosReactSource(code) {
	if (typeof code !== "string") return code
	if (code.includes("function __cavosRegisteredRedirectUri")) return code
	let next = code
	next = next.replaceAll(
		"window.location.origin + window.location.pathname",
		"__cavosRegisteredRedirectUri()",
	)
	next = next.replaceAll(
		"auth.getGoogleOAuthUrl(window.location.origin)",
		"auth.getGoogleOAuthUrl(__cavosRegisteredRedirectUri())",
	)
	next = next.replaceAll(
		"auth.getAppleOAuthUrl(window.location.origin)",
		"auth.getAppleOAuthUrl(__cavosRegisteredRedirectUri())",
	)
	next = next.replaceAll(
		"handleCallback(authData, cleanUrl.toString())",
		"handleCallback(authData, __cavosRegisteredRedirectUri())",
	)
	next = next.replaceAll(
		"handleCallback(authData, cleanUrl.origin)",
		"handleCallback(authData, __cavosRegisteredRedirectUri())",
	)
	if (next === code) return code
	return HELPER + next
}

function isCavosReactEntry(id) {
	const path = id.split("?")[0] ?? id
	return path.includes("@cavos/kit") && path.includes("/react/index.")
}

/** Vite + Rolldown plugin. Survives `npm install` because it never edits node_modules. */
export function cavosGoogleRedirectPlugin() {
	return {
		name: "cavos-google-redirect",
		enforce: "pre",
		transform(code, id) {
			if (!isCavosReactEntry(id)) return null
			const next = patchCavosReactSource(code)
			if (next === code) return null
			return { code: next, map: null }
		},
	}
}
