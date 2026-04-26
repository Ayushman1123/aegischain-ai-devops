variable "resource_group_name" {
  type        = string
  description = "Resource group name for all resources."
}

variable "location" {
  type        = string
  description = "Azure region."
  default     = "eastus"
}

variable "name_prefix" {
  type        = string
  description = "Prefix used for resource names."
  default     = "aegischain"
}

variable "container_image" {
  type        = string
  description = "Container image with tag, e.g. myacr.azurecr.io/aegischain:latest"
}

variable "jwt_secret" {
  type        = string
  description = "JWT signing secret used by backend."
  sensitive   = true
}

variable "cors_origin" {
  type        = string
  description = "Allowed frontend origin for CORS."
  default     = "*"
}

variable "target_port" {
  type        = number
  description = "Application port exposed by ACA ingress."
  default     = 8787
}

variable "enable_cosmos" {
  type        = bool
  description = "Enable Cosmos DB provisioning and app env wiring."
  default     = false
}

variable "cosmos_database_name" {
  type        = string
  description = "Cosmos SQL database name when enable_cosmos=true."
  default     = "aegischain"
}
