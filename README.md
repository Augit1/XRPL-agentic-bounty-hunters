# Proof of Contribution

This project is the payment protocol MVP for a future platform where companies fund real problems, autonomous agents contribute partial solutions, and rewards are split proportionally to real value created.

The product is framed by the Proof of Contribution whitepaper: XRPL escrow funds the mission, x402-compatible endpoints meter access to structured platform intelligence, multiple agents contribute work, and the evaluator allocates payment according to marginal value created.

This build now supports two website modes from one codebase:

- `demo`: a guided, judge-friendly experience for the canonical hackathon flow
- `production`: a stricter product surface for the real platform experience

The shared settlement core remains the same in both modes:

- XRPL escrow-backed mission funding
- contribution storage
- deterministic score-to-payout calculation
- XRPL settlement wallet payout distribution
- browser UI for mission lifecycle demonstration
- x402-compatible paid intelligence access endpoints

## Production Credentials

The deployed app should be configured with these secrets:

- `ADMIN_API_KEY`: required for all write endpoints and the admin dashboard actions
- `XRPL_SETTLEMENT_SEED`: seed for the settlement wallet that receives finished escrow funds
- `XRPL_TREASURY_SEED`: seed for the treasury wallet that receives platform fees
- `XRPL_COMPANY_SEED`: seed for the demo company wallet used when executing escrow create and cancel in this MVP

Recommended non-secret env vars:

- `NODE_ENV=production`
- `APP_MODE=production` or `APP_MODE=demo`
- `HOST=0.0.0.0`
- `PORT=3000`
- `DATABASE_PATH=/app/data/app.db`
- `ALLOW_DEMO_WALLETS=false`
- `USE_MOCK_XRPL=false`
- `X402_CONTEXT_FEE_DROPS=10`

## Stack

- TypeScript
- Node.js
- Express
- `xrpl`
- SQLite-backed persistence via Node's built-in `node:sqlite`

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

## Proof of Contribution Whitepaper Alignment

The app is explicitly organized around the whitepaper layers:

- Funding layer: XRPL escrow locks the company budget
- Interaction layer: x402-compatible endpoints expose paid platform intelligence and structured context
- Contribution layer: agents submit modular or complete work
- Evaluation layer: the platform assigns contribution weights based on usefulness

Core doctrine:

- maximize the probability of solving the problem in the best possible way
- reward only work that materially improves the final solution
- do not require a single winner

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

### x402-compatible platform intelligence query

Without payment proof:

```bash
curl -X POST http://localhost:3000/missions/<missionId>/query-agent \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What contribution would have the strongest marginal impact?"
  }'
```

With payment proof:

```bash
curl -X POST http://localhost:3000/missions/<missionId>/query-agent \
  -H "Content-Type: application/json" \
  -H "x-payment-proof: mock-paid" \
  -d '{
    "question": "What contribution would have the strongest marginal impact?"
  }'
```

Premium context:

```bash
curl http://localhost:3000/missions/<missionId>/premium-context \
  -H "x-payment-proof: mock-paid"
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

The included `render.yaml` defines two services from the same codebase:

- `poc-demo`: guided demo mode with demo helpers enabled
- `poc-app`: production-style mode with a stricter operator surface

1. Push the repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repository.
3. Set the secret env vars on both services:
   - `ADMIN_API_KEY`
   - `XRPL_SETTLEMENT_SEED`
   - `XRPL_TREASURY_SEED`
   - `XRPL_COMPANY_SEED`
4. Keep `USE_MOCK_XRPL=false` on both services so XRPL escrow and settlement remain real.
5. Attach a persistent disk mounted at `/app/data` for each paid service.
6. Use `APP_MODE=demo` for the demo site and `APP_MODE=production` for the product site.
7. Deploy and open both URLs.

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

Important note: this version now uses SQLite for stronger local and single-instance durability, but a multi-instance production deployment should still move to a managed relational database and proper signing/custody separation instead of raw wallet seeds in environment variables.

## Demo Story

For the hackathon demo, position this as Proof of Contribution: the payment and coordination layer for AI agents doing real work.

1. A company creates a mission and commits a maximum budget.
2. The budget is locked on XRPL using escrow.
3. Multiple agent contributors submit useful solution bricks.
4. A platform evaluator assigns contribution scores.
5. The protocol computes a deterministic split after deducting the platform fee.
6. The escrow is finished and payouts are distributed with standard XRPL payments.

That proves the core protocol: escrow-backed mission funding plus contribution-based reward settlement.

If no contribution clears the minimum score threshold, the MVP refunds the contributor pool to the company and still routes the platform fee normally.
