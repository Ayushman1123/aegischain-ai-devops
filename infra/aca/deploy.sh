#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <resource-group> <location> <containerapp-name> <acr-name>"
  exit 1
fi

RESOURCE_GROUP="$1"
LOCATION="$2"
APP_NAME="$3"
ACR_NAME="$4"

IMAGE_TAG="${APP_NAME}:$(date +%Y%m%d%H%M%S)"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
IMAGE="${ACR_LOGIN_SERVER}/${IMAGE_TAG}"

: "${JWT_SECRET:?Set JWT_SECRET in environment}"
: "${AZURE_COSMOS_ENDPOINT:?Set AZURE_COSMOS_ENDPOINT in environment}"
: "${AZURE_COSMOS_KEY:?Set AZURE_COSMOS_KEY in environment}"

az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true
az acr build --registry "$ACR_NAME" --image "$IMAGE_TAG" .

az containerapp env create \
  --name "${APP_NAME}-env" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

az containerapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "${APP_NAME}-env" \
  --image "$IMAGE" \
  --target-port 8787 \
  --ingress external \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-identity system \
  --env-vars \
    NODE_ENV=production \
    PORT=8787 \
    JWT_SECRET="$JWT_SECRET" \
    AZURE_COSMOS_ENDPOINT="$AZURE_COSMOS_ENDPOINT" \
    AZURE_COSMOS_KEY="$AZURE_COSMOS_KEY" \
    AZURE_COSMOS_DATABASE=aegischain

echo "Container App deployed."
az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv
