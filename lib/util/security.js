import process from 'node:process'
import createError from 'http-errors'

const {ADMIN_TOKEN} = process.env

if (!ADMIN_TOKEN) {
  throw new Error('ADMIN_TOKEN must be defined')
}

export function readToken(req, res, next) {
  if (req.get('Authorization') === `Token ${ADMIN_TOKEN}`) {
    req.isAdmin = true
  }

  next()
}

export function ensureAdmin(req, res, next) {
  if (!req.isAdmin) {
    return next(createError(401, 'Unauthorized'))
  }

  next()
}
