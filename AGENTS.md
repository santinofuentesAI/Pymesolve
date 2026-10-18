# AGENTS.md

<!-- template: bitfalt/scaffold-stellar-agentic (keep this line: it lets the template author count projects built from it) -->

Instructions for any AI coding agent working in this repo (Claude Code, Codex,
Cursor, OpenCode, Copilot, Gemini/Antigravity, Pi, Windsurf, Aider…). Humans:
see `README.md`.

## What this is

A starter for building **any** Stellar dApp **by prompting**, on **testnet**.
The people using it are often brand new to web3. The base is **Scaffold
Stellar** (Soroban contracts in Rust + Vite/React app + auto-generated
TypeScript clients). On top, two optional building blocks already wired in:

- **Trustless Work** escrows: USDC held in a per-deal contract and released by
  roles/milestones. Only for apps where money must **wait for a condition**
  (deliveries, milestones, deposits, bounties).
- **Cavos** embedded wallets: sign in with email/Google, no wallet extension.
  Useful for any app with non-crypto users.

**Pick building blocks by need.** A poll, registry, guestbook or NFT app is just
a Soroban contract + pages: no escrow. Direct payments (tips, donations) don't
need an escrow either. The `build-dapp` skill walks through this choice.

Always reply in the user's language, and write the app's UI text (and contract
error messages) in that language too. Explain on-chain concepts in one or two
plain sentences when they matter, then keep building.

## Skills (read before working on that area)

Skills live in `.agents/skills/<name>/SKILL.md` (open Agent Skills format;
mirrored to `.claude/skills/`). If your tool doesn't load skills automatically,
**open and read the matching SKILL.md yourself before starting**: they contain
verified, version-specific facts that differ from your training data.

| Skill               | Read it when                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `build-dapp`        | The user describes an app idea or wants to build something (any kind). Start here.                         |
| `trustless-work`    | Only when funds must be held until a condition: escrows, milestones, deposits, disputes                    |
| `scaffold-stellar`  | Adding/deploying contracts, `environments.toml`, `app/.env`, generated clients, dev server or build errors |
| `cavos`             | Login with email/Google, "no wallet" onboarding, anything that signs transactions or touches `useWallet`   |
| `soroban-contracts` | Writing/testing/reviewing Rust contracts in `contracts/`                                                   |
| `stellar-basics`    | Explaining Stellar concepts, decoding transaction errors, test money                                       |

## Golden rules

1. **Testnet only** unless the user explicitly asks for mainnet.
2. **Use only the building blocks the idea needs.** No Trustless Work escrow (or
   its API key) unless money must wait for a condition. Remove nav links to demo
   pages the app doesn't use.
3. **Don't assume everything goes on-chain.** Decide per piece of data; when
   it's a real choice (privacy, cost, effort), explain the trade-off to the user
   and ask (`build-dapp` skill, step 2b). Personal data never goes on-chain.
4. **Never** ask for, print, store or commit secret keys (`S…`) or seed phrases.
   Users sign with their wallet; the agent never signs for them. `app/.env` is
   different: it only holds public config (`PUBLIC_*` values are public by
   design), so you may read and edit it, but never commit it.
5. Don't edit generated code: `app-lib/clients/*` (Scaffold regenerates it) and
   `.agents/skills/trustless-work/references/official/` (vendored).
6. Scaffold config is **v2** (`scaffold.yml`, CLI **0.0.28**). The working network is `testnet` (`STELLAR_NETWORK`). `environments.toml` is the old v1 file and is not what `build` reads.
7. Trustless Work is **API V1** with `@trustless-work/escrow@3.0.5`. Don't
   upgrade to the 5.x beta or mix V2 payloads.
8. Reuse what exists before writing new code: `contracts/reputation` (contract
   template), `ReputationPanel` (contract reads/writes from React), and, only
   for escrow apps, `useEscrowTx` (every escrow write), `useMyEscrows`/
   `useEscrow`, `EscrowCard`, `CreateEscrowForm`, `SetupChecklist`.
9. **Every signature goes through `useWallet().signTransaction`** (works for
   Cavos and extension wallets alike). Never import Stellar Wallets Kit or Cavos
   directly in features.
10. Work in small steps and verify each one (`cargo test`, `npm run typecheck`,
    `npm run check`). You can't click wallet popups: hand the user a short
    manual test script instead.
11. Edit skills only in `.agents/skills/` (then `npm run agents:sync`), never in
    `.claude/skills/`.

12. Ignore `npm audit` warnings from `npm install` and **never** run
    `npm audit fix --force`: it upgrades pinned SDKs (`@trustless-work/escrow`,
    `@cavos/kit`) and breaks the app.

## Commands (repo root)

| Command                              | What it does                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `npm install`                        | install deps (+ syncs skill mirrors)                                                                                        |
| `npm run doctor`                     | checks tools, `app/.env`, network, Trustless Work key; creates `app/.env` if missing                                        |
| `npm start`                          | dev loop: `stellar scaffold watch --build-clients` (build → deploy to testnet → TS clients) + Vite on http://localhost:5173 |
| `npm run contracts:build`            | one-off build + deploy + client generation (exits 1 if a client fails to generate)                                          |
| `npm run contracts:test`             | `cargo test` for all contracts                                                                                              |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint for the app                                                                                             |
| `npm run check`                      | contracts:test + Rust/TS formatting + typecheck + lint (run before saying "done")                                           |
| `npm run tw:smoke`                   | end-to-end Trustless Work test (deploy→fund→approve→release) signed by the local deployer key                               |

Scaffold/Stellar CLI commands must run from `app/` (its `.env` sets a relative
config dir). On a fresh clone, run `npm run contracts:build` once before
`typecheck`/`check`/`build`: the app imports the generated contract clients.

## Layout

```
contracts/reputation/     example Soroban contract (reviews tied to escrows) + tests
contracts/fungible-allowlist, nft-enumerable/   OpenZeppelin examples (not deployed by default)
environments.toml         contracts per environment (development = testnet)
app/src/pages/            Home, Escrows (Escrow Studio), Debug (deployed contracts)
app/src/trustless/        Trustless Work integration (config, provider, hooks, components)
app/src/cavos/            Cavos embedded wallets (optional, PUBLIC_CAVOS_APP_ID)
app/src/providers/        WalletProvider: one useWallet() for Cavos + extension wallets
app/src/components/       shared UI (ReputationPanel, wallet buttons…)
app/src/hooks/            useWallet, useNotification, useSubscription
app-lib/                  network env, wallet kit, friendbot, events (shared TS lib)
app-lib/clients/          GENERATED contract clients (gitignored)
scripts/                  doctor, tw-smoke, agents-sync, dev-guard
docs/AGENT-SETUP.md       per-agent setup and optional MCP servers
```

## Code conventions

- TypeScript strict, React 19 function components, React Query for async state,
  CSS Modules using the tokens in `app-lib/styles.css` (`var(--color-accent)`
  etc.). Tabs, no semicolons (Prettier config `@theahaco/ts-config/prettier`).
- Frontend env vars must start with `PUBLIC_` (`import.meta.env.PUBLIC_*`).
- Contract client names: crate `my-contract` → env key `my_contract` →
  `import { myContract } from "@stellar-scaffold/app-lib/clients"`.
- Rust: `#![no_std]`, soroban-sdk 26 (workspace pin), `#[contractevent]` for
  events, explicit `#[contracterror]` enums, tests in `src/test.rs`.

## Live docs (when skills aren't enough)

- Stellar: https://developers.stellar.org/llms.txt (append `.md` to any docs
  page URL)
- Trustless Work: https://docs.trustlesswork.com/trustless-work/llms.txt ·
  Swagger https://dev.api.trustlesswork.com/docs
- Scaffold Stellar:
  https://developers.stellar.org/docs/tools/scaffold-stellar.md
  (stellarscaffold.org documents config v2)
- OpenZeppelin Stellar contracts:
  https://docs.openzeppelin.com/stellar-contracts
- Stellar Raven MCP (`stellar-raven`, https://raven.stellar.org/mcp): official
  Stellar docs, ecosystem data and playbooks; already configured, needs a
  one-time browser sign-in. Other optional MCP servers (Trustless Work docs,
  OpenZeppelin contract wizard): see `docs/AGENT-SETUP.md`.

## Learned User Preferences

- Write product UI in Spanish; the user works in Spanish.
- Do 3D characters and visual scene work with Grok or Composer, not Claude.
- Menus and screens need a hard, own identity: DeFiesta is a full-window party-game title; PymeSolve is a 440px phone column. Solid colors, hard borders, strong contrast. Avoid a generic AI look: glow cards, gradient titles, shimmer, glass, and emoji button lists. Animate only on interaction.
- DeFiesta minigames are 3D (a race to the finish and a four-player boxing match), with a tutorial and a scene change before play.
- A round is all four players having rolled and moved. After that, everyone plays the minigame.
- Free play with fake coins is the playable path first. Real stakes are USDC only (a shared fixed buy-in or a custom amount); XLM is only for network fees. Public and private matches come later.
- Play is local hotseat on one device (keyboard or gamepad), two to four players, with CPU filling empty seats.
- PymeSolve has to read like a real phone app on first open: one thing on screen, a single next step, and bottom tabs that follow the role (pyme: Problemas, Encargos, Publicar, Libro, Ajustes; oficio: Ofertas, Encargos, Chats, Libro, Ajustes; mesa: Mesa, Altas, Chats, Libro, Ajustes). “Gente que me sirve” lives on Encargos, with the profile and a direct chat. Dopamina is a Tinder-style swipe deck, optional on home from Ajustes, not a tab. Search is one phrase and one result, not a grid. Product screens say retén, oficio, carta, and el lunes; technical words (testnet, contrato, Cavos, trustline, firmar, escrow) stay in Ajustes. Copy leads with “la pyme paga una vez” and “quién te lo hace” for starting businesses that need who does the work, not barrio-as-tagline. Gemma is local and never signs or moves money. Ajustes holds three solid themes (papel, campo, noche) and a short note on how the app was built.
- The demo role switch (Pyme / Usuario / Mesa) lives collapsed at the bottom of Ajustes and must change the whole app, not just labels. Oficio profiles include a portfolio of work links; the mesa does not publish, take encargos, or need a portfolio.
- EnComún (still in the repo) uses one category on screen, bottom tabs (Sacos, Flete, Adelanto, Libro, Ajustes), Poner and Pedir chosen one at a time, and an intro that runs once.

## Learned Workspace Facts

- DeFiesta is the Mario Party-style crypto board game under `app/src/game/`. EnComún (`app/src/encomun/`) is the Comunidad Tica fund. The mounted app is PymeSolve: `app/src/App.tsx` renders `MarketApp` from `app/src/market/`. Do not mix the three products in one UI.
- PymeSolve is a shared-problem marketplace for Costa Rica SMEs: similar counter-language problems in the same rubro become gemelos and one encargo. Encargo state lives in the `pools` contract; USDC waits in a Trustless Work retén until the carta and “Yo lo vi”. Sign-in is Cavos (email or Google). Names, barrio, and chat stay off-chain. XLM on that account only pays network fees. Three roles (pyme, oficio as `dev`, mesa as `admin`) each get a different tab bar and home in `MarketApp.tsx`.
- Cavos Google callback is exactly `http://localhost:5173` with no trailing slash; open the app on localhost (`127.0.0.1` is a different origin). `@cavos/kit` 0.2.5 ignores `redirectUri`, so a Vite patch forces that origin. A presentation runs with `npm run present` (`PYMESOLVE_PRESENT`) and must not hot-reload or restart during login.
- EnComún shared testnet USDC is held by the `fondos` contract; category balances and Libro come from that contract; names stay off-chain. An adelanto is signed only by the asiento; a Sacos or Flete request stays locked until someone else confirms Yo lo vi, and neither the requester nor the tesorera can confirm. A deposit repays an outstanding adelanto before the rest enters the category.
- The board is a single map: the street is the track and buildings sit between the spaces, with crypto, web3, and AI visual gags.
- Dice play follows Mario Party timing: the camera closes on the current character, they jump and hit the die, and the die keeps spinning before showing the number.
- Gemma 4 E2B runs locally via Ollama (`server/gemma.mjs`) for twin copy and Dopamina bullets; it never signs, never moves USDC, never verifies people, and never creates an encargo.
- `node:sqlite` in `server/` rejects `.all([x])` (`Unknown named parameter '0'`); pass values as `.all(x)` or `.all(a, b)`, never an array.
- Product `origin` is `git@github.com:santinofuentesAI/Pymesolve.git` (https://github.com/santinofuentesAI/Pymesolve). `upstream` stays the scaffold template. The README on that repo describes PymeSolve, the product.
