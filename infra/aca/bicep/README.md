# ACA Bicep IaC

This Bicep template provisions Azure Container Apps infrastructure for AegisChain.

## Resources provisioned

- Azure Container Registry (ACR)
- Azure Container Apps Environment
- Azure Container App (with public ingress)
- Optional Azure Cosmos DB account and SQL database

## Deploy

```bash
az group create --name <resource-group> --location <region>
az deployment group create \
  --resource-group <resource-group> \
  --template-file infra/aca/bicep/main.bicep \
  --parameters @infra/aca/bicep/main.parameters.example.json
```

You should update `imageName` and `jwtSecret` before running in production.

## Notes

- `enableCosmos=true` provisions Cosmos DB and injects endpoint/key env vars into the container app.
- `enableCosmos=false` deploys ACA without Cosmos integration.
