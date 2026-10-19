const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')
require('dotenv').config()

const app = express()

// Global CORS Middleware to prevent Swagger UI preflight blocks
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// ─── Database Connection ───────────────────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.DB_HOST || 'localhost',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ridecompare',
  port:     process.env.DB_PORT || 3306
})

db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err.message)
    return
  }
  console.log('✅ Connected to MySQL database (ridecompare)')
})

// ─── 1. GET /providers ────────────────────────────────────────────────────
app.get('/providers', (req, res) => {
  db.query('SELECT * FROM providers', (err, results) => {
    if (err) return res.status(500).json({ code: "INTERNAL_ERROR", message: err.message })
    
    // Maps database fields to Provider contract schema
    const response = results.map(row => ({
      id: row.id,
      name: row.name,
      logoUrl: `https://cdn.ridecompare.co.ke/logos/${row.id}.png`
    }))
    
    res.status(200).json(response)
  })
})

// ─── 2. GET /landmarks ────────────────────────────────────────────────────
app.get('/landmarks', (req, res) => {
  db.query('SELECT * FROM landmarks', (err, results) => {
    if (err) return res.status(500).json({ code: "INTERNAL_ERROR", message: err.message })
    
    // Maps latitude/longitude to nested location object with float types
    const response = results.map(row => ({
      id: String(row.id),
      name: row.name,
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      }
    }))
    
    res.status(200).json(response)
  })
})

// ─── 3. GET /landmarks/:id ────────────────────────────────────────────────
app.get('/landmarks/:id', (req, res) => {
  const { id } = req.params
  db.query('SELECT * FROM landmarks WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ code: "INTERNAL_ERROR", message: err.message })
    
    if (results.length === 0) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `No landmark found with id '${id}'`
      })
    }
    
    const row = results[0]
    res.status(200).json({
      id: String(row.id),
      name: row.name,
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      }
    })
  })
})

// ─── 4. GET /rides ────────────────────────────────────────────────────────
app.get('/rides', (req, res) => {
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, type, sort } = req.query

  // Enforces coordinate validation per contract schema
  const coordinates = [pickup_lat, pickup_lng, dropoff_lat, dropoff_lng]
  const hasMissingCoordinate = coordinates.some(value => value === undefined || value === null || value === '')
  const hasInvalidCoordinate = coordinates.some(value => Number.isNaN(Number(value)))

  if (hasMissingCoordinate || hasInvalidCoordinate) {
    return res.status(400).json({
      code: "INVALID_PARAMETER",
      message: "'pickup_lat', 'pickup_lng', 'dropoff_lat', and 'dropoff_lng' must be valid floats"
    })
  }

  // Validates type parameter against OpenAPI enum
  const allowedTypes = ['boda', 'standard', 'xl', 'comfort', 'delivery']
  if (type && !allowedTypes.includes(type.toLowerCase())) {
    return res.status(400).json({
      code: "INVALID_PARAMETER",
      message: "'type' must be one of: Boda, Standard, XL, Comfort, Delivery"
    })
  }

  // Validates sort parameter against OpenAPI enum
  const allowedSorts = ['eta', 'fare']
  if (sort && !allowedSorts.includes(sort.toLowerCase())) {
    return res.status(400).json({
      code: "INVALID_PARAMETER",
      message: "'sort' must be one of: eta, fare"
    })
  }

  // JOIN ride_types with providers to include provider details
  const sql = `
    SELECT r.*, p.name AS provider_name 
    FROM ride_types r
    JOIN providers p ON r.provider_id = p.id
  `

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ code: "INTERNAL_ERROR", message: err.message })
    
    let filteredResults = [...results]

    if (type) {
      filteredResults = filteredResults.filter(r => {
        const rideType = r.type || r.vehicle_type
        return String(rideType).toLowerCase() === type.toLowerCase()
      })
    }

    if (sort && sort.toLowerCase() === 'eta') {
      filteredResults.sort((a, b) => a.eta_min - b.eta_min)
    } else if (sort && sort.toLowerCase() === 'fare') {
      filteredResults.sort((a, b) => parseFloat(a.base_fare) - parseFloat(b.base_fare))
    }

    // Maps database fields to RideEstimate contract schema
    const response = filteredResults.map(row => ({
      id: row.id,
      providerId: row.provider_id,
      providerName: row.provider_name,
      rideType: row.type || row.vehicle_type,
      fare: {
        currency: "KES",
        amount: parseFloat(row.base_fare)
      },
      etaMinutes: parseInt(row.eta_min, 10),
      capacity: parseInt(row.capacity, 10)
    }))
    
    res.status(200).json(response)
  })
})

// ─── 5. GET /rides/:id ────────────────────────────────────────────────────
app.get('/rides/:id', (req, res) => {
  const { id } = req.params
  const sql = `
    SELECT r.*, p.name AS provider_name 
    FROM ride_types r
    JOIN providers p ON r.provider_id = p.id
    WHERE r.id = ?
  `

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ code: "INTERNAL_ERROR", message: err.message })
    
    if (results.length === 0) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `No ride estimate found with id '${id}'`
      })
    }
    
    const row = results[0]
    res.status(200).json({
      id: row.id,
      providerId: row.provider_id,
      providerName: row.provider_name,
      rideType: row.type || row.vehicle_type,
      fare: {
        currency: "KES",
        amount: parseFloat(row.base_fare)
      },
      etaMinutes: parseInt(row.eta_min, 10),
      capacity: parseInt(row.capacity, 10)
    })
  })
})

// ─── 6. GET /drivers (QUERY PARAMS) ───────────────────────────────────────
app.get('/drivers', (req, res) => {
  const vehicleType = req.query.type || req.query.vehicle_type || req.query.rideType

  // 1. Try matching the driver by vehicle type (flexible partial match)
  const filterSql = `
    SELECT * FROM drivers 
    WHERE (? IS NOT NULL AND (
      LOWER(?) LIKE CONCAT('%', LOWER(vehicle_type), '%') OR 
      LOWER(vehicle_type) LIKE CONCAT('%', LOWER(?), '%')
    ))
    ORDER BY RAND() LIMIT 1
  `

  db.query(filterSql, [vehicleType, vehicleType, vehicleType], (err, results) => {
    if (!err && results && results.length > 0) {
      return res.status(200).json(formatDriverRow(results[0]))
    }

    // 2. If no match for that specific type, pick ANY random driver from your SQL table
    db.query('SELECT * FROM drivers ORDER BY RAND() LIMIT 1', (err2, fallbackResults) => {
      if (!err2 && fallbackResults && fallbackResults.length > 0) {
        return res.status(200).json(formatDriverRow(fallbackResults[0]))
      }

      // Hard emergency fallback if DB query completely fails
      res.status(200).json({
        name: 'John Kamau',
        rating: '4.9',
        car: 'Toyota Fielder',
        plate: 'KDA 123X'
      })
    })
  })
})

// ─── 7. GET /drivers/:type (PATH PARAM) ───────────────────────────────────
app.get('/drivers/:type', (req, res) => {
  const { type } = req.params

  const filterSql = `
    SELECT * FROM drivers 
    WHERE LOWER(?) LIKE CONCAT('%', LOWER(vehicle_type), '%')
       OR LOWER(vehicle_type) LIKE CONCAT('%', LOWER(?), '%')
    ORDER BY RAND() LIMIT 1
  `

  db.query(filterSql, [type, type], (err, results) => {
    if (!err && results && results.length > 0) {
      return res.status(200).json(formatDriverRow(results[0]))
    }

    // If type doesn't match, select any random driver from your database table
    db.query('SELECT * FROM drivers ORDER BY RAND() LIMIT 1', (err2, fallbackResults) => {
      if (!err2 && fallbackResults && fallbackResults.length > 0) {
        return res.status(200).json(formatDriverRow(fallbackResults[0]))
      }

      res.status(200).json({
        name: 'Peter Njoroge',
        rating: '4.8',
        car: 'Nissan Note',
        plate: 'KDC 789Z'
      })
    })
  })
})

// Helper function to handle flexible column naming in your SQL table
function formatDriverRow(row) {
  return {
    name: row.name || row.driver_name || row.full_name || 'Driver',
    rating: String(row.rating || '4.8'),
    car: row.car || row.vehicle_model || row.car_model || row.model || 'Vehicle',
    plate: row.plate || row.license_plate || row.number_plate || 'RC-1000'
  }
}


const PARTNER_URL = process.env.PARTNER_URL;

app.get('/events', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const r = await fetch(`${PARTNER_URL}/events?after=${today}`);
    if (!r.ok) {
      console.error('partner returned', r.status);
      return res.status(502).json({ message: 'Events are unavailable right now' });
    }
    const events = await r.json();
    res.json(
      events
        .filter(e => !e.cancelled)
        .map(e => ({ id: e.id, title: e.title, location: e.location, startTime: e.startTime }))
    );
  } catch (err) {
    console.error('partner call failed:', err.cause?.code || err.message);
    res.status(502).json({ message: 'Events are unavailable right now' });
  }
});

// ─── Server Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`)
  })
}

// Exported so supertest can import the app without starting a real server
module.exports = app