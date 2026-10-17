#![no_std]
//! Fondo de la cosecha. El contrato custodia el USDC.
//! Poner lo entra. Pedir lo aparta. Yo lo vi lo suelta.
//! El adelanto solo lo firma el asiento y queda como deuda.
use soroban_sdk::{
    Address, Env, String, contract, contracterror, contractevent, contractimpl, contracttype,
    token::TokenClient,
};

const MIN: i128 = 10_000_000;
const MAX: i128 = 200 * 10_000_000;
const MAX_MEMBERS: u32 = 12;
const MAX_TEXT: u32 = 80;

const DAY_IN_LEDGERS: u32 = 17_280;
const TTL_EXTEND_TO: u32 = 30 * DAY_IN_LEDGERS;
const TTL_THRESHOLD: u32 = TTL_EXTEND_TO - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// No hay un pedido con ese número.
    NotFound = 1,
    /// No podés hacer eso en este fondo.
    Unauthorized = 2,
    /// El monto tiene que estar entre 1 y 200 USDC.
    InvalidAmount = 3,
    /// Este fondo ya tiene el máximo de socios.
    TooManyMembers = 4,
    /// Ya sos socio.
    AlreadyMember = 5,
    /// Ese pedido ya no está abierto.
    WrongStatus = 6,
    /// El frasco no alcanza.
    Insufficient = 7,
    /// El fondo todavía no tiene tesorera ni asiento.
    NotOpen = 8,
    /// El fondo ya está abierto.
    AlreadyOpen = 9,
    /// Eso solo se pide de Sacos o de Flete.
    WrongJar = 10,
    /// El destino quedó vacío o es demasiado largo.
    InvalidText = 11,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Jar {
    Sacos,
    Flete,
    Adelanto,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LineStatus {
    Apartado,
    Visto,
    Devuelto,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Line {
    pub id: u32,
    pub jar: Jar,
    pub asker: Address,
    pub amount: i128,
    pub destino: String,
    pub status: LineStatus,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Usdc,
    Tesorera,
    Asiento,
    Abierta,
    LineCount,
    Apartado,
    Socios,
    JarAmount(Jar),
    Socio(Address),
    Deuda(Address),
    Line(u32),
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Puso {
    #[topic]
    pub socio: Address,
    pub jar: Jar,
    pub amount: i128,
    pub cubre: i128,
    pub resto: i128,
}

#[contract]
pub struct Fondos;

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn usdc(env: &Env) -> TokenClient<'_> {
    let id: Address = env.storage().instance().get(&DataKey::Usdc).unwrap();
    TokenClient::new(env, &id)
}

fn require_open(env: &Env) -> Result<(), Error> {
    if env.storage().instance().get(&DataKey::Abierta).unwrap_or(false) {
        Ok(())
    } else {
        Err(Error::NotOpen)
    }
}

fn is_socio(env: &Env, socio: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Socio(socio.clone()))
        .unwrap_or(false)
}

fn require_socio(env: &Env, socio: &Address) -> Result<(), Error> {
    if is_socio(env, socio) {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}

fn check_amount(amount: i128) -> Result<(), Error> {
    if amount < MIN || amount > MAX {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}

fn check_text(value: &String) -> Result<(), Error> {
    if value.len() == 0 || value.len() > MAX_TEXT {
        return Err(Error::InvalidText);
    }
    Ok(())
}

fn jar_amount(env: &Env, jar: Jar) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::JarAmount(jar))
        .unwrap_or(0)
}

fn set_jar(env: &Env, jar: Jar, amount: i128) {
    env.storage()
        .instance()
        .set(&DataKey::JarAmount(jar), &amount);
    bump_instance(env);
}

fn deuda(env: &Env, socio: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Deuda(socio.clone()))
        .unwrap_or(0)
}

fn set_deuda(env: &Env, socio: &Address, amount: i128) {
    let key = DataKey::Deuda(socio.clone());
    env.storage().persistent().set(&key, &amount);
    bump_persistent(env, &key);
}

fn apartado(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::Apartado)
        .unwrap_or(0)
}

fn set_apartado(env: &Env, amount: i128) {
    env.storage().instance().set(&DataKey::Apartado, &amount);
    bump_instance(env);
}

fn load_line(env: &Env, id: u32) -> Result<Line, Error> {
    let key = DataKey::Line(id);
    let line = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::NotFound)?;
    bump_persistent(env, &key);
    Ok(line)
}

fn save_line(env: &Env, line: &Line) {
    let key = DataKey::Line(line.id);
    env.storage().persistent().set(&key, line);
    bump_persistent(env, &key);
}

#[contractimpl]
impl Fondos {
    pub fn __constructor(env: Env, admin: Address, usdc: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Usdc, &usdc);
        env.storage().instance().set(&DataKey::Abierta, &false);
        env.storage().instance().set(&DataKey::LineCount, &0u32);
        env.storage().instance().set(&DataKey::Apartado, &0i128);
        env.storage().instance().set(&DataKey::Socios, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::JarAmount(Jar::Sacos), &0i128);
        env.storage()
            .instance()
            .set(&DataKey::JarAmount(Jar::Flete), &0i128);
        env.storage()
            .instance()
            .set(&DataKey::JarAmount(Jar::Adelanto), &0i128);
        bump_instance(&env);
    }

    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// La tesorera firma una sola vez y nombra el asiento del adelanto.
    pub fn abrir(env: Env, tesorera: Address, asiento: Address) -> Result<(), Error> {
        tesorera.require_auth();
        if env.storage().instance().get(&DataKey::Abierta).unwrap_or(false) {
            return Err(Error::AlreadyOpen);
        }
        env.storage().instance().set(&DataKey::Tesorera, &tesorera);
        env.storage().instance().set(&DataKey::Asiento, &asiento);
        env.storage().instance().set(&DataKey::Abierta, &true);
        bump_instance(&env);
        Ok(())
    }

    pub fn unirse(env: Env, socio: Address) -> Result<(), Error> {
        socio.require_auth();
        require_open(&env)?;
        if is_socio(&env, &socio) {
            return Err(Error::AlreadyMember);
        }
        let n: u32 = env.storage().instance().get(&DataKey::Socios).unwrap_or(0);
        if n >= MAX_MEMBERS {
            return Err(Error::TooManyMembers);
        }
        let key = DataKey::Socio(socio);
        env.storage().persistent().set(&key, &true);
        bump_persistent(&env, &key);
        env.storage().instance().set(&DataKey::Socios, &(n + 1));
        bump_instance(&env);
        Ok(())
    }

    pub fn poner(env: Env, socio: Address, jar: Jar, amount: i128) -> Result<(), Error> {
        socio.require_auth();
        require_open(&env)?;
        require_socio(&env, &socio)?;
        check_amount(amount)?;
        usdc(&env).transfer(&socio, &env.current_contract_address(), &amount);
        let debe = deuda(&env, &socio);
        let cubre = if debe < amount { debe } else { amount };
        set_deuda(&env, &socio, debe - cubre);
        let resto = amount - cubre;
        if resto > 0 {
            set_jar(&env, jar, jar_amount(&env, jar) + resto);
        }
        Puso {
            socio,
            jar,
            amount,
            cubre,
            resto,
        }
        .publish(&env);
        Ok(())
    }

    pub fn pedir(
        env: Env,
        socio: Address,
        jar: Jar,
        amount: i128,
        destino: String,
    ) -> Result<u32, Error> {
        socio.require_auth();
        require_open(&env)?;
        require_socio(&env, &socio)?;
        check_amount(amount)?;
        check_text(&destino)?;
        if jar != Jar::Sacos && jar != Jar::Flete {
            return Err(Error::WrongJar);
        }
        let have = jar_amount(&env, jar);
        if amount > have {
            return Err(Error::Insufficient);
        }
        set_jar(&env, jar, have - amount);
        set_apartado(&env, apartado(&env) + amount);
        let id: u32 = env.storage().instance().get(&DataKey::LineCount).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::LineCount, &(id + 1));
        bump_instance(&env);
        save_line(
            &env,
            &Line {
                id,
                jar,
                asker: socio,
                amount,
                destino,
                status: LineStatus::Apartado,
            },
        );
        Ok(id)
    }

    pub fn vi(env: Env, testigo: Address, line_id: u32) -> Result<(), Error> {
        testigo.require_auth();
        require_open(&env)?;
        require_socio(&env, &testigo)?;
        let mut line = load_line(&env, line_id)?;
        if line.status != LineStatus::Apartado {
            return Err(Error::WrongStatus);
        }
        let tesorera: Address = env.storage().instance().get(&DataKey::Tesorera).unwrap();
        if testigo == line.asker || testigo == tesorera {
            return Err(Error::Unauthorized);
        }
        usdc(&env).transfer(
            &env.current_contract_address(),
            &line.asker,
            &line.amount,
        );
        set_apartado(&env, apartado(&env) - line.amount);
        line.status = LineStatus::Visto;
        save_line(&env, &line);
        Ok(())
    }

    pub fn devolver(env: Env, socio: Address, line_id: u32) -> Result<(), Error> {
        socio.require_auth();
        require_open(&env)?;
        let mut line = load_line(&env, line_id)?;
        if line.asker != socio {
            return Err(Error::Unauthorized);
        }
        if line.status != LineStatus::Apartado {
            return Err(Error::WrongStatus);
        }
        set_jar(&env, line.jar, jar_amount(&env, line.jar) + line.amount);
        set_apartado(&env, apartado(&env) - line.amount);
        line.status = LineStatus::Devuelto;
        save_line(&env, &line);
        Ok(())
    }

    pub fn adelanto(env: Env, socio: Address, amount: i128) -> Result<(), Error> {
        socio.require_auth();
        require_open(&env)?;
        require_socio(&env, &socio)?;
        check_amount(amount)?;
        let asiento: Address = env.storage().instance().get(&DataKey::Asiento).unwrap();
        if socio != asiento {
            return Err(Error::Unauthorized);
        }
        let have = jar_amount(&env, Jar::Adelanto);
        if amount > have {
            return Err(Error::Insufficient);
        }
        set_jar(&env, Jar::Adelanto, have - amount);
        set_deuda(&env, &socio, deuda(&env, &socio) + amount);
        usdc(&env).transfer(&env.current_contract_address(), &socio, &amount);
        Ok(())
    }

    pub fn jar_de(env: Env, jar: Jar) -> i128 {
        jar_amount(&env, jar)
    }

    pub fn deuda_de(env: Env, socio: Address) -> i128 {
        deuda(&env, &socio)
    }

    pub fn apartado(env: Env) -> i128 {
        apartado(&env)
    }

    pub fn saldo(env: Env) -> i128 {
        usdc(&env).balance(&env.current_contract_address())
    }

    pub fn asiento(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Asiento).unwrap()
    }

    pub fn tesorera(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Tesorera).unwrap()
    }

    pub fn abierta(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Abierta).unwrap_or(false)
    }

    pub fn es_socio(env: Env, socio: Address) -> bool {
        is_socio(&env, &socio)
    }

    pub fn linea(env: Env, id: u32) -> Line {
        match load_line(&env, id) {
            Ok(line) => line,
            Err(error) => env.panic_with_error(error),
        }
    }
}

mod test;
