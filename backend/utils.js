import { v4 as uuidv4 } from 'uuid'

export function generateId() {
  return uuidv4()
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateName(name) {
  return typeof name === 'string' && name.trim().length >= 2
}

export function getCurrentTimestamp() {
  return new Date().toISOString()
}

export function createResponse(success, data = null, error = null) {
  return {
    success,
    data,
    error,
    timestamp: getCurrentTimestamp(),
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
