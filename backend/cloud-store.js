import { CosmosClient } from '@azure/cosmos'

export function createCloudStore() {
  const endpoint = process.env.AZURE_COSMOS_ENDPOINT
  const key = process.env.AZURE_COSMOS_KEY
  const databaseId = process.env.AZURE_COSMOS_DATABASE || 'aegischain'

  if (!endpoint || !key) {
    return {
      enabled: false,
      async put() {
        return null
      },
      async listByPartition() {
        return []
      },
      async query() {
        return []
      },
    }
  }

  const client = new CosmosClient({ endpoint, key })
  const containerCache = new Map()

  async function getContainer(containerId) {
    const cacheKey = `${databaseId}:${containerId}`
    if (containerCache.has(cacheKey)) {
      return containerCache.get(cacheKey)
    }

    const { database } = await client.databases.createIfNotExists({ id: databaseId })
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/partitionKey'] },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
      },
    })

    containerCache.set(cacheKey, container)
    return container
  }

  return {
    enabled: true,
    async put(containerId, partitionKey, document) {
      const container = await getContainer(containerId)
      const item = {
        ...document,
        partitionKey,
      }
      await container.items.upsert(item)
      return item
    },
    async listByPartition(containerId, partitionKey) {
      const container = await getContainer(containerId)
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey ORDER BY c.timestamp DESC',
          parameters: [{ name: '@partitionKey', value: partitionKey }],
        })
        .fetchAll()
      return resources || []
    },
    async query(containerId, sqlQuerySpec) {
      const container = await getContainer(containerId)
      const { resources } = await container.items.query(sqlQuerySpec).fetchAll()
      return resources || []
    },
  }
}
