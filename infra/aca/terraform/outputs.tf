output "container_app_url" {
  description = "Public URL for the deployed container app."
  value       = "https://${azurerm_container_app.this.latest_revision_fqdn}"
}

output "acr_login_server" {
  description = "Azure Container Registry login server."
  value       = azurerm_container_registry.this.login_server
}

output "cosmos_endpoint" {
  description = "Cosmos endpoint when enable_cosmos=true."
  value       = var.enable_cosmos ? azurerm_cosmosdb_account.this[0].endpoint : ""
}
