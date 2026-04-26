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

APP_ENV_NAME="${APP_NAME}-env"
IMAGE_TAG="${APP_NAME}:$(date +%Y%m%d%H%M%S)"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
IMAGE="${ACR_LOGIN_SERVER}/${IMAGE_TAG}"

: "${JWT_SECRET:?Set JWT_SECRET in environment}"
CORS_ORIGIN="${CORS_ORIGIN:-*}"
PORT="${PORT:-8787}"
AZURE_COSMOS_DATABASE="${AZURE_COSMOS_DATABASE:-aegischain}"

COSMOS_ENABLED="false"
if [[ -n "${AZURE_COSMOS_ENDPOINT:-}" && -n "${AZURE_COSMOS_KEY:-}" ]]; then
  COSMOS_ENABLED="true"
fi

echo "[1/7] Ensuring resource group and ACR exist..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null
az acr show --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" >/dev/null 2>&1 || \
  az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true >/dev/null

echo "[2/7] Building image in ACR..."
az acr build --registry "$ACR_NAME" --image "$IMAGE_TAG" . >/dev/null

echo "[3/7] Ensuring Container Apps environment exists..."
az containerapp env show --name "$APP_ENV_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1 || \
  az containerapp env create --name "$APP_ENV_NAME" --resource-group "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null

echo "[4/7] Creating or updating container app..."
if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$IMAGE" >/dev/null
else
  az containerapp create \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$APP_ENV_NAME" \
    --image "$IMAGE" \
    --target-port "$PORT" \
    --ingress external \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-identity system >/dev/null
fi

echo "[5/7] Setting secrets..."
if [[ "$COSMOS_ENABLED" == "true" ]]; then
  az containerapp secret set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --secrets \
      jwt-secret="$JWT_SECRET" \
      cosmos-key="$AZURE_COSMOS_KEY" >/dev/null
else
  az containerapp secret set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --secrets jwt-secret="$JWT_SECRET" >/dev/null
fi

echo "[6/7] Configuring environment variables..."
if [[ "$COSMOS_ENABLED" == "true" ]]; then
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --set-env-vars \
      NODE_ENV=production \
      PORT="$PORT" \
      CORS_ORIGIN="$CORS_ORIGIN" \
      JWT_SECRET=secretref:jwt-secret \
      AZURE_COSMOS_ENDPOINT="$AZURE_COSMOS_ENDPOINT" \
      AZURE_COSMOS_KEY=secretref:cosmos-key \
      AZURE_COSMOS_DATABASE="$AZURE_COSMOS_DATABASE" >/dev/null
else
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --set-env-vars \
      NODE_ENV=production \
      PORT="$PORT" \
      CORS_ORIGIN="$CORS_ORIGIN" \
      JWT_SECRET=secretref:jwt-secret \
      AZURE_COSMOS_ENDPOINT= \
      AZURE_COSMOS_KEY= \
      AZURE_COSMOS_DATABASE="$AZURE_COSMOS_DATABASE" >/dev/null
fi

echo "[7/7] Deployment complete"
echo "Container App URL:"
az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv
echo "Cosmos mode: $COSMOS_ENABLED"
