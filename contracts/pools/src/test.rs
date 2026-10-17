#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    Address, Env, Event as _, String, Vec,
    testutils::{Address as _, Events as _},
};

const TEN: i128 = 100_000_000;

fn setup() -> (Env, Address, PoolsClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(Pools, (admin.clone(),));
    let client = PoolsClient::new(&env, &id);
    (env, admin, client)
}

fn title(env: &Env, s: &str) -> String {
    String::from_str(env, s)
}

fn post_three(env: &Env, client: &PoolsClient<'_>) -> (Address, Address, Address, u32, u32, u32) {
    let a = Address::generate(env);
    let b = Address::generate(env);
    let c = Address::generate(env);
    let cat = title(env, "videos");
    let id_a = client.post_problem(&a, &title(env, "Videos para Instagram"), &cat, &TEN);
    let id_b = client.post_problem(&b, &title(env, "Mejorar Reels"), &cat, &TEN);
    let id_c = client.post_problem(&c, &title(env, "Videos de la panadería"), &cat, &TEN);
    (a, b, c, id_a, id_b, id_c)
}

fn open_pool(
    env: &Env,
    admin: &Address,
    client: &PoolsClient<'_>,
) -> (Address, Address, Address, Address, u32) {
    let (a, b, c, id_a, id_b, id_c) = post_three(env, client);
    let mut ids = Vec::new(env);
    ids.push_back(id_a);
    ids.push_back(id_b);
    ids.push_back(id_c);
    let pool_id = client.propose_pool(admin, &ids);
    client.join_pool(&a, &pool_id);
    client.join_pool(&b, &pool_id);
    client.join_pool(&c, &pool_id);
    let dev = Address::generate(env);
    (a, b, c, dev, pool_id)
}

#[test]
fn posts_problem_and_requires_auth() {
    let (env, _, client) = setup();
    let pyme = Address::generate(&env);
    let id = client.post_problem(
        &pyme,
        &title(&env, "Videos para redes"),
        &title(&env, "videos"),
        &TEN,
    );
    assert_eq!(id, 0);
    let expected = ProblemPosted {
        pyme: pyme.clone(),
        id,
        amount: TEN,
    };
    assert_eq!(
        env.events().all(),
        std::vec![expected.to_xdr(&env, &client.address)]
    );
    assert_eq!(env.auths()[0].0, pyme);
    let p = client.get_problem(&id);
    assert_eq!(p.amount, TEN);
    assert_eq!(client.count_problems(), 1);
}

#[test]
fn rejects_bad_problem_input() {
    let (env, _, client) = setup();
    let pyme = Address::generate(&env);
    let cat = title(&env, "videos");
    assert_eq!(
        client.try_post_problem(&pyme, &title(&env, ""), &cat, &TEN),
        Err(Ok(Error::EmptyTitle))
    );
    let long = std::string::String::from("x").repeat(MAX_TITLE_LEN as usize + 1);
    assert_eq!(
        client.try_post_problem(&pyme, &String::from_str(&env, &long), &cat, &TEN),
        Err(Ok(Error::TitleTooLong))
    );
    assert_eq!(
        client.try_post_problem(&pyme, &title(&env, "ok"), &title(&env, ""), &TEN),
        Err(Ok(Error::CategoryTooLong))
    );
    assert_eq!(
        client.try_post_problem(&pyme, &title(&env, "ok"), &cat, &0),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn propose_join_claim_fund_vote_release() {
    let (env, admin, client) = setup();
    let (a, b, c, dev, pool_id) = open_pool(&env, &admin, &client);
    client.claim(&dev, &pool_id);
    let escrow = Address::generate(&env);
    client.set_escrow(&admin, &pool_id, &escrow);
    client.mark_funded(&a, &pool_id);
    client.mark_funded(&b, &pool_id);
    client.mark_funded(&c, &pool_id);
    let pool = client.get_pool(&pool_id);
    assert_eq!(pool.status, Status::Funded);
    assert_eq!(pool.funded, TEN * 3);
    client.vote_delivery(&a, &pool_id, &true);
    client.vote_delivery(&b, &pool_id, &true);
    let pool = client.get_pool(&pool_id);
    assert_eq!(pool.status, Status::Delivered);
    client.mark_released(&admin, &pool_id);
    assert_eq!(client.get_pool(&pool_id).status, Status::Released);
}

#[test]
fn grouping_requires_same_category_and_two_problems() {
    let (env, admin, client) = setup();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let id_a = client.post_problem(&a, &title(&env, "Videos"), &title(&env, "videos"), &TEN);
    let id_b = client.post_problem(&b, &title(&env, "Web"), &title(&env, "web"), &TEN);
    let mut one = Vec::new(&env);
    one.push_back(id_a);
    assert_eq!(
        client.try_propose_pool(&admin, &one),
        Err(Ok(Error::TooFewProblems))
    );
    let mut mixed = Vec::new(&env);
    mixed.push_back(id_a);
    mixed.push_back(id_b);
    assert_eq!(
        client.try_propose_pool(&admin, &mixed),
        Err(Ok(Error::CategoryMismatch))
    );
}

#[test]
fn stranger_cannot_join_and_member_cannot_claim() {
    let (env, admin, client) = setup();
    let (a, _b, _c, _id_a, id_b, id_c) = post_three(&env, &client);
    let mut ids = Vec::new(&env);
    ids.push_back(_id_a);
    ids.push_back(id_b);
    ids.push_back(id_c);
    let pool_id = client.propose_pool(&admin, &ids);
    let stranger = Address::generate(&env);
    assert_eq!(
        client.try_join_pool(&stranger, &pool_id),
        Err(Ok(Error::NotAMember))
    );
    client.join_pool(&a, &pool_id);
    assert_eq!(
        client.try_join_pool(&a, &pool_id),
        Err(Ok(Error::AlreadyJoined))
    );
    let (_a, _b2, _c2, _dev, open_id) = open_pool(&env, &admin, &client);
    assert_eq!(client.try_claim(&_a, &open_id), Err(Ok(Error::DevIsMember)));
}

#[test]
fn cancel_only_before_funding() {
    let (env, admin, client) = setup();
    let (a, _b, _c, dev, pool_id) = open_pool(&env, &admin, &client);
    client.cancel(&a, &pool_id);
    assert_eq!(client.get_pool(&pool_id).status, Status::Cancelled);
    let (_a2, b, c, dev2, pool2) = open_pool(&env, &admin, &client);
    client.claim(&dev2, &pool2);
    let escrow = Address::generate(&env);
    client.set_escrow(&admin, &pool2, &escrow);
    client.mark_funded(&b, &pool2);
    assert_eq!(client.try_cancel(&c, &pool2), Err(Ok(Error::CannotCancel)));
    let _ = (dev, _b, _c);
}

#[test]
fn dispute_then_resolve_records_dev_amount() {
    let (env, admin, client) = setup();
    let (a, b, c, dev, pool_id) = open_pool(&env, &admin, &client);
    client.claim(&dev, &pool_id);
    client.set_escrow(&admin, &pool_id, &Address::generate(&env));
    client.mark_funded(&a, &pool_id);
    client.mark_funded(&b, &pool_id);
    client.mark_funded(&c, &pool_id);
    client.mark_disputed(&admin, &pool_id);
    assert_eq!(client.get_pool(&pool_id).status, Status::Disputed);
    client.mark_resolved(&admin, &pool_id, &(TEN * 2));
    let pool = client.get_pool(&pool_id);
    assert_eq!(pool.status, Status::Resolved);
    assert_eq!(pool.resolved_dev_amount, TEN * 2);
}

#[test]
fn wrong_admin_is_rejected() {
    let (env, admin, client) = setup();
    let (a, _b, _c, id_a, id_b, id_c) = post_three(&env, &client);
    let mut ids = Vec::new(&env);
    ids.push_back(id_a);
    ids.push_back(id_b);
    ids.push_back(id_c);
    let impostor = Address::generate(&env);
    assert_eq!(
        client.try_propose_pool(&impostor, &ids),
        Err(Ok(Error::Unauthorized))
    );
    let _ = (admin, a);
}

#[test]
fn list_and_counts() {
    let (env, admin, client) = setup();
    let _ = open_pool(&env, &admin, &client);
    assert_eq!(client.count_problems(), 3);
    assert_eq!(client.count_pools(), 1);
    assert_eq!(client.list_pools(&0, &10).len(), 1);
    assert_eq!(client.list_problems(&0, &10).len(), 3);
}

#[test]
fn pyme_can_propose_twins_and_dev_sets_escrow() {
    let (env, _admin, client) = setup();
    let (a, _b, _c, id_a, id_b, id_c) = post_three(&env, &client);
    let mut ids = Vec::new(&env);
    ids.push_back(id_a);
    ids.push_back(id_b);
    ids.push_back(id_c);
    let stranger = Address::generate(&env);
    assert_eq!(
        client.try_propose_from_pyme(&stranger, &ids),
        Err(Ok(Error::NotAMember))
    );
    let pool_id = client.propose_from_pyme(&a, &ids);
    client.join_pool(&a, &pool_id);
    client.join_pool(&_b, &pool_id);
    client.join_pool(&_c, &pool_id);
    let dev = Address::generate(&env);
    client.claim(&dev, &pool_id);
    let escrow = Address::generate(&env);
    client.set_escrow(&dev, &pool_id, &escrow);
    assert_eq!(client.get_pool(&pool_id).status, Status::EscrowReady);
}

#[test]
fn revise_amount_before_funding() {
    let (env, admin, client) = setup();
    let (a, b, c, _dev, pool_id) = open_pool(&env, &admin, &client);
    client.revise_amount(&a, &pool_id, &(TEN * 2));
    let pool = client.get_pool(&pool_id);
    assert_eq!(pool.committed, TEN * 4);
    assert_eq!(pool.amounts.get(0).unwrap(), TEN * 2);
    let _ = (b, c, admin);
}

#[test]
fn cannot_revise_after_funded() {
    let (env, admin, client) = setup();
    let (a, b, c, dev, pool_id) = open_pool(&env, &admin, &client);
    client.claim(&dev, &pool_id);
    client.set_escrow(&admin, &pool_id, &Address::generate(&env));
    client.mark_funded(&a, &pool_id);
    assert_eq!(
        client.try_revise_amount(&a, &pool_id, &(TEN * 2)),
        Err(Ok(Error::AlreadyFunded))
    );
    let _ = (b, c);
}

#[test]
fn cannot_reuse_problem_in_second_pool() {
    let (env, admin, client) = setup();
    let (_a, _b, _c, id_a, id_b, id_c) = post_three(&env, &client);
    let mut ids = Vec::new(&env);
    ids.push_back(id_a);
    ids.push_back(id_b);
    ids.push_back(id_c);
    client.propose_pool(&admin, &ids);
    assert_eq!(
        client.try_propose_pool(&admin, &ids),
        Err(Ok(Error::AlreadyInPool))
    );
}
