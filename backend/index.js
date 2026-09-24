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

// ─── POST /api/landmarks ──────────────────────────────────────────────────
/*
  Adds a new landmark to the database.
  Validates all required fields before writing anything — per the lab rule:
  validate first, write second.

  Required body fields:
    name     — string, non-empty
    lat      — number (float), valid Nairobi latitude range
    lng      — number (float), valid Nairobi longitude range

  Returns:
    201 Created  — landmark was added, returns the new record
    400 Bad Request — missing or invalid fields
    409 Conflict — a landmark with that name already exists
*/
app.post('/api/landmarks', (req, res) => {
  const { name, lat, lng } = req.body

  // ── Validation ────────────────────────────────────────────────────────

  // 1. Check all required fields are present
  if (!name || lat === undefined || lng === undefined) {
    return res.status(400).json({
      code: 'MISSING_FIELDS',
      message: 'name, lat, and lng are all required'
    })
  }

  // 2. name must be a non-empty string
  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({
      code: 'INVALID_FIELD',
      message: 'name must be a non-empty string'
    })
  }

  // 3. lat and lng must be numbers
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      code: 'INVALID_FIELD',
      message: 'lat and lng must be numbers'
    })
  }

  // 4. lat must be a plausible Nairobi latitude (-2.0 to -0.5)
  if (lat < -2.0 || lat > -0.5) {
    return res.status(400).json({
      code: 'INVALID_FIELD',
      message: 'lat must be a valid Nairobi latitude (between -2.0 and -0.5)'
    })
  }

  // 5. lng must be a plausible Nairobi longitude (36.5 to 37.5)
  if (lng < 36.5 || lng > 37.5) {
    return res.status(400).json({
      code: 'INVALID_FIELD',
      message: 'lng must be a valid Nairobi longitude (between 36.5 and 37.5)'
    })
  }

  // ── Duplicate check ───────────────────────────────────────────────────
  // Check if a landmark with the same name already exists before inserting
  const checkSql = 'SELECT id FROM landmarks WHERE name = ?'
  db.query(checkSql, [name.trim().toLowerCase()], (err, existing) => {
    if (err) return res.status(500).json({ code: 'DB_ERROR', message: err.message })

    if (existing.length > 0) {
      return res.status(409).json({
        code: 'CONFLICT',
        message: `A landmark named '${name}' already exists`
      })
    }

    // ── Write ──────────────────────────────────────────────────────────
    // All checks passed — safe to insert
    const insertSql = 'INSERT INTO landmarks (name, latitude, longitude) VALUES (?, ?, ?)'
    db.query(insertSql, [name.trim().toLowerCase(), lat, lng], (err, result) => {
      if (err) return res.status(500).json({ code: 'DB_ERROR', message: err.message })

      // Return 201 Created with the newly created landmark
      return res.status(201).json({
        id: result.insertId,
        name: name.trim().toLowerCase(),
        location: { lat, lng }
      })
    })
  })
})

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
})