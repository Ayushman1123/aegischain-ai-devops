targetScope = 'resourceGroup'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Name prefix used to build resource names.')
param namePrefix string = 'aegischain'

@description('Container app image repository and tag (for example myacr.azurecr.io/aegischain:latest).')
param imageName string

@description('Container app target port.')
param targetPort int = 8787

@description('Allowed CORS origin for frontend.')
param corsOrigin string = '*'

@description('JWT signing secret for backend auth.')
@secure()
param jwtSecret string

@description('Enable Azure Cosmos DB managed persistence mirror.')
param enableCosmos bool = false

@description('Cosmos DB account name (used when enableCosmos=true).')
param cosmosAccountName string = '${namePrefix}-cosmos'

@description('Cosmos DB SQL database name (used when enableCosmos=true).')
param cosmosDatabaseName string = 'aegischain'

@description('Container app resource name.')
param containerAppName string = '${namePrefix}-app'

@description('Container app environment name.')
param containerAppEnvironmentName string = '${namePrefix}-env'

@description('Container registry name.')
param containerRegistryName string = toLower(replace('${namePrefix}acr', '-', ''))

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = if (enableCosmos) {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

resource cosmosSqlDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = if (enableCosmos) {
  name: '${cosmos.name}/${cosmosDatabaseName}'
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
}

resource managedEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvironmentName
  location: location
  properties: {}
}

var acrCreds = listCredentials(acr.id, '2023-07-01')
var cosmosKeys = enableCosmos ? listKeys(cosmos.id, '2023-04-15') : null

var appSecrets = concat(
  [
    {
      name: 'jwt-secret'
      value: jwtSecret
    }
    {
      name: 'acr-password'
      value: acrCreds.passwords[0].value
    }
  ],
  enableCosmos
    ? [
        {
          name: 'cosmos-key'
          value: cosmosKeys.primaryMasterKey
        }
      ]
    : []
)

var baseEnv = [
  {
    name: 'NODE_ENV'
    value: 'production'
  }
  {
    name: 'PORT'
    value: string(targetPort)
  }
  {
    name: 'CORS_ORIGIN'
    value: corsOrigin
  }
  {
    name: 'JWT_SECRET'
    secretRef: 'jwt-secret'
  }
]

var cosmosEnv = enableCosmos
  ? [
      {
        name: 'AZURE_COSMOS_ENDPOINT'
        value: cosmos.properties.documentEndpoint
      }
      {
        name: 'AZURE_COSMOS_KEY'
        secretRef: 'cosmos-key'
      }
      {
        name: 'AZURE_COSMOS_DATABASE'
        value: cosmosDatabaseName
      }
    ]
  : []

resource app 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: managedEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
      }
      secrets: appSecrets
      registries: [
        {
          server: acr.properties.loginServer
          username: acrCreds.username
          passwordSecretRef: 'acr-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'aegischain'
          image: imageName
          env: concat(baseEnv, cosmosEnv)
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output containerAppFqdn string = app.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output cosmosEndpoint string = enableCosmos ? cosmos.properties.documentEndpoint : ''
