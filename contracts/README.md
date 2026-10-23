# StarTip Stellar Soroban Smart Contract

Non-custodial, direct tipping smart contract built on **Stellar Soroban**.

## Features

- **Direct Token Transfer**: Supports native XLM and USDC via Stellar Asset Contracts (`token::Client`).
- **Creator Registry**: Creators set their minimum tip thresholds and payout addresses.
- **Configurable Platform Fee**: Optional platform fee (default is 0 bps for 100% non-custodial direct tipping, can be set up to 1000 bps / 10%).
- **On-chain Events**: Emits typed Soroban events (`("tip", creator, token)`) containing supporter, amount, message, supporter name, and ledger timestamp.
- **On-chain Analytics**: Real-time counter of total tips and total volume per token per creator.
- **Security & Authorization**: Enforces strict `require_auth()` checks for supporters, creators, and admin.

## Functions

| Function | Parameters | Description |
|---|---|---|
| `initialize` | `admin: Address, fee_recipient: Address, fee_bps: u32` | One-time contract initialization |
| `register_creator` | `creator: Address, receiving_address: Address, min_tip_amount: i128` | Registers creator tipping configuration |
| `set_creator_status` | `creator: Address, active: bool` | Pauses or resumes tipping for creator |
| `tip` | `supporter: Address, creator: Address, token: Address, amount: i128, supporter_name: String, message: String` | Sends tip, routes token directly, emits on-chain event |
| `update_fee` | `caller: Address, new_fee_recipient: Address, new_fee_bps: u32` | Admin-only fee config update |
| `get_creator` | `creator: Address -> Option<CreatorProfile>` | Reads creator configuration |
| `get_creator_stats` | `creator: Address, token: Address -> i128` | Reads total tipped amount for creator and token |
| `get_total_tips` | `() -> u32` | Reads global tip counter |
| `get_fee_config` | `() -> (Option<Address>, u32)` | Reads current fee configuration |

## Building & Testing

```bash
# Run unit tests
cargo test

# Build WASM bytecode
cargo build --target wasm32-unknown-unknown --release
```

## Deploying to Stellar Testnet

Using the Stellar CLI:

```bash
# 1. Install Stellar CLI (if not already installed)
cargo install --locked stellar-cli

# 2. Add testnet identity
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet

# 3. Build contract
stellar contract build

# 4. Deploy to Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/startip_contract.wasm \
  --source alice \
  --network testnet
```
