#![no_std]
//! # Pools
//!
//! Encargos compartidos: varias pymes juntan el mismo problema, un dev toma el
//! trabajo y el USDC queda en un escrow de Trustless Work. Este contrato no
//! mueve dinero; guarda quién se unió, cuánto comprometió y el estado.
use soroban_sdk::{
    Address, BytesN, Env, String, Vec, contract, contracterror, contractevent, contractimpl,
    contracttype,
};

pub const MAX_TITLE_LEN: u32 = 80;
pub const MAX_CATEGORY_LEN: u32 = 40;
pub const MAX_MEMBERS: u32 = 8;
pub const MAX_LIST: u32 = 50;

const DAY_IN_LEDGERS: u32 = 17_280;
const TTL_EXTEND_TO: u32 = 30 * DAY_IN_LEDGERS;
const TTL_THRESHOLD: u32 = TTL_EXTEND_TO - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// No hay un problema o un encargo con ese id.
    NotFound = 1,
    /// Solo la persona indicada puede hacer esto.
    Unauthorized = 2,
    /// El título es demasiado largo.
    TitleTooLong = 3,
    /// El rubro es demasiado largo.
    CategoryTooLong = 4,
    /// El monto tiene que ser mayor a cero.
    InvalidAmount = 5,
    /// Este problema ya está en un encargo.
    AlreadyInPool = 6,
    /// Solo se pueden juntar problemas del mismo rubro.
    CategoryMismatch = 7,
    /// Hace falta al menos dos problemas para armar un encargo.
    TooFewProblems = 8,
    /// Este encargo ya tiene el máximo de pymes.
    TooManyMembers = 9,
    /// No formás parte de este encargo.
    NotAMember = 10,
    /// Ya te uniste a este encargo.
    AlreadyJoined = 11,
    /// Este encargo no está en el estado para esa acción.
    WrongStatus = 12,
    /// Quien toma el trabajo no puede ser una de las pymes.
    DevIsMember = 13,
    /// Ya aportaste tu parte.
    AlreadyFunded = 14,
    /// Ya votaste esta entrega.
    AlreadyVoted = 15,
    /// Este encargo ya tiene un escrow.
    EscrowAlreadySet = 16,
    /// No se puede cancelar: ya hay dinero marcado como aportado.
    CannotCancel = 17,
    /// El título no puede estar vacío.
    EmptyTitle = 18,
    /// Ya hay un dev asignado.
    AlreadyClaimed = 19,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Proposed,
    Open,
    Claimed,
    EscrowReady,
    Funded,
    Delivered,
    Disputed,
    Released,
    Resolved,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Problem {
    pub id: u32,
    pub pyme: Address,
    pub title: String,
    pub category: String,
    pub amount: i128,
    pub pool_id: Option<u32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pool {
    pub id: u32,
    pub title: String,
    pub category: String,
    pub problem_ids: Vec<u32>,
    pub expected: Vec<Address>,
    pub members: Vec<Address>,
    pub amounts: Vec<i128>,
    pub committed: i128,
    pub funded: i128,
    pub funders: Vec<Address>,
    pub voters: Vec<Address>,
    pub votes_yes: Vec<bool>,
    pub yes_count: u32,
    pub status: Status,
    pub dev: Option<Address>,
    pub escrow: Option<Address>,
    pub evidence_hash: Option<BytesN<32>>,
    pub resolved_dev_amount: i128,
}

#[contracttype]
enum DataKey {
    Admin,
    ProblemCount,
    PoolCount,
    Problem(u32),
    Pool(u32),
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProblemPosted {
    #[topic]
    pub pyme: Address,
    pub id: u32,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolProposed {
    #[topic]
    pub admin: Address,
    pub id: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolJoined {
    #[topic]
    pub pyme: Address,
    pub pool_id: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolClaimed {
    #[topic]
    pub dev: Address,
    pub pool_id: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DeliveryVoted {
    #[topic]
    pub pyme: Address,
    pub pool_id: u32,
    pub accept: bool,
}

#[contract]
pub struct Pools;

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

fn admin_of(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn require_admin(env: &Env, admin: &Address) -> Result<(), Error> {
    admin.require_auth();
    if *admin != admin_of(env) {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

fn load_problem(env: &Env, id: u32) -> Result<Problem, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Problem(id))
        .ok_or(Error::NotFound)
}

fn save_problem(env: &Env, problem: &Problem) {
    let key = DataKey::Problem(problem.id);
    env.storage().persistent().set(&key, problem);
    bump_persistent(env, &key);
}

fn load_pool(env: &Env, id: u32) -> Result<Pool, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Pool(id))
        .ok_or(Error::NotFound)
}

fn save_pool(env: &Env, pool: &Pool) {
    let key = DataKey::Pool(pool.id);
    env.storage().persistent().set(&key, pool);
    bump_persistent(env, &key);
}

fn contains_addr(list: &Vec<Address>, who: &Address) -> bool {
    for a in list.iter() {
        if a == *who {
            return true;
        }
    }
    false
}

fn unique_push(list: &mut Vec<Address>, who: Address) -> bool {
    if contains_addr(list, &who) {
        return false;
    }
    list.push_back(who);
    true
}

#[contractimpl]
impl Pools {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ProblemCount, &0u32);
        env.storage().instance().set(&DataKey::PoolCount, &0u32);
        bump_instance(&env);
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        admin_of(&env).require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    pub fn post_problem(
        env: Env,
        pyme: Address,
        title: String,
        category: String,
        amount: i128,
    ) -> Result<u32, Error> {
        pyme.require_auth();
        if title.len() == 0 {
            return Err(Error::EmptyTitle);
        }
        if title.len() > MAX_TITLE_LEN {
            return Err(Error::TitleTooLong);
        }
        if category.len() == 0 || category.len() > MAX_CATEGORY_LEN {
            return Err(Error::CategoryTooLong);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProblemCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ProblemCount, &(id + 1));
        bump_instance(&env);

        let problem = Problem {
            id,
            pyme: pyme.clone(),
            title,
            category,
            amount,
            pool_id: None,
        };
        save_problem(&env, &problem);
        ProblemPosted { pyme, id, amount }.publish(&env);
        Ok(id)
    }

    fn assemble_pool(env: &Env, ids: &Vec<u32>) -> Result<Pool, Error> {
        if ids.len() < 2 {
            return Err(Error::TooFewProblems);
        }
        if ids.len() > MAX_MEMBERS {
            return Err(Error::TooManyMembers);
        }

        let first = load_problem(env, ids.get(0).unwrap())?;
        if first.pool_id.is_some() {
            return Err(Error::AlreadyInPool);
        }
        let category = first.category.clone();
        let title = first.title.clone();

        let mut expected: Vec<Address> = Vec::new(env);
        unique_push(&mut expected, first.pyme.clone());
        let mut problem_ids: Vec<u32> = Vec::new(env);
        problem_ids.push_back(first.id);

        for i in 1..ids.len() {
            let p = load_problem(env, ids.get(i).unwrap())?;
            if p.pool_id.is_some() {
                return Err(Error::AlreadyInPool);
            }
            if p.category != category {
                return Err(Error::CategoryMismatch);
            }
            unique_push(&mut expected, p.pyme.clone());
            problem_ids.push_back(p.id);
        }

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PoolCount)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::PoolCount, &(id + 1));
        bump_instance(env);

        for i in 0..problem_ids.len() {
            let pid = problem_ids.get(i).unwrap();
            let mut p = load_problem(env, pid)?;
            p.pool_id = Some(id);
            save_problem(env, &p);
        }

        Ok(Pool {
            id,
            title,
            category,
            problem_ids,
            expected,
            members: Vec::new(env),
            amounts: Vec::new(env),
            committed: 0,
            funded: 0,
            funders: Vec::new(env),
            voters: Vec::new(env),
            votes_yes: Vec::new(env),
            yes_count: 0,
            status: Status::Proposed,
            dev: None,
            escrow: None,
            evidence_hash: None,
            resolved_dev_amount: 0,
        })
    }

    pub fn propose_pool(env: Env, admin: Address, ids: Vec<u32>) -> Result<u32, Error> {
        require_admin(&env, &admin)?;
        let pool = Self::assemble_pool(&env, &ids)?;
        let id = pool.id;
        save_pool(&env, &pool);
        PoolProposed { admin, id }.publish(&env);
        Ok(id)
    }

    /// Una pyme junta problemas gemelos. La mesa sugiere; ellas firman el grupo.
    pub fn propose_from_pyme(env: Env, pyme: Address, ids: Vec<u32>) -> Result<u32, Error> {
        pyme.require_auth();
        let mut owns = false;
        for i in 0..ids.len() {
            if let Ok(p) = load_problem(&env, ids.get(i).unwrap()) {
                if p.pyme == pyme {
                    owns = true;
                }
            }
        }
        if !owns {
            return Err(Error::NotAMember);
        }
        let pool = Self::assemble_pool(&env, &ids)?;
        let id = pool.id;
        save_pool(&env, &pool);
        PoolProposed { admin: pyme, id }.publish(&env);
        Ok(id)
    }

    pub fn join_pool(env: Env, pyme: Address, pool_id: u32) -> Result<(), Error> {
        pyme.require_auth();
        let mut pool = load_pool(&env, pool_id)?;
        if pool.status != Status::Proposed {
            return Err(Error::WrongStatus);
        }
        if !contains_addr(&pool.expected, &pyme) {
            return Err(Error::NotAMember);
        }
        if contains_addr(&pool.members, &pyme) {
            return Err(Error::AlreadyJoined);
        }
        if pool.members.len() >= MAX_MEMBERS {
            return Err(Error::TooManyMembers);
        }

        let mut amount: i128 = 0;
        for i in 0..pool.problem_ids.len() {
            let p = load_problem(&env, pool.problem_ids.get(i).unwrap())?;
            if p.pyme == pyme {
                amount = amount.saturating_add(p.amount);
            }
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        pool.members.push_back(pyme.clone());
        pool.amounts.push_back(amount);
        pool.committed = pool.committed.saturating_add(amount);
        if pool.members.len() == pool.expected.len() {
            pool.status = Status::Open;
        }
        save_pool(&env, &pool);
        PoolJoined { pyme, pool_id }.publish(&env);
        Ok(())
    }

    /// Cambia la parte de una pyme antes de que haya plata en el retén.
    pub fn revise_amount(env: Env, pyme: Address, pool_id: u32, amount: i128) -> Result<(), Error> {
        pyme.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut pool = load_pool(&env, pool_id)?;
        match pool.status {
            Status::Proposed | Status::Open | Status::Claimed | Status::EscrowReady => {}
            _ => return Err(Error::WrongStatus),
        }
        if contains_addr(&pool.funders, &pyme) {
            return Err(Error::AlreadyFunded);
        }
        let mut idx: Option<u32> = None;
        for i in 0..pool.members.len() {
            if pool.members.get(i).unwrap() == pyme {
                idx = Some(i);
                break;
            }
        }
        let i = idx.ok_or(Error::NotAMember)?;
        let old = pool.amounts.get(i).unwrap();
        let mut amounts = Vec::new(&env);
        for n in 0..pool.amounts.len() {
            if n == i {
                amounts.push_back(amount);
            } else {
                amounts.push_back(pool.amounts.get(n).unwrap());
            }
        }
        pool.amounts = amounts;
        pool.committed = pool.committed.saturating_sub(old).saturating_add(amount);
        for n in 0..pool.problem_ids.len() {
            let pid = pool.problem_ids.get(n).unwrap();
            let mut p = load_problem(&env, pid)?;
            if p.pyme == pyme {
                p.amount = amount;
                save_problem(&env, &p);
            }
        }
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn claim(env: Env, dev: Address, pool_id: u32) -> Result<(), Error> {
        dev.require_auth();
        let mut pool = load_pool(&env, pool_id)?;
        if pool.status != Status::Open {
            return Err(Error::WrongStatus);
        }
        if pool.dev.is_some() {
            return Err(Error::AlreadyClaimed);
        }
        if contains_addr(&pool.expected, &dev) || contains_addr(&pool.members, &dev) {
            return Err(Error::DevIsMember);
        }
        pool.dev = Some(dev.clone());
        pool.status = Status::Claimed;
        save_pool(&env, &pool);
        PoolClaimed { dev, pool_id }.publish(&env);
        Ok(())
    }

    pub fn set_escrow(
        env: Env,
        caller: Address,
        pool_id: u32,
        escrow: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        let mut pool = load_pool(&env, pool_id)?;
        let is_admin = caller == admin_of(&env);
        let is_dev = pool.dev.as_ref() == Some(&caller);
        if !is_admin && !is_dev {
            return Err(Error::Unauthorized);
        }
        if pool.status != Status::Claimed {
            return Err(Error::WrongStatus);
        }
        if pool.escrow.is_some() {
            return Err(Error::EscrowAlreadySet);
        }
        pool.escrow = Some(escrow);
        pool.status = Status::EscrowReady;
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn set_evidence(
        env: Env,
        dev: Address,
        pool_id: u32,
        evidence_hash: BytesN<32>,
    ) -> Result<(), Error> {
        dev.require_auth();
        let mut pool = load_pool(&env, pool_id)?;
        match pool.status {
            Status::Claimed | Status::EscrowReady | Status::Funded | Status::Delivered => {}
            _ => return Err(Error::WrongStatus),
        }
        if pool.dev.as_ref() != Some(&dev) {
            return Err(Error::Unauthorized);
        }
        pool.evidence_hash = Some(evidence_hash);
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn mark_funded(env: Env, pyme: Address, pool_id: u32) -> Result<(), Error> {
        pyme.require_auth();
        let mut pool = load_pool(&env, pool_id)?;
        if pool.status != Status::EscrowReady && pool.status != Status::Funded {
            return Err(Error::WrongStatus);
        }
        let mut idx: Option<u32> = None;
        for i in 0..pool.members.len() {
            if pool.members.get(i).unwrap() == pyme {
                idx = Some(i);
                break;
            }
        }
        let i = idx.ok_or(Error::NotAMember)?;
        if contains_addr(&pool.funders, &pyme) {
            return Err(Error::AlreadyFunded);
        }
        pool.funders.push_back(pyme);
        pool.funded = pool.funded.saturating_add(pool.amounts.get(i).unwrap());
        if pool.funders.len() == pool.members.len() {
            pool.status = Status::Funded;
        }
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn vote_delivery(env: Env, pyme: Address, pool_id: u32, accept: bool) -> Result<(), Error> {
        pyme.require_auth();
        let mut pool = load_pool(&env, pool_id)?;
        if pool.status != Status::Funded {
            return Err(Error::WrongStatus);
        }
        if !contains_addr(&pool.members, &pyme) {
            return Err(Error::NotAMember);
        }
        if contains_addr(&pool.voters, &pyme) {
            return Err(Error::AlreadyVoted);
        }
        pool.voters.push_back(pyme.clone());
        pool.votes_yes.push_back(accept);
        if accept {
            pool.yes_count += 1;
        }
        if pool.yes_count * 2 > pool.members.len() {
            pool.status = Status::Delivered;
        }
        save_pool(&env, &pool);
        DeliveryVoted {
            pyme,
            pool_id,
            accept,
        }
        .publish(&env);
        Ok(())
    }

    pub fn mark_disputed(env: Env, admin: Address, pool_id: u32) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        let mut pool = load_pool(&env, pool_id)?;
        if pool.status != Status::Funded && pool.status != Status::Delivered {
            return Err(Error::WrongStatus);
        }
        pool.status = Status::Disputed;
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn mark_released(env: Env, admin: Address, pool_id: u32) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        let mut pool = load_pool(&env, pool_id)?;
        if pool.status != Status::Delivered {
            return Err(Error::WrongStatus);
        }
        pool.status = Status::Released;
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn mark_resolved(
        env: Env,
        admin: Address,
        pool_id: u32,
        dev_amount: i128,
    ) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        if dev_amount < 0 {
            return Err(Error::InvalidAmount);
        }
        let mut pool = load_pool(&env, pool_id)?;
        if pool.status != Status::Disputed {
            return Err(Error::WrongStatus);
        }
        pool.resolved_dev_amount = dev_amount;
        pool.status = Status::Resolved;
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn cancel(env: Env, caller: Address, pool_id: u32) -> Result<(), Error> {
        caller.require_auth();
        let mut pool = load_pool(&env, pool_id)?;
        let is_admin = caller == admin_of(&env);
        let is_member =
            contains_addr(&pool.expected, &caller) || contains_addr(&pool.members, &caller);
        if !is_admin && !is_member {
            return Err(Error::Unauthorized);
        }
        match pool.status {
            Status::Proposed | Status::Open | Status::Claimed | Status::EscrowReady => {}
            _ => return Err(Error::CannotCancel),
        }
        if pool.funded > 0 {
            return Err(Error::CannotCancel);
        }
        pool.status = Status::Cancelled;
        save_pool(&env, &pool);
        Ok(())
    }

    pub fn get_pool(env: Env, id: u32) -> Result<Pool, Error> {
        load_pool(&env, id)
    }

    pub fn get_problem(env: Env, id: u32) -> Result<Problem, Error> {
        load_problem(&env, id)
    }

    pub fn count_problems(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProblemCount)
            .unwrap_or(0)
    }

    pub fn count_pools(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PoolCount)
            .unwrap_or(0)
    }

    pub fn list_pools(env: Env, start: u32, limit: u32) -> Vec<Pool> {
        let total = Self::count_pools(env.clone());
        let cap = if limit > MAX_LIST { MAX_LIST } else { limit };
        let mut out: Vec<Pool> = Vec::new(&env);
        let mut i = start;
        while i < total && out.len() < cap {
            if let Ok(pool) = load_pool(&env, i) {
                out.push_back(pool);
            }
            i += 1;
        }
        out
    }

    pub fn list_problems(env: Env, start: u32, limit: u32) -> Vec<Problem> {
        let total = Self::count_problems(env.clone());
        let cap = if limit > MAX_LIST { MAX_LIST } else { limit };
        let mut out: Vec<Problem> = Vec::new(&env);
        let mut i = start;
        while i < total && out.len() < cap {
            if let Ok(p) = load_problem(&env, i) {
                out.push_back(p);
            }
            i += 1;
        }
        out
    }

    pub fn admin(env: Env) -> Address {
        admin_of(&env)
    }
}

mod test;
