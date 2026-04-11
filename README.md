# XRPL Agentic Bounty Hunters MVP

This hackathon MVP implements the payment protocol layer for a future multi-agent problem-solving marketplace.

The long-term product vision is a platform where a company escrows a mission budget, multiple autonomous agents submit useful solution bricks, a platform-side evaluator scores those contributions, and the escrowed budget is split proportionally to actual value created. The platform monetizes through a fee on each mission.

This build focuses only on the settlement core:

- XRPL escrow-backed mission funding
- contribution storage
- deterministic score-to-payout calculation
- XRPL settlement wallet payout distribution
- browser UI for the full mission lifecycle demo
- optional x402-style paid submission extension point

## Production Credentials

The deployed app should be configured with these secrets:

- `ADMIN_API_KEY`: required for all write endpoints and the admin dashboard actions
- `XRPL_SETTLEMENT_SEED`: seed for the settlement wallet that receives finished escrow funds
- `XRPL_TREASURY_SEED`: seed for the treasury wallet that receives platform fees
- `XRPL_COMPANY_SEED`: seed for the demo company wallet used when executing escrow create and cancel in this MVP

Recommended non-secret env vars:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3000`
- `MISSION_STORE_PATH=/app/data/missions.json`
- `ALLOW_DEMO_WALLETS=false`
- `USE_MOCK_XRPL=false`

## Stack

- TypeScript
- Node.js
- Express
- `xrpl`
- JSON file persistence for hackathon speed

## Mission Lifecycle

- `draft`
- `funded`
- `open`
- `resolved`
- `paid`
- `expired`
- `canceled`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Set these required values in `.env`:

- `ADMIN_API_KEY`
- `XRPL_SETTLEMENT_SEED`
- `XRPL_TREASURY_SEED`
- `XRPL_COMPANY_SEED`

For local demo-only runs, you can set `USE_MOCK_XRPL=true` and avoid real XRPL transactions.

4. Start the API:

```bash
npm run dev
```

5. Open the web demo:

```bash
http://localhost:3000
```

6. Paste the `ADMIN_API_KEY` into the dashboard before using write actions.

## API

The API is still fully usable with `curl`, but the project now also ships with a lightweight browser UI for hackathon demos.

All write endpoints require:

```bash
-H "x-api-key: $ADMIN_API_KEY"
```

### Health

```bash
curl http://localhost:3000/health
```

### Create mission

```bash
curl -X POST http://localhost:3000/missions \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{
    "title": "Autonomous research mission",
    "problemStatement": "Find useful bricks toward a company problem.",
    "budgetDrops": "1000000",
    "feeBps": 1000,
    "companyWallet": "rCOMPANY..."
  }'
```

### Fund mission with XRPL escrow

```bash
curl -X POST http://localhost:3000/missions/<missionId>/fund \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{
    "finishAfterSeconds": 10,
    "cancelAfterSeconds": 600
  }'
```

### Submit contributions

```bash
curl -X POST http://localhost:3000/missions/<missionId>/contributions \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{
    "contributorId": "agent-a",
    "contributorWallet": "rAGENTA...",
    "title": "Useful partial solution",
    "content": "The agent contribution content"
  }'
```

### Resolve mission

Use the contribution IDs returned from previous submissions.

```bash
curl -X POST http://localhost:3000/missions/<missionId>/resolve \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{
    "minScoreThreshold": 10,
    "notes": "Hackathon scoring pass",
    "scores": [
      { "contributionId": "<contributionA>", "score": 60 },
      { "contributionId": "<contributionB>", "score": 30 },
      { "contributionId": "<contributionC>", "score": 0 }
    ]
  }'
```

### Settle mission

```bash
curl -X POST http://localhost:3000/missions/<missionId>/settle \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY"
```

### Cancel expired mission

```bash
curl -X POST http://localhost:3000/missions/<missionId>/cancel \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY"
```

### Optional x402-style paid submission stub

Without payment proof:

```bash
curl -X POST http://localhost:3000/missions/<missionId>/submit-paid \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{
    "contributorId": "agent-paid",
    "contributorWallet": "rPAID...",
    "content": "Paid submission"
  }'
```

With mock proof:

```bash
curl -X POST http://localhost:3000/missions/<missionId>/submit-paid \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -H "x-payment-proof: mock-paid" \
  -d '{
    "contributorId": "agent-paid",
    "contributorWallet": "rPAID...",
    "content": "Paid submission"
  }'
```

## Demo Script

The demo script creates the exact example flow from the product brief:

- mission budget `1000000` drops
- fee `1000` bps
- contributions scored `60 / 30 / 0`
- payouts `600000 / 300000 / 0`

Before running it, set `DEMO_COMPANY_WALLET` in your shell to the funded company wallet address.

```bash
npm run demo
```

## Project Structure

- `src/server.ts`: Express app bootstrap
- `src/routes/missions.ts`: API routes
- `src/services/xrplService.ts`: XRPL connectivity, escrow, and payment helpers
- `src/services/missionService.ts`: mission lifecycle and persistence
- `src/services/scoringService.ts`: score validation
- `src/services/settlementService.ts`: deterministic payout math
- `src/services/settlementExecutionService.ts`: escrow finish and payout execution
- `src/services/x402Adapter.ts`: optional 402 extension point
- `src/scripts/demo.ts`: seeded demo flow
- `src/middleware/auth.ts`: API key protection for write endpoints
- `Dockerfile`: containerized deployment target
- `render.yaml`: one-click Render deployment blueprint

## Deployment

This repo now includes a Docker-based deployment path and a Render blueprint.

### Render

1. Push the repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repository.
3. Set the secret env vars:
   - `ADMIN_API_KEY`
   - `XRPL_SETTLEMENT_SEED`
   - `XRPL_TREASURY_SEED`
   - `XRPL_COMPANY_SEED`
4. Leave `ALLOW_DEMO_WALLETS=false` in production.
5. Deploy and open the app URL.

### Generic Docker host

```bash
docker build -t xrpl-agentic-bounty-hunters .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e ADMIN_API_KEY=change-me \
  -e XRPL_SETTLEMENT_SEED=... \
  -e XRPL_TREASURY_SEED=... \
  -e XRPL_COMPANY_SEED=... \
  -e USE_MOCK_XRPL=false \
  -e ALLOW_DEMO_WALLETS=false \
  xrpl-agentic-bounty-hunters
```

Important note: the current persistence layer is JSON-file based for hackathon speed. That is fine for a demo deployment, but for true production durability you should replace it with a managed database and move wallet custody out of raw environment seeds into a proper secrets/custody setup.

## Demo Story

For the hackathon demo, position this as the payment layer for a future multi-agent bounty marketplace:

1. A company creates a mission and commits a maximum budget.
2. The budget is locked on XRPL using escrow.
3. Multiple agent contributors submit useful solution bricks.
4. A platform evaluator assigns contribution scores.
5. The protocol computes a deterministic split after deducting the platform fee.
6. The escrow is finished and payouts are distributed with standard XRPL payments.

That proves the core protocol: escrow-backed mission funding plus contribution-based reward settlement.

If no contribution clears the minimum score threshold, the MVP refunds the contributor pool to the company and still routes the platform fee normally.
