# GitHub Environments + Azure OIDC Setup

This repo supports secure Azure deployment from GitHub Actions without storing static Azure client secrets.

## 1) Create a GitHub Environment

Create two environments in repository settings:
- `development`
- `production`

Recommended protections:
- development:
	- optional reviewer requirement
	- allow non-main branches for testing
- production:
	- required reviewers enabled
	- branch restriction to `main`
	- optional wait timer for controlled releases

## 2) Add Environment variables

Set these as Environment Variables (not secrets) in each environment:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Recommendation:
- Use different Azure app registrations per environment
- Keep the variable names the same, but with environment-specific values

## 3) Add Environment secret

Set this as Environment Secret in each environment:
- `APP_JWT_SECRET`

## 4) Configure Azure Federated Credential

Create Azure AD apps/service principals and add Federated Credentials with:
- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:<owner>/<repo>:environment:<environment-name>`
- Audience: `api://AzureADTokenExchange`

Use separate principals and scoped role assignments:
- development principal:
	- scope: development resource group only
	- role: Contributor
- production principal:
	- scope: production resource group only
	- role: Contributor

Only add higher permissions if strictly required:
- User Access Administrator only when workflows must create role assignments
- never assign Owner at subscription scope for CI/CD by default

## 5) Run workflow

Use `Azure IaC Deploy` workflow dispatch and choose:
- tool: `bicep` or `terraform`
- operation: `plan` or `apply`
- environment: `development` or `production`

The workflow logs into Azure using OIDC and reads `APP_JWT_SECRET` from environment secret storage.

Built-in safeguards in workflow:
- stale development deploy runs are auto-cancelled when superseded
- production deploys are concurrency-locked to one active run
- production apply is blocked unless triggered from `main`
