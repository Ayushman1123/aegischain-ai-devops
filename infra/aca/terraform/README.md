# ACA Terraform IaC

This Terraform stack provisions Azure Container Apps infrastructure for AegisChain.

## Resources provisioned

- Resource Group
- Azure Container Registry (ACR)
- Log Analytics Workspace
- Container Apps Environment
- Container App with ingress and secrets
- Optional Azure Cosmos DB account + SQL database

## Usage

```bash
cd infra/aca/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Key variables

- `container_image`: image URI with tag
- `jwt_secret`: backend auth signing secret (sensitive)
- `enable_cosmos`: toggle managed Cosmos provisioning
- `cors_origin`: frontend origin for backend CORS

## Notes

- If `enable_cosmos=false`, Cosmos resources are skipped and Cosmos env vars are not injected.
- After apply, set frontend `VITE_API_BASE_URL` to `container_app_url` output.
