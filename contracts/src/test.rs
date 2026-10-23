#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::Client as TokenClient,
    token::StellarAssetClient as TokenAdminClient,
    Address, Env, String,
};

fn create_token_contract<'a>(e: &Env, admin: &Address) -> (TokenClient<'a>, TokenAdminClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(e, &sac.address()),
        TokenAdminClient::new(e, &sac.address()),
    )
}

#[test]
fn test_tip_flow_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StarTipContract, ());
    let client = StarTipContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let creator = Address::generate(&env);
    let creator_receiving = Address::generate(&env);
    let supporter = Address::generate(&env);

    // Initialize with 1% fee (100 bps)
    client.initialize(&admin, &fee_recipient, &100u32);

    // Register creator with 10 token minimum tip
    client.register_creator(&creator, &creator_receiving, &10i128);

    // Setup mock Stellar asset token (e.g. USDC or XLM)
    let token_admin = Address::generate(&env);
    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);

    // Mint 1000 tokens to supporter
    token_admin_client.mint(&supporter, &1000i128);
    assert_eq!(token_client.balance(&supporter), 1000i128);

    // Send a 100 token tip
    let supporter_name = String::from_str(&env, "Alice");
    let message = String::from_str(&env, "Keep up the great work!");
    let tip_count = client.tip(
        &supporter,
        &creator,
        &token_client.address,
        &100i128,
        &supporter_name,
        &message,
    );

    assert_eq!(tip_count, 1);

    // With 1% fee: creator receives 99 tokens, fee recipient receives 1 token
    assert_eq!(token_client.balance(&creator_receiving), 99i128);
    assert_eq!(token_client.balance(&fee_recipient), 1i128);
    assert_eq!(token_client.balance(&supporter), 900i128);

    // Check stats
    let creator_stats = client.get_creator_stats(&creator, &token_client.address);
    assert_eq!(creator_stats, 100i128);

    let total_tips = client.get_total_tips();
    assert_eq!(total_tips, 1);

    // Profile check
    let profile = client.get_creator(&creator).unwrap();
    assert_eq!(profile.total_tips_count, 1);
    assert_eq!(profile.active, true);
    assert_eq!(profile.receiving_address, creator_receiving);
}

#[test]
fn test_zero_fee_direct_tipping() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StarTipContract, ());
    let client = StarTipContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let creator = Address::generate(&env);
    let supporter = Address::generate(&env);

    // Initialize with 0% fee (0 bps - completely non-custodial direct tipping)
    client.initialize(&admin, &fee_recipient, &0u32);
    client.register_creator(&creator, &creator, &5i128);

    let token_admin = Address::generate(&env);
    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);

    token_admin_client.mint(&supporter, &500i128);

    let supporter_name = String::from_str(&env, "Bob");
    let message = String::from_str(&env, "Loving the content!");
    client.tip(
        &supporter,
        &creator,
        &token_client.address,
        &50i128,
        &supporter_name,
        &message,
    );

    // Exactly 50 tokens directly received by creator, zero fee deducted
    assert_eq!(token_client.balance(&creator), 50i128);
    assert_eq!(token_client.balance(&fee_recipient), 0i128);
    assert_eq!(token_client.balance(&supporter), 450i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_tip_below_minimum_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StarTipContract, ());
    let client = StarTipContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let supporter = Address::generate(&env);

    client.initialize(&admin, &admin, &0u32);
    client.register_creator(&creator, &creator, &25i128);

    let token_admin = Address::generate(&env);
    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);
    token_admin_client.mint(&supporter, &100i128);

    // Attempt to tip 10 when min is 25 -> BelowMinimumTip (#7)
    client.tip(
        &supporter,
        &creator,
        &token_client.address,
        &10i128,
        &String::from_str(&env, "Eve"),
        &String::from_str(&env, "Hi"),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_inactive_creator_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StarTipContract, ());
    let client = StarTipContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let supporter = Address::generate(&env);

    client.initialize(&admin, &admin, &0u32);
    client.register_creator(&creator, &creator, &1i128);
    client.set_creator_status(&creator, &false);

    let token_admin = Address::generate(&env);
    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);
    token_admin_client.mint(&supporter, &100i128);

    // Creator inactive -> CreatorInactive (#5)
    client.tip(
        &supporter,
        &creator,
        &token_client.address,
        &10i128,
        &String::from_str(&env, "Eve"),
        &String::from_str(&env, "Hi"),
    );
}
