#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    Address, Env, String,
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
};

const ONE: i128 = 10_000_000;

fn text(env: &Env, value: &str) -> String {
    String::from_str(env, value)
}

struct World {
    env: Env,
    tesorera: Address,
    asiento: Address,
    luis: Address,
    jorge: Address,
    client: FondosClient<'static>,
    token: TokenClient<'static>,
}

fn world() -> World {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let usdc = sac.address();
    let id = env.register(Fondos, (admin, usdc.clone()));
    let client = FondosClient::new(&env, &id);
    let tesorera = Address::generate(&env);
    let asiento = Address::generate(&env);
    let luis = Address::generate(&env);
    let jorge = Address::generate(&env);
    client.abrir(&tesorera, &asiento);
    client.unirse(&tesorera);
    client.unirse(&asiento);
    client.unirse(&luis);
    client.unirse(&jorge);
    let asset = StellarAssetClient::new(&env, &usdc);
    asset.mint(&asiento, &(40 * ONE));
    asset.mint(&luis, &(40 * ONE));
    asset.mint(&jorge, &(40 * ONE));
    World {
        token: TokenClient::new(&env, &usdc),
        env,
        tesorera,
        asiento,
        luis,
        jorge,
        client,
    }
}

#[test]
fn poner_entra_al_frasco_y_al_contrato() {
    let w = world();
    w.client.poner(&w.asiento, &Jar::Sacos, &(8 * ONE));
    assert_eq!(w.client.jar_de(&Jar::Sacos), 8 * ONE);
    assert_eq!(w.token.balance(&w.client.address), 8 * ONE);
    assert_eq!(w.client.saldo(), 8 * ONE);
}

#[test]
fn la_deuda_se_cobra_antes_del_frasco() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Adelanto, &(20 * ONE));
    w.client.adelanto(&w.asiento, &(8 * ONE));
    assert_eq!(w.client.deuda_de(&w.asiento), 8 * ONE);
    assert_eq!(w.client.jar_de(&Jar::Adelanto), 12 * ONE);
    w.client.poner(&w.asiento, &Jar::Sacos, &(10 * ONE));
    assert_eq!(w.client.deuda_de(&w.asiento), 0);
    assert_eq!(w.client.jar_de(&Jar::Sacos), 2 * ONE);
    assert_eq!(w.token.balance(&w.client.address), 22 * ONE);
}

#[test]
fn pedir_aparta_y_vi_suelta_el_usdc() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Sacos, &(15 * ONE));
    let id = w.client.pedir(
        &w.jorge,
        &Jar::Sacos,
        &(8 * ONE),
        &text(&w.env, "Sacos de yute"),
    );
    assert_eq!(w.client.jar_de(&Jar::Sacos), 7 * ONE);
    assert_eq!(w.client.apartado(), 8 * ONE);
    assert_eq!(w.token.balance(&w.jorge), 40 * ONE);
    w.client.vi(&w.luis, &id);
    assert_eq!(w.client.linea(&id).status, LineStatus::Visto);
    assert_eq!(w.client.apartado(), 0);
    assert_eq!(w.token.balance(&w.jorge), 48 * ONE);
}

#[test]
fn no_confirma_quien_pidio_ni_la_tesorera() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Sacos, &(15 * ONE));
    let id = w.client
        .pedir(&w.jorge, &Jar::Sacos, &(8 * ONE), &text(&w.env, "Sacos de yute"));
    assert_eq!(w.client.try_vi(&w.jorge, &id), Err(Ok(Error::Unauthorized)));
    assert_eq!(
        w.client.try_vi(&w.tesorera, &id),
        Err(Ok(Error::Unauthorized))
    );
    assert_eq!(w.client.linea(&id).status, LineStatus::Apartado);
}

#[test]
fn el_adelanto_solo_lo_firma_el_asiento() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Adelanto, &(20 * ONE));
    assert_eq!(
        w.client.try_adelanto(&w.luis, &(5 * ONE)),
        Err(Ok(Error::Unauthorized))
    );
    assert_eq!(w.client.jar_de(&Jar::Adelanto), 20 * ONE);
}

#[test]
fn devolver_regresa_el_apartado_al_frasco() {
    let w = world();
    w.client.poner(&w.luis, &Jar::Flete, &(10 * ONE));
    let id = w.client.pedir(
        &w.jorge,
        &Jar::Flete,
        &(4 * ONE),
        &text(&w.env, "Flete del grano"),
    );
    w.client.devolver(&w.jorge, &id);
    assert_eq!(w.client.jar_de(&Jar::Flete), 10 * ONE);
    assert_eq!(w.client.apartado(), 0);
    assert_eq!(w.token.balance(&w.jorge), 40 * ONE);
}
