import { db, nowIso } from "./db.mjs"

db.exec(`
CREATE TABLE IF NOT EXISTS c_members (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	place TEXT NOT NULL,
	role TEXT NOT NULL,
	trade TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c_fund (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	purpose TEXT NOT NULL,
	place TEXT NOT NULL,
	chain_id INTEGER,
	escrow TEXT
);
CREATE TABLE IF NOT EXISTS c_pledges (
	member_id TEXT PRIMARY KEY,
	pledged REAL NOT NULL,
	funded INTEGER NOT NULL DEFAULT 0,
	amount REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS c_moves (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	kind TEXT NOT NULL,
	member_id TEXT NOT NULL,
	amount REAL NOT NULL,
	note TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c_withdrawals (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	member_id TEXT NOT NULL,
	amount REAL NOT NULL,
	reason TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c_votes (
	withdrawal_id INTEGER NOT NULL,
	member_id TEXT NOT NULL,
	accept INTEGER NOT NULL,
	PRIMARY KEY (withdrawal_id, member_id)
);
CREATE TABLE IF NOT EXISTS c_jars (
	jar TEXT PRIMARY KEY,
	amount REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS c_seat (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	member_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c_stain (
	member_id TEXT PRIMARY KEY,
	amount REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS c_lines (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	jar TEXT NOT NULL,
	member_id TEXT NOT NULL,
	amount REAL NOT NULL,
	destino TEXT NOT NULL,
	status TEXT NOT NULL,
	witness_id TEXT,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c_names (
	address TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	place TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c_chain_lines (
	id INTEGER PRIMARY KEY,
	jar TEXT NOT NULL,
	asker TEXT NOT NULL,
	amount INTEGER NOT NULL,
	destino TEXT NOT NULL,
	status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c_notes (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	note TEXT NOT NULL,
	created_at TEXT NOT NULL
);
`)

function seed() {
	const members = [
		["socio-marta", "Marta Solís", "Naranjo", "tesorera", "caficultora"],
		["socio-luis", "Luis Brenes", "Alajuela", "socio", "caficultor"],
		["socio-elena", "Elena Vargas", "Heredia", "socio", "asociación"],
		["socio-jorge", "Jorge Quirós", "Cartago", "socio", "beneficio"],
	]
	const insert = db.prepare(
		"INSERT INTO c_members (id, name, place, role, trade) VALUES (?, ?, ?, ?, ?)",
	)
	for (const row of members) insert.run(...row)
	db.prepare(
		"INSERT INTO c_fund (id, name, purpose, place) VALUES (1, ?, ?, ?)",
	).run(
		"Fondo de la cosecha",
		"Sacos, flete y un adelanto para quien no puede esperar la liquidación.",
		"Naranjo, Alajuela",
	)
	const pledge = db.prepare(
		"INSERT INTO c_pledges (member_id, pledged, funded, amount) VALUES (?, ?, ?, ?)",
	)
	pledge.run("socio-marta", 15, 1, 15)
	pledge.run("socio-luis", 10, 1, 10)
	pledge.run("socio-elena", 8, 0, 0)
	pledge.run("socio-jorge", 20, 0, 0)
	const move = db.prepare(
		"INSERT INTO c_moves (kind, member_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)",
	)
	const t = nowIso()
	move.run("aporte", "socio-marta", 15, "Aporte de Marta Solís", t)
	move.run("aporte", "socio-luis", 10, "Aporte de Luis Brenes", t)
	const info = db
		.prepare(
			"INSERT INTO c_withdrawals (member_id, amount, reason, status, created_at) VALUES (?, ?, ?, 'abierto', ?)",
		)
		.run(
			"socio-luis",
			12,
			"Sacos de yute para la cosecha de este mes.",
			t,
		)
	db.prepare(
		"INSERT INTO c_votes (withdrawal_id, member_id, accept) VALUES (?, ?, 1)",
	).run(Number(info.lastInsertRowid), "socio-marta")
}

if (db.prepare("SELECT COUNT(*) AS n FROM c_members").get().n === 0) seed()

function roundMoney(n) {
	return Math.round(Number(n) * 100) / 100
}

function ensureHarvest() {
	if (db.prepare("SELECT COUNT(*) AS n FROM c_jars").get().n > 0) return
	const pledges = db.prepare("SELECT * FROM c_pledges").all()
	const funded = (id) => {
		const row = pledges.find((p) => p.member_id === id)
		return row?.funded ? roundMoney(row.amount) : 0
	}
	const insert = db.prepare("INSERT INTO c_jars (jar, amount) VALUES (?, ?)")
	insert.run("sacos", funded("socio-marta"))
	insert.run("flete", funded("socio-luis"))
	insert.run("adelanto", funded("socio-elena"))
	db.prepare("INSERT INTO c_seat (id, member_id) VALUES (1, 'socio-elena')").run()
}

ensureHarvest()

function jarAmount(jar) {
	return roundMoney(
		db.prepare("SELECT amount FROM c_jars WHERE jar = ?").get(jar)?.amount ?? 0,
	)
}

function setJar(jar, amount) {
	db.prepare("UPDATE c_jars SET amount = ? WHERE jar = ?").run(roundMoney(amount), jar)
}

function stainOf(id) {
	return roundMoney(
		db.prepare("SELECT amount FROM c_stain WHERE member_id = ?").get(id)?.amount ?? 0,
	)
}

function setStain(id, amount) {
	const next = roundMoney(amount)
	if (next <= 0) {
		db.prepare("DELETE FROM c_stain WHERE member_id = ?").run(id)
		return
	}
	db.prepare(
		`INSERT INTO c_stain (member_id, amount) VALUES (?, ?)
		 ON CONFLICT(member_id) DO UPDATE SET amount = excluded.amount`,
	).run(id, next)
}

function memberOf(id) {
	return db.prepare("SELECT * FROM c_members WHERE id = ?").get(id)
}

function saldo() {
	return roundMoney(
		db.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM c_jars").get().n,
	)
}

function withdrawals() {
	const rows = db
		.prepare(
			`SELECT w.*, m.name AS member_name
			 FROM c_withdrawals w JOIN c_members m ON m.id = w.member_id
			 ORDER BY w.id DESC`,
		)
		.all()
	return rows.map((row) => {
		const votes = db
			.prepare(
				`SELECT v.*, m.name
				 FROM c_votes v JOIN c_members m ON m.id = v.member_id
				 WHERE v.withdrawal_id = ?`,
			)
			.all(row.id)
		const yes = votes.filter((v) => v.accept === 1).length
		return { ...row, votes, yes }
	})
}

function snapshot() {
	const fund = db.prepare("SELECT * FROM c_fund WHERE id = 1").get()
	const members = db
		.prepare(
			`SELECT m.*, p.pledged, p.funded, p.amount,
				COALESCE(s.amount, 0) AS stain
			 FROM c_members m
			 JOIN c_pledges p ON p.member_id = m.id
			 LEFT JOIN c_stain s ON s.member_id = m.id
			 ORDER BY m.name`,
		)
		.all()
	const jars = db.prepare("SELECT jar, amount FROM c_jars ORDER BY jar").all()
	const seatRow = db
		.prepare(
			`SELECT s.member_id AS id, m.name
			 FROM c_seat s JOIN c_members m ON m.id = s.member_id
			 WHERE s.id = 1`,
		)
		.get()
	const lines = db
		.prepare(
			`SELECT l.*, m.name AS member_name, w.name AS witness_name
			 FROM c_lines l
			 JOIN c_members m ON m.id = l.member_id
			 LEFT JOIN c_members w ON w.id = l.witness_id
			 ORDER BY l.id DESC`,
		)
		.all()
	const moves = db
		.prepare(
			`SELECT mv.*, m.name
			 FROM c_moves mv JOIN c_members m ON m.id = mv.member_id
			 ORDER BY mv.id DESC`,
		)
		.all()
	const total = db.prepare("SELECT COUNT(*) AS n FROM c_members").get().n
	return {
		fund,
		members,
		moves,
		jars,
		seat: seatRow ?? null,
		lines,
		withdrawals: withdrawals(),
		saldo: saldo(),
		socios: total,
	}
}

function quorum(yes) {
	const total = db.prepare("SELECT COUNT(*) AS n FROM c_members").get().n
	return yes * 2 > total
}

function validAddress(address) {
	return typeof address === "string" && address.startsWith("G") && address.length === 56
}

export async function handleFondoAsync(req, res, path, actor, send, readBody) {
	if (!path.startsWith("/api/comunidad")) return false
	if (path === "/api/comunidad" && req.method === "GET") {
		send(res, 200, snapshot())
		return true
	}
	if (path === "/api/comunidad/nombres" && req.method === "GET") {
		send(
			res,
			200,
			db.prepare("SELECT address, name, place FROM c_names ORDER BY name").all(),
		)
		return true
	}
	if (path === "/api/comunidad/lineas" && req.method === "GET") {
		send(
			res,
			200,
			db
				.prepare(
					"SELECT id, jar, asker, amount, destino, status FROM c_chain_lines WHERE status = 'apartado' ORDER BY id",
				)
				.all(),
		)
		return true
	}
	if (path === "/api/comunidad/notas" && req.method === "GET") {
		send(
			res,
			200,
			db
				.prepare("SELECT id, note, created_at FROM c_notes ORDER BY id DESC LIMIT 12")
				.all(),
		)
		return true
	}

	const body = req.method === "POST" ? await readBody(req) : {}

	if (path === "/api/comunidad/nombres" && req.method === "POST") {
		const address = String(body.address ?? "")
		const name = String(body.name ?? "").trim()
		const place = String(body.place ?? "").trim()
		if (!validAddress(address)) {
			send(res, 400, { error: "La cuenta no es válida." })
			return true
		}
		if (name.length < 2 || name.length > 60 || place.length < 2 || place.length > 40) {
			send(res, 400, { error: "El nombre y el lugar tienen que ser cortos y claros." })
			return true
		}
		db.prepare(
			`INSERT INTO c_names (address, name, place) VALUES (?, ?, ?)
			 ON CONFLICT(address) DO UPDATE SET name = excluded.name, place = excluded.place`,
		).run(address, name, place)
		send(res, 200, { address, name, place })
		return true
	}
	if (path === "/api/comunidad/linea" && req.method === "POST") {
		const id = Number(body.id)
		const jar = String(body.jar ?? "")
		const asker = String(body.asker ?? "")
		const amount = Number(body.amount)
		const destino = String(body.destino ?? "").trim()
		const status = String(body.status ?? "")
		if (!Number.isInteger(id) || id < 0) {
			send(res, 400, { error: "Falta el número del pedido." })
			return true
		}
		if (jar !== "sacos" && jar !== "flete") {
			send(res, 400, { error: "Ese pedido no es de Sacos ni de Flete." })
			return true
		}
		if (!validAddress(asker) || !Number.isInteger(amount) || amount < 1) {
			send(res, 400, { error: "El pedido está incompleto." })
			return true
		}
		if (status !== "apartado" && status !== "visto" && status !== "devuelto") {
			send(res, 400, { error: "Ese estado no existe." })
			return true
		}
		db.prepare(
			`INSERT INTO c_chain_lines (id, jar, asker, amount, destino, status) VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
		).run(id, jar, asker, amount, destino, status)
		send(res, 200, { id, jar, asker, amount, destino, status })
		return true
	}
	if (path === "/api/comunidad/nota" && req.method === "POST") {
		const note = String(body.note ?? "").trim()
		if (note.length < 4 || note.length > 180) {
			send(res, 400, { error: "La nota del libro quedó vacía." })
			return true
		}
		db.prepare("INSERT INTO c_notes (note, created_at) VALUES (?, ?)").run(note, nowIso())
		send(res, 200, { note })
		return true
	}

	const me = memberOf(actor.id)
	if (req.method === "POST" && !me) {
		send(res, 401, { error: "Elija un socio en Ajustes." })
		return true
	}

	if (path === "/api/comunidad/verter" && req.method === "POST") {
		const amount = Number(body.amount)
		const jar = String(body.jar ?? "")
		if (!["sacos", "flete", "adelanto"].includes(jar)) {
			send(res, 400, { error: "Elija un frasco: sacos, flete o adelanto." })
			return true
		}
		if (!Number.isFinite(amount) || amount < 1 || amount > 200) {
			send(res, 400, { error: "El aporte tiene que estar entre 1 y 200 USDC." })
			return true
		}
		const stain = stainOf(me.id)
		const cover = Math.min(stain, amount)
		const rest = roundMoney(amount - cover)
		if (cover > 0) setStain(me.id, stain - cover)
		if (rest > 0) setJar(jar, jarAmount(jar) + rest)
		const pledge = db
			.prepare("SELECT amount FROM c_pledges WHERE member_id = ?")
			.get(me.id)
		const nextAmount = roundMoney(Number(pledge?.amount ?? 0) + amount)
		db.prepare(
			"UPDATE c_pledges SET funded = 1, amount = ?, pledged = ? WHERE member_id = ?",
		).run(nextAmount, nextAmount, me.id)
		const note =
			cover > 0 && rest > 0
				? `${me.name} tapa ${cover} USDC del adelanto y pone ${rest} en ${jar}`
				: cover > 0
					? `Este saco de ${me.name} tapa el adelanto`
					: `${me.name} pone ${amount} USDC en ${jar}`
		db.prepare(
			"INSERT INTO c_moves (kind, member_id, amount, note, created_at) VALUES ('aporte', ?, ?, ?, ?)",
		).run(me.id, amount, note, nowIso())
		send(res, 200, snapshot())
		return true
	}

	if (path === "/api/comunidad/adelanto" && req.method === "POST") {
		const seat = db.prepare("SELECT member_id FROM c_seat WHERE id = 1").get()
		if (!seat || seat.member_id !== me.id) {
			const seated = seat
				? db.prepare("SELECT name FROM c_members WHERE id = ?").get(seat.member_id)
				: null
			send(res, 403, {
				error: seated
					? `El asiento es de ${seated.name}.`
					: "Nadie está sentado en el adelanto.",
			})
			return true
		}
		const amount = Number(body.amount)
		if (!Number.isFinite(amount) || amount < 1) {
			send(res, 400, { error: "Indique cuánto adelanto cobra." })
			return true
		}
		if (amount > jarAmount("adelanto")) {
			send(res, 400, { error: "El frasco de adelanto no tiene tanto." })
			return true
		}
		setJar("adelanto", jarAmount("adelanto") - amount)
		setStain(me.id, stainOf(me.id) + amount)
		db.prepare(
			"INSERT INTO c_moves (kind, member_id, amount, note, created_at) VALUES ('retiro', ?, ?, ?, ?)",
		).run(me.id, amount, `${me.name} cobra adelanto y queda debiendo ${amount} USDC`, nowIso())
		send(res, 200, snapshot())
		return true
	}

	if (path === "/api/comunidad/usar" && req.method === "POST") {
		const jar = String(body.jar ?? "")
		const amount = Number(body.amount)
		const destino = String(body.destino ?? "").trim()
		if (jar !== "sacos" && jar !== "flete") {
			send(res, 400, { error: "Sacos y flete salen con un destino. El adelanto usa el asiento." })
			return true
		}
		if (!Number.isFinite(amount) || amount < 1) {
			send(res, 400, { error: "Indique cuánto sale del frasco." })
			return true
		}
		if (destino.length < 8) {
			send(res, 400, { error: "Escriba para qué sale esa plata." })
			return true
		}
		if (amount > jarAmount(jar)) {
			send(res, 400, { error: "Ese frasco no tiene tanto." })
			return true
		}
		setJar(jar, jarAmount(jar) - amount)
		db.prepare(
			"INSERT INTO c_lines (jar, member_id, amount, destino, status, created_at) VALUES (?, ?, ?, ?, 'abierto', ?)",
		).run(jar, me.id, amount, destino, nowIso())
		db.prepare(
			"INSERT INTO c_moves (kind, member_id, amount, note, created_at) VALUES ('retiro', ?, ?, ?, ?)",
		).run(me.id, amount, `${jar}: ${destino}. Salió y nadie lo vio.`, nowIso())
		send(res, 200, snapshot())
		return true
	}

	if (path === "/api/comunidad/vi" && req.method === "POST") {
		const id = Number(body.id)
		const line = db.prepare("SELECT * FROM c_lines WHERE id = ?").get(id)
		if (!line || line.status !== "abierto") {
			send(res, 409, { error: "Esa línea ya está vista." })
			return true
		}
		if (line.member_id === me.id || me.role === "tesorera") {
			send(res, 403, { error: "Tiene que verlo otro socio, ni quien cobró ni la tesorera." })
			return true
		}
		db.prepare(
			"UPDATE c_lines SET status = 'visto', witness_id = ? WHERE id = ?",
		).run(me.id, id)
		db.prepare(
			"INSERT INTO c_moves (kind, member_id, amount, note, created_at) VALUES ('visto', ?, ?, ?, ?)",
		).run(me.id, 0, `${me.name} vio: ${line.destino}`, nowIso())
		send(res, 200, snapshot())
		return true
	}

	if (path === "/api/comunidad/aporte" && req.method === "POST") {
		const amount = Number(body.amount)
		if (!Number.isFinite(amount) || amount < 1 || amount > 200) {
			send(res, 400, { error: "El aporte tiene que estar entre 1 y 200 USDC." })
			return true
		}
		const pledge = db
			.prepare("SELECT * FROM c_pledges WHERE member_id = ?")
			.get(me.id)
		if (pledge?.funded) {
			send(res, 409, { error: "Usted ya aportó a este fondo." })
			return true
		}
		db.prepare(
			"UPDATE c_pledges SET funded = 1, amount = ?, pledged = ? WHERE member_id = ?",
		).run(amount, amount, me.id)
		db.prepare(
			"INSERT INTO c_moves (kind, member_id, amount, note, created_at) VALUES ('aporte', ?, ?, ?, ?)",
		).run(me.id, amount, `Aporte de ${me.name}`, nowIso())
		send(res, 200, snapshot())
		return true
	}

	if (path === "/api/comunidad/retiro" && req.method === "POST") {
		const amount = Number(body.amount)
		const reason = String(body.reason ?? "").trim()
		if (!Number.isFinite(amount) || amount < 1) {
			send(res, 400, { error: "Indique cuánto hay que retirar." })
			return true
		}
		if (reason.length < 8) {
			send(res, 400, { error: "Escriba para qué es el retiro." })
			return true
		}
		if (amount > saldo()) {
			send(res, 400, { error: "El fondo no tiene tanto USDC." })
			return true
		}
		db.prepare(
			"INSERT INTO c_withdrawals (member_id, amount, reason, status, created_at) VALUES (?, ?, ?, 'abierto', ?)",
		).run(me.id, amount, reason, nowIso())
		send(res, 201, snapshot())
		return true
	}

	if (path === "/api/comunidad/voto" && req.method === "POST") {
		const id = Number(body.id)
		const row = db.prepare("SELECT * FROM c_withdrawals WHERE id = ?").get(id)
		if (!row || row.status !== "abierto") {
			send(res, 409, { error: "Ese retiro ya no se vota." })
			return true
		}
		try {
			db.prepare(
				"INSERT INTO c_votes (withdrawal_id, member_id, accept) VALUES (?, ?, ?)",
			).run(id, me.id, body.accept ? 1 : 0)
		} catch {
			send(res, 409, { error: "Usted ya votó este retiro." })
			return true
		}
		const yes = db
			.prepare(
				"SELECT COUNT(*) AS n FROM c_votes WHERE withdrawal_id = ? AND accept = 1",
			)
			.get(id).n
		if (quorum(yes)) {
			db.prepare(
				"UPDATE c_withdrawals SET status = 'aprobado' WHERE id = ?",
			).run(id)
		}
		send(res, 200, snapshot())
		return true
	}

	if (path === "/api/comunidad/liberar" && req.method === "POST") {
		if (me.role !== "tesorera") {
			send(res, 403, { error: "Solo la tesorera libera un retiro aprobado." })
			return true
		}
		const id = Number(body.id)
		const row = db.prepare("SELECT * FROM c_withdrawals WHERE id = ?").get(id)
		if (!row || row.status !== "aprobado") {
			send(res, 409, { error: "Hace falta la mayoría antes de liberar." })
			return true
		}
		db.prepare("UPDATE c_withdrawals SET status = 'pagado' WHERE id = ?").run(id)
		db.prepare(
			"INSERT INTO c_moves (kind, member_id, amount, note, created_at) VALUES ('retiro', ?, ?, ?, ?)",
		).run(me.id, row.amount, row.reason, nowIso())
		send(res, 200, snapshot())
		return true
	}

	if (path === "/api/comunidad" && req.method === "GET") return false
	send(res, 404, { error: "No está esa ruta." })
	return true
}
