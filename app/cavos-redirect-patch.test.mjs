import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import {
	CAVOS_REGISTERED_DEV_REDIRECT,
	patchCavosReactSource,
} from "./cavos-redirect-patch.mjs"

const here = dirname(fileURLToPath(import.meta.url))

const originalLogin =
	'const url = await (provider === "google" ? auth.getGoogleOAuthUrl(window.location.origin + window.location.pathname) : auth.getAppleOAuthUrl(window.location.origin + window.location.pathname));\n' +
	"await handleCallback(authData, cleanUrl.toString());\n" +
	"await auth.sendOtp(email);\n"

test("Google redirect_uri is the registered origin with no slash", () => {
	const patched = patchCavosReactSource(originalLogin)
	assert.match(
		patched,
		/auth\.getGoogleOAuthUrl\(__cavosRegisteredRedirectUri\(\)\)/,
	)
	assert.doesNotMatch(patched, /location\.pathname/)
	assert.match(
		patched,
		/handleCallback\(authData, __cavosRegisteredRedirectUri\(\)\)/,
	)
	assert.match(patched, /await auth\.sendOtp\(email\)/)

	const redirect = vm.runInNewContext(
		`${patched.match(/function __cavosRegisteredRedirectUri\(\)\{[\s\S]*?\n/)?.[0]}\n__cavosRegisteredRedirectUri()`,
		{
			window: {
				location: { hostname: "localhost", origin: "http://localhost:5173" },
			},
		},
	)
	assert.equal(redirect, CAVOS_REGISTERED_DEV_REDIRECT)
	assert.equal(redirect.endsWith("/"), false)

	const params = new URLSearchParams({
		nonce: "n",
		redirect_uri: redirect,
		app_id: "ed2dbae5-8927-4f47-a778-a4c118bf12a2",
	})
	const request = `https://cavos.xyz/api/oauth/v2/google?${params}`
	assert.equal(
		new URL(request).searchParams.get("redirect_uri"),
		"http://localhost:5173",
	)
})

test("127.0.0.1 still sends the localhost callback", () => {
	const patched = patchCavosReactSource(originalLogin)
	const fn = patched.match(
		/function __cavosRegisteredRedirectUri\(\)\{[\s\S]*?\n/,
	)?.[0]
	const redirect = vm.runInNewContext(`${fn}\n__cavosRegisteredRedirectUri()`, {
		window: {
			location: { hostname: "127.0.0.1", origin: "http://127.0.0.1:5173" },
		},
	})
	assert.equal(redirect, "http://localhost:5173")
})

test("published react entry is patched at login and callback", () => {
	const source = readFileSync(
		join(here, "../node_modules/@cavos/kit/dist/react/index.mjs"),
		"utf8",
	)
	const patched = patchCavosReactSource(source)
	assert.notEqual(patched, source)
	assert.match(
		patched,
		/getGoogleOAuthUrl\(__cavosRegisteredRedirectUri\(\)\)/,
	)
	assert.match(
		patched,
		/handleCallback\(authData, __cavosRegisteredRedirectUri\(\)\)/,
	)
	assert.doesNotMatch(
		patched,
		/getGoogleOAuthUrl\(window\.location\.origin \+ window\.location\.pathname\)/,
	)
	assert.doesNotMatch(
		patched,
		/handleCallback\(authData, cleanUrl\.toString\(\)\)/,
	)
	assert.doesNotMatch(
		patched,
		/handleCallback\(authData, cleanUrl\.origin\)/,
	)
	const marker = "auth.sendOtp(email)"
	assert.equal(source.includes(marker), true)
	assert.equal(
		patched.split(marker).length,
		source.split(marker).length,
	)
})
