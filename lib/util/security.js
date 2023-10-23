import process from 'node:process'
import createError from 'http-errors'
import hashObject from 'hash-obj'
import {add, sub} from 'date-fns'

const {ADMIN_TOKEN, DOWNLOAD_TOKEN_SECRET} = process.env

if (!ADMIN_TOKEN) {
  throw new Error('ADMIN_TOKEN must be defined')
}

if (!DOWNLOAD_TOKEN_SECRET) {
  throw new Error('DOWNLOAD_TOKEN_SECRET must be defined')
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

function computeToken(context, period) {
  const hash = hashObject({
    context,
    secret: DOWNLOAD_TOKEN_SECRET,
    period
  })

  return hash.slice(0, 32)
}

function compareToken(token, context, periods) {
  return periods.some(period => computeToken(context, period) === token)
}

export function computeDownloadToken(context) {
  const today = (new Date()).toISOString().slice(0, 10)
  return computeToken(context, today)
}

export function checkDownloadToken(token, context) {
  const yesterday = sub(new Date(), {days: 1}).toISOString().slice(0, 10)
  const today = (new Date()).toISOString().slice(0, 10)
  const tomorrow = add(new Date(), {days: 1}).toISOString().slice(0, 10)

  return compareToken(token, context, [yesterday, today, tomorrow])
}
