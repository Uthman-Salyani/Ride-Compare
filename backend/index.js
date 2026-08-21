const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')

const app = express()

// Allow React (running on port 5173) to talk to this backend
app.use(cors())

// Allow the backend to read JSON from request bodies
app.use(express.json())

// ─── Database Connection ───────────────────────────────────────────────────
const db = mysql.createConnection({
  host:     'localhost',
  user:     'root',      // your MySQL username
  password: 'us@404',          // your MySQL password — fill this in
  database: 'ridecompare'
})

db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err.message)
    return
  }
  console.log('✅ Connected to MySQL database')
})

// ─── Routes ───────────────────────────────────────────────────────────────

// GET all providers
app.get('/api/providers', (req, res) => {
  db.query('SELECT * FROM providers', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(results)
  })
})

// GET all ride types
app.get('/api/ride-types', (req, res) => {
  db.query('SELECT * FROM ride_types', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(results)
  })
})

// GET all landmarks
app.get('/api/landmarks', (req, res) => {
  db.query('SELECT * FROM landmarks', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(results)
  })
})

// GET a random driver by vehicle type
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
const PORT = 3001
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
})