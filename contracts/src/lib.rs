#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short,
    token, Address, Env, String,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
    CreatorNotFound = 4,
    CreatorInactive = 5,
    InvalidAmount = 6,
    BelowMinimumTip = 7,
    InvalidFeeBps = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreatorProfile {
    pub receiving_address: Address,
    pub min_tip_amount: i128,
    pub total_tips_count: u32,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    FeeRecipient,
    FeeBps,
    Creator(Address),
    CreatorStats(Address, Address), // (creator, token) -> i128 total amount
    TotalTipsCount,
}

#[contract]
pub struct StarTipContract;

#[contractimpl]
impl StarTipContract {
    /// Initialize the contract with an admin and optional fee config (e.g. 0 bps for zero fee)
    pub fn initialize(
        env: Env,
        admin: Address,
        fee_recipient: Address,
        fee_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if fee_bps > 1000 {
            // Maximum fee is 10% (1000 bps)
            return Err(Error::InvalidFeeBps);
        }

        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::FeeRecipient, &fee_recipient);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        env.storage().instance().set(&DataKey::TotalTipsCount, &0u32);

        Ok(())
    }

    /// Register or configure a creator's tipping parameters
    pub fn register_creator(
        env: Env,
        creator: Address,
        receiving_address: Address,
        min_tip_amount: i128,
    ) -> Result<(), Error> {
        creator.require_auth();

        if min_tip_amount < 0 {
            return Err(Error::InvalidAmount);
        }

        let existing = env
            .storage()
            .persistent()
            .get::<DataKey, CreatorProfile>(&DataKey::Creator(creator.clone()));
        let total_tips_count = existing.map(|c| c.total_tips_count).unwrap_or(0);

        let profile = CreatorProfile {
            receiving_address,
            min_tip_amount,
            total_tips_count,
            active: true,
        };

        env.storage().persistent().set(&DataKey::Creator(creator.clone()), &profile);

        // Publish creator registration event
        env.events().publish(
            (symbol_short!("creator"), symbol_short!("reg"), creator),
            profile.min_tip_amount,
        );

        Ok(())
    }

    /// Update creator profile status or active state
    pub fn set_creator_status(
        env: Env,
        creator: Address,
        active: bool,
    ) -> Result<(), Error> {
        creator.require_auth();

        let mut profile = env
            .storage()
            .persistent()
            .get::<DataKey, CreatorProfile>(&DataKey::Creator(creator.clone()))
            .ok_or(Error::CreatorNotFound)?;

        profile.active = active;
        env.storage().persistent().set(&DataKey::Creator(creator.clone()), &profile);

        env.events().publish(
            (symbol_short!("creator"), symbol_short!("status"), creator),
            active,
        );

        Ok(())
    }

    /// Send a direct tip to a creator using Stellar Asset Contract (XLM or USDC)
    pub fn tip(
        env: Env,
        supporter: Address,
        creator: Address,
        token: Address,
        amount: i128,
        supporter_name: String,
        message: String,
    ) -> Result<u32, Error> {
        supporter.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut profile = env
            .storage()
            .persistent()
            .get::<DataKey, CreatorProfile>(&DataKey::Creator(creator.clone()))
            .ok_or(Error::CreatorNotFound)?;

        if !profile.active {
            return Err(Error::CreatorInactive);
        }

        if amount < profile.min_tip_amount {
            return Err(Error::BelowMinimumTip);
        }

        // Calculate fee if configured
        let fee_bps: u32 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0);
        let fee_recipient: Option<Address> = env.storage().instance().get(&DataKey::FeeRecipient);

        let fee_amount = if fee_bps > 0 && fee_recipient.is_some() {
            (amount * (fee_bps as i128)) / 10000
        } else {
            0
        };

        let creator_amount = amount - fee_amount;

        let token_client = token::Client::new(&env, &token);

        // Direct transfer to creator's designated receiving address
        token_client.transfer(&supporter, &profile.receiving_address, &creator_amount);

        // Transfer fee if configured
        if fee_amount > 0 {
            if let Some(recipient) = fee_recipient {
                token_client.transfer(&supporter, &recipient, &fee_amount);
            }
        }

        // Update creator statistics
        profile.total_tips_count += 1;
        env.storage().persistent().set(&DataKey::Creator(creator.clone()), &profile);

        // Update token-specific stats for this creator
        let stats_key = DataKey::CreatorStats(creator.clone(), token.clone());
        let current_token_total: i128 = env.storage().persistent().get(&stats_key).unwrap_or(0);
        env.storage().persistent().set(&stats_key, &(current_token_total + amount));

        // Increment global tips count
        let total_global: u32 = env.storage().instance().get(&DataKey::TotalTipsCount).unwrap_or(0);
        let new_total_global = total_global + 1;
        env.storage().instance().set(&DataKey::TotalTipsCount, &new_total_global);

        // Emit on-chain tip event for indexers, backend monitors, and livestream overlays
        env.events().publish(
            (symbol_short!("tip"), creator, token),
            (
                supporter,
                amount,
                supporter_name,
                message,
                env.ledger().timestamp(),
            ),
        );

        Ok(profile.total_tips_count)
    }

    /// Update fee configuration (Admin only)
    pub fn update_fee(
        env: Env,
        caller: Address,
        new_fee_recipient: Address,
        new_fee_bps: u32,
    ) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;

        if caller != admin {
            return Err(Error::NotAuthorized);
        }

        if new_fee_bps > 1000 {
            return Err(Error::InvalidFeeBps);
        }

        env.storage().instance().set(&DataKey::FeeRecipient, &new_fee_recipient);
        env.storage().instance().set(&DataKey::FeeBps, &new_fee_bps);

        Ok(())
    }

    /// Read creator profile
    pub fn get_creator(env: Env, creator: Address) -> Option<CreatorProfile> {
        env.storage().persistent().get(&DataKey::Creator(creator))
    }

    /// Read creator stats for a given token
    pub fn get_creator_stats(env: Env, creator: Address, token: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::CreatorStats(creator, token))
            .unwrap_or(0)
    }

    /// Read global tips count
    pub fn get_total_tips(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalTipsCount).unwrap_or(0)
    }

    /// Read fee configuration
    pub fn get_fee_config(env: Env) -> (Option<Address>, u32) {
        let recipient = env.storage().instance().get(&DataKey::FeeRecipient);
        let bps = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0);
        (recipient, bps)
    }
}

#[cfg(test)]
mod test;
