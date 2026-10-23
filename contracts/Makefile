.PHONY: all build test clean deploy-testnet

all: build

build:
	cargo build --target wasm32-unknown-unknown --release

test:
	cargo test

clean:
	cargo clean

# Helper target to build with soroban-cli / stellar-cli if installed
build-contract:
	stellar contract build

# Deployment recipe for Stellar Testnet:
# Requires: stellar-cli (`cargo install --locked stellar-cli`)
# Set: CREATOR_SECRET_KEY, ADMIN_PUBLIC_KEY
deploy-testnet:
	@echo "Deploying StarTip contract to Stellar Testnet..."
	stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/startip_contract.wasm \
		--source-account default \
		--network testnet
