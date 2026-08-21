const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')
require('dotenv').config() // loads variables from .env into process.env

const app = express()

app.use(cors())
app.use(express.json())

// ─── Database Connection ───────────────────────────────────────────────────
// Credentials are read from the .env file — never hardcoded
const db = mysql.createConnection({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err.message)
    return
  }
  console.log('✅ Connected to MySQL database')
})

// ─── Routes ───────────────────────────────────────────────────────────────

app.get('/api/providers', (req, res) => {
  db.query('SELECT * FROM providers', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(results)
  })
})

app.get('/api/ride-types', (req, res) => {
  db.query('SELECT * FROM ride_types', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(results)
  })
})

app.get('/api/landmarks', (req, res) => {
  db.query('SELECT * FROM landmarks', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(results)
  })
})

app.get('/api/drivers/:vehicleType', (req, res) => {
  const { vehicleType } = req.params
  const sql = `
    SELECT * FROM drivers
    WHERE vehicle_type = ?
    ORDER BY RAND()
    LIMIT 1
  `
  db.query(sql, [vehicleType], (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    if (results.length === 0) return res.status(404).json({ error: 'No driver found' })
    res.json(results[0])
  })
})

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
})