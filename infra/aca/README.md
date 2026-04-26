# Azure ACA + Cosmos Deployment

This project now supports managed cloud hosting on Azure Container Apps (ACA) with optional managed persistence in Azure Cosmos DB.

## What is cloud-connected in this app

- WebSocket real-time stream endpoint: `/ws`
- Persisted shipment history snapshots and timeline events in SQLite plus optional Cosmos mirror
- Blockchain payment transactions in `payment_transactions` table
- Blockchain ledger events in `blockchain_events` table
- Optional Cosmos DB mirroring for:
  - `shipment_timeline`
  - `payment_transactions`
  - `blockchain_events`

## Required environment variables

- `JWT_SECRET`
- `PORT` (default `8787`)
- `CORS_ORIGIN` (frontend URL)
- `AZURE_COSMOS_ENDPOINT` (optional, enables cloud mirror)
- `AZURE_COSMOS_KEY` (optional, enables cloud mirror)
- `AZURE_COSMOS_DATABASE` (optional, default `aegischain`)

If Cosmos values are omitted, the app runs with local SQLite only.

## Deployment Matrix

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `JWT_SECRET` | Yes | `long-random-secret` | Signs and validates backend auth tokens |
| `PORT` | No | `8787` | Backend HTTP/WS port |
| `CORS_ORIGIN` | Yes | `https://your-spark-app.example` | Allowed browser origin for frontend |
| `AZURE_COSMOS_ENDPOINT` | No | `https://acct.documents.azure.com:443/` | Cosmos DB endpoint |
| `AZURE_COSMOS_KEY` | No | `...` | Cosmos DB key (stored as secret) |
| `AZURE_COSMOS_DATABASE` | No | `aegischain` | Cosmos DB database name |
| `VITE_API_BASE_URL` | Yes (frontend) | `https://<aca-fqdn>` | Frontend API/WS base derivation |

Modes:
- ACA only: set `JWT_SECRET`, `CORS_ORIGIN`, and frontend `VITE_API_BASE_URL`
- ACA + Cosmos: set all variables for managed cloud persistence mirror

## Quick deploy

1. Login to Azure CLI.
2. Export environment variables locally:

```bash
export JWT_SECRET='replace-with-strong-secret'
export CORS_ORIGIN='https://your-frontend-domain'
export AZURE_COSMOS_ENDPOINT='https://<cosmos-account>.documents.azure.com:443/'
export AZURE_COSMOS_KEY='<cosmos-key>'
export AZURE_COSMOS_DATABASE='aegischain'
```

3. Run:

```bash
bash infra/aca/deploy.sh <resource-group> <azure-region> <containerapp-name> <acr-name>
```

## Infrastructure as Code options

- Bicep: [infra/aca/bicep/README.md](infra/aca/bicep/README.md)
- Terraform: [infra/aca/terraform/README.md](infra/aca/terraform/README.md)

Both IaC stacks provision ACA runtime infrastructure and optional Cosmos resources.

## GitHub Actions automation

- IaC checks on push/PR: [.github/workflows/iac-checks.yml](.github/workflows/iac-checks.yml)
- OIDC deploy (manual dispatch): [.github/workflows/azure-iac-deploy.yml](.github/workflows/azure-iac-deploy.yml)
- Environment/OIDC setup guide: [.github/oidc-environments.md](.github/oidc-environments.md)

Policy behavior configured:
- IaC check runs auto-cancel stale in-progress runs on new commits to the same ref
- Deploy workflow supports only `development` and `production` environments
- Production deploys are concurrency-locked to one active run at a time
- Production apply runs are allowed only from the `main` branch

## Spark hosting note

For Spark-managed hosting, use the same container image and set the same environment variables in Spark settings. ACA provides the managed runtime, and Cosmos DB provides managed key-value persistence for timeline/payment/event mirrors.

Recommended Spark frontend variables:

```bash
VITE_API_BASE_URL=https://<aca-fqdn>
```
