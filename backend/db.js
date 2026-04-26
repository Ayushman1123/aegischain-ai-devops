import sqlite3 from 'sqlite3'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.db = null
  }

  initialize() {
    return new Promise((resolve, reject) => {
      const dir = dirname(this.dbPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }
        this.createTables()
          .then(resolve)
          .catch(reject)
      })
    })
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          picture TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )`,

        `CREATE TABLE IF NOT EXISTS shipments (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          originLat REAL,
          originLng REAL,
          destinationLat REAL,
          destinationLng REAL,
          currentLat REAL,
          currentLng REAL,
          status TEXT NOT NULL,
          riskScore REAL,
          riskLevel TEXT,
          eta TEXT,
          etaTimestamp INTEGER,
          progress REAL,
          lastUpdate TEXT,
          estimatedDistance REAL,
          remainingDistance REAL,
          averageSpeed REAL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )`,

        `CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          userId TEXT,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          status TEXT NOT NULL,
          lastActivity TEXT,
          description TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )`,

        `CREATE TABLE IF NOT EXISTS risk_analyses (
          id TEXT PRIMARY KEY,
          shipmentId TEXT NOT NULL,
          riskScore REAL NOT NULL,
          riskLevel TEXT NOT NULL,
          factors TEXT,
          recommendations TEXT,
          analysisTimestamp TEXT NOT NULL,
          analyzedBy TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY(shipmentId) REFERENCES shipments(id)
        )`,

        `CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          type TEXT NOT NULL,
          shipmentId TEXT,
          title TEXT NOT NULL,
          message TEXT,
          severity TEXT,
          read INTEGER DEFAULT 0,
          actionRequired INTEGER DEFAULT 0,
          timestamp TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id),
          FOREIGN KEY(shipmentId) REFERENCES shipments(id)
        )`,

        `CREATE TABLE IF NOT EXISTS crisis_events (
          id TEXT PRIMARY KEY,
          shipmentId TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          severity TEXT NOT NULL,
          status TEXT NOT NULL,
          affectedStakeholders TEXT,
          responseActions TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY(shipmentId) REFERENCES shipments(id)
        )`,

        `CREATE TABLE IF NOT EXISTS blockchain_events (
          id TEXT PRIMARY KEY,
          eventType TEXT NOT NULL,
          data TEXT,
          hash TEXT,
          verified INTEGER,
          timestamp TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )`,

        `CREATE TABLE IF NOT EXISTS location_history (
          id TEXT PRIMARY KEY,
          shipmentId TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          speed REAL,
          heading REAL,
          timestamp TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY(shipmentId) REFERENCES shipments(id)
        )`,

        `CREATE INDEX IF NOT EXISTS idx_shipments_userId ON shipments(userId)`,
        `CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status)`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)`,
        `CREATE INDEX IF NOT EXISTS idx_location_history_shipmentId ON location_history(shipmentId)`,
      ]

      let completed = 0
      queries.forEach((query) => {
        this.db.run(query, (err) => {
          if (err) {
            reject(err)
            return
          }
          completed++
          if (completed === queries.length) {
            resolve()
          }
        })
      })
    })
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)
          return
        }
        resolve({ id: this.lastID, changes: this.changes })
      })
    })
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
          return
        }
        resolve(row)
      })
    })
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
          return
        }
        resolve(rows || [])
      })
    })
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      } else {
        resolve()
      }
    })
  }
}

export default Database
