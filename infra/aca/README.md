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

## Quick deploy

1. Login to Azure CLI.
2. Export environment variables locally:

```bash
export JWT_SECRET='replace-with-strong-secret'
export AZURE_COSMOS_ENDPOINT='https://<cosmos-account>.documents.azure.com:443/'
export AZURE_COSMOS_KEY='<cosmos-key>'
```

3. Run:

```bash
bash infra/aca/deploy.sh <resource-group> <azure-region> <containerapp-name> <acr-name>
```

## Spark hosting note

For Spark-managed hosting, use the same container image and set the same environment variables in Spark settings. ACA provides the managed runtime, and Cosmos DB provides managed key-value persistence for timeline/payment/event mirrors.
