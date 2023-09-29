#!/usr/bin/env node
import 'dotenv/config.js'

import process from 'node:process'

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import createRouter from './router.js'

const PORT = process.env.PORT || 5000

const app = express()

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use(cors({origin: true}))

app.use('/', createRouter())

app.listen(PORT, () => {
  console.log(`Start listening on port ${PORT}`)
})