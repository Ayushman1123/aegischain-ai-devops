resource "random_string" "suffix" {
  length  = 5
  upper   = false
  special = false
}

locals {
  suffix                  = random_string.suffix.result
  acr_name                = substr(replace(lower("${var.name_prefix}${local.suffix}acr"), "-", ""), 0, 50)
  log_analytics_name      = "${var.name_prefix}-${local.suffix}-log"
  container_env_name      = "${var.name_prefix}-${local.suffix}-env"
  container_app_name      = "${var.name_prefix}-${local.suffix}-app"
  cosmos_account_name     = substr(replace(lower("${var.name_prefix}${local.suffix}cosmos"), "-", ""), 0, 44)
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_container_registry" "this" {
  name                = local.acr_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "Basic"
  admin_enabled       = true
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = local.log_analytics_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_app_environment" "this" {
  name                       = local.container_env_name
  location                   = azurerm_resource_group.this.location
  resource_group_name        = azurerm_resource_group.this.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
}

resource "azurerm_cosmosdb_account" "this" {
  count               = var.enable_cosmos ? 1 : 0
  name                = local.cosmos_account_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.this.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableServerless"
  }
}

resource "azurerm_cosmosdb_sql_database" "this" {
  count               = var.enable_cosmos ? 1 : 0
  name                = var.cosmos_database_name
  resource_group_name = azurerm_resource_group.this.name
  account_name        = azurerm_cosmosdb_account.this[0].name
}

resource "azurerm_container_app" "this" {
  name                         = local.container_app_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = azurerm_resource_group.this.name
  revision_mode                = "Single"

  identity {
    type = "SystemAssigned"
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.this.admin_password
  }

  dynamic "secret" {
    for_each = var.enable_cosmos ? [1] : []
    content {
      name  = "cosmos-key"
      value = azurerm_cosmosdb_account.this[0].primary_key
    }
  }

  registry {
    server               = azurerm_container_registry.this.login_server
    username             = azurerm_container_registry.this.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = true
    target_port      = var.target_port
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "aegischain"
      image  = var.container_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = tostring(var.target_port)
      }

      env {
        name  = "CORS_ORIGIN"
        value = var.cors_origin
      }

      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      dynamic "env" {
        for_each = var.enable_cosmos ? [1] : []
        content {
          name  = "AZURE_COSMOS_ENDPOINT"
          value = azurerm_cosmosdb_account.this[0].endpoint
        }
      }

      dynamic "env" {
        for_each = var.enable_cosmos ? [1] : []
        content {
          name        = "AZURE_COSMOS_KEY"
          secret_name = "cosmos-key"
        }
      }

      dynamic "env" {
        for_each = var.enable_cosmos ? [1] : []
        content {
          name  = "AZURE_COSMOS_DATABASE"
          value = var.cosmos_database_name
        }
      }
    }

    min_replicas = 1
    max_replicas = 3
  }
}
