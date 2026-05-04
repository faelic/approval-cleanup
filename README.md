# Allowance Cleanup

This is a Sepolia-first MVP for discovering, reviewing and managing ERC-20 token approvals.

Live app: [approval-cleanup-brt3.vercel.app](https://approval-cleanup-brt3.vercel.app/)

Since i began working on blockchain i've discovered that wallet approvals are easy to forget and hard to inspect. That problem inspired me to work on this project where users can both revoke and set new approvals.

It helps a user:

- uncover recent token approvals tied to their wallet
- understand which spender permissions may be risky
- claim test tokens, create approvals, and revoke them in one guided Sepolia flow

## What It Does

The app is built around three flows:

1. Claim a test token from the faucet
2. Approve a spender with the manual approve tool or through another dApp
3. Scan the dashboard and manage detected approvals

Routes:

- `/` - landing page
- `/dashboard` - detected approvals, review, and manage flows
- `/tools/faucet` - claim test tokens from the faucet contract
- `/tools/approve` - create a manual test `approve(spender, amount)` transaction

## Current MVP Scope

This is a demo-ready MVP, not a production-grade approval scanner.

- Network: Sepolia only
- Approval discovery: recent ERC-20 `Approval` logs
- Risk model:
  - `high` = unlimited approvals
  - `medium` = approvals older than 90 days
  - `low` = everything else
- Faucet: one-claim-per-wallet-per-token test faucet for Sepolia ERC-20s


## Smart Contract

The faucet contract is a non-upgradeable, owner-managed and multi-token faucet that:

- supports multiple existing ERC-20 tokens
- allows one claim per wallet per token
- exposes `canClaim(user, token)` for frontend eligibility checks
- lets the owner configure, disable, and withdraw tokens


Verified Sepolia contract:

- Faucet address: `0xd2719323fe38153B2219366AF243552e983ccD49`
- Etherscan: [MultiTokenFaucet](https://sepolia.etherscan.io/address/0xd2719323fe38153B2219366AF243552e983ccD49#code)


## Tech Stack

- Next.js 16
- React 19
- TypeScript
- wagmi
- viem
- RainbowKit
- Hardhat
- OpenZeppelin Contracts
- Tailwind CSS

## Local Setup

Install dependencies:

```bash
npm install
```

Create a root `.env` file with values like:

```env
SEPOLIA_RPC_URL=
PRIVATE_KEY=
ETHERSCAN_API_KEY=
FAUCET_ADDRESS=
USDC_SEPOLIA_ADDRESS=
USDT_SEPOLIA_ADDRESS=
USDC_CLAIM_AMOUNT=10000000
USDT_CLAIM_AMOUNT=10000000
USDC_FUND_AMOUNT=
USDT_FUND_AMOUNT=
```

Start the app:

```bash
npm run dev
```

Run lint:

```bash
npm run lint
```

Run smart contract tests:

```bash
npx hardhat test
```

## Contract Workflow

Compile:

```bash
npx hardhat compile
```

Deploy to Sepolia:

```bash
npx hardhat run scripts/deploy-faucet.ts --network sepolia
```

Configure supported tokens:

```bash
npx hardhat run scripts/configure-faucet.ts --network sepolia
```

Fund the faucet:

```bash
npx hardhat run scripts/fund-faucet.ts --network sepolia
```

Disable a supported token:

```bash
TOKEN_ADDRESS=<token-address> npx hardhat run scripts/disable-token.ts --network sepolia
```

## Testing Flow

The intended demo flow is:

1. Open `/tools/faucet`
2. Claim a test token
3. Open `/tools/approve`
4. Approve a spender
5. Open `/dashboard`
6. Rescan and manage the detected approval

## Known Limitations

This is the most important section to read before treating the dashboard as a complete approval inventory.

- Discovery depends on standard ERC-20 `Approval` events
- Non-standard or non-emitting tokens can be missed
- The dashboard currently scans only a recent window of blocks
- The recent scan is fetched in small chunks because of RPC free-tier log limits
- Older but still-active approvals may not appear
- The dashboard shows the latest detected approval per `token + spender` pair, not the full approval history
- The risk model is intentionally simple and does not yet include spender reputation, protocol trust, or advanced threat analysis

## Project Goal

The goal of this project is to prove the end-to-end approval cleanup flow:

- discover approvals
- explain them simply
- let users revoke or update them
- provide a built-in test environment on Sepolia

It is best understood as a smart contract + wallet UX prototype, not yet a complete production security product.
