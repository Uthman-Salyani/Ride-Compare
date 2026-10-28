/*
  fareUtils.js — Helper functions for fare calculation and route simulation.

  Previously this file imported data directly from providers.js (a local JSON file).
  Now it fetches data from the Express backend, which reads from MySQL.

  Because fetching data over a network takes time, these functions are now
  async — meaning they return a Promise and must be awaited by the caller.
*/

// The base URL of our backend — configurable per environment.
export const API = import.meta.env.VITE_API_BASE_URL || '/api'

/* ─────────────────────────────────────────────
   calculateFare
   ─────────────────────────────────────────────
   Pure calculation — no network call needed.
   This function stays exactly the same as before.

   @param {object} rideType    - one ride type object from the database
   @param {number} distanceKm  - route distance in kilometres
   @param {number} durationMin - route duration in minutes
   @returns {number} fare in KES, rounded to nearest integer
*/
export function calculateFare(rideType, distanceKm, durationMin) {
  // parseFloat converts string values from MySQL into actual numbers
  const baseFare = parseFloat(rideType.base_fare)
  const perKm    = parseFloat(rideType.per_km)
  const perMin   = parseFloat(rideType.per_min)

  const fare = baseFare + (perKm * distanceKm) + (perMin * durationMin)

  return Math.round(fare)
}

/* ─────────────────────────────────────────────
   getMockRoute
   ─────────────────────────────────────────────
   Fetches landmarks from the backend, looks up the two locations,
   and calculates the route distance and duration.

   Now async because it needs to fetch from the backend first.

   @param {string} pickup  - user's "from" input
   @param {string} dropoff - user's "to" input
   @returns {Promise<{ distance, duration, pickupCoords, dropoffCoords }>}
*/
export async function getMockRoute(pickup, dropoff) {
  // Normalise to lowercase so "Westlands" matches "westlands"
  const fromKey = pickup.trim().toLowerCase()
  const toKey   = dropoff.trim().toLowerCase()

  // Fetch all landmarks from the backend
  const response = await fetch(`${API}/landmarks`)
  const landmarkRows = await response.json()

  /*
    The database returns an array of objects like:
    [{ id: 1, name: 'westlands', latitude: -1.2676, longitude: 36.8123 }, ...]

    We convert this into a lookup object (same shape as before) so the
    rest of the function works exactly as it did with the old JSON file.
  */
  const landmarks = {}
  landmarkRows.forEach(row => {
    // parseFloat converts the string values MySQL returns into actual numbers
    const latitude = row.latitude ?? row.location?.lat
    const longitude = row.longitude ?? row.location?.lng
    landmarks[row.name.toLowerCase()] = [parseFloat(latitude), parseFloat(longitude)]
  })

  const pickupCoords  = landmarks[fromKey]  || null
  const dropoffCoords = landmarks[toKey]    || null

  let distance

  if (pickupCoords && dropoffCoords) {
    // Use the Haversine formula to get real distance between coordinates
    distance = haversineKm(pickupCoords, dropoffCoords)
    // Add 20% for road routing (roads aren't straight lines)
    distance = parseFloat((distance * 1.2).toFixed(1))
  } else {
    // Fallback: random distance between 2 and 25 km
    distance = parseFloat((Math.random() * 23 + 2).toFixed(1))
  }

  // Rough Nairobi estimate: ~3.5 minutes per km accounting for traffic
  const duration = Math.max(5, Math.round(distance * 3.5))

  return { distance, duration, pickupCoords, dropoffCoords }
}

/* ─────────────────────────────────────────────
   buildResults
   ─────────────────────────────────────────────
   Fetches providers and ride types from the backend,
   calculates fares, and returns a sorted results array.

   Now async because it fetches from the backend.

   @param {number} distanceKm
   @param {number} durationMin
   @returns {Promise<Array>} sorted array of result objects
*/
export async function buildResults(routeData) {
  const { pickupCoords, dropoffCoords, selectedVehicleType } = routeData || {}

  if (!pickupCoords || !dropoffCoords) {
    return []
  }

  const params = new URLSearchParams({
    pickup_lat: String(pickupCoords[0]),
    pickup_lng: String(pickupCoords[1]),
    dropoff_lat: String(dropoffCoords[0]),
    dropoff_lng: String(dropoffCoords[1]),
  })

  if (selectedVehicleType) {
    params.set('type', selectedVehicleType)
  }

  let response = await fetch(`${API}/rides?${params.toString()}`)
  let rideEstimates = await response.json()

  if (selectedVehicleType && rideEstimates.length === 0) {
    params.delete('type')
    response = await fetch(`${API}/rides?${params.toString()}`)
    rideEstimates = await response.json()
  }

  const results = rideEstimates.map((ride, index) => {
    const canonicalType = normalizeRideType(ride.rideType || ride.type)
    const styles = getProviderStyles(ride.providerId || ride.providerName)

    return {
      id: ride.id,
      providerId: ride.providerId,
      providerName: ride.providerName,
      providerColor: styles.color,
      providerBg: styles.bg,
      type: ride.rideType || canonicalType,
      vehicle_type: canonicalType,
      fare: ride.fare?.amount ?? 0,
      eta_min: ride.etaMinutes,
      capacity: ride.capacity,
      bestValue: index === 0,
    }
  })

  const fastestIdx = results.reduce(
    (minIdx, ride, index, arr) => ride.eta_min < arr[minIdx].eta_min ? index : minIdx,
    0
  )

  if (results[fastestIdx]) {
    results[fastestIdx].fastest = true
  }

  return results
}

/* ─────────────────────────────────────────────
   getDriver
   ─────────────────────────────────────────────
   Fetches a random driver from the backend matching the vehicle type.
   Previously this was done in BookingPage using the local mockDrivers array.
   Now it calls the backend which picks a random driver from MySQL.

   @param {string} vehicleType - e.g. 'standard', 'boda', 'xl', 'comfort', 'delivery'
   @returns {Promise<object>} a single driver object
*/
export async function getDriver(vehicleType) {
  const response = await fetch(`${API}/drivers/${vehicleType}`)
  const driver = await response.json()
  return driver
}

function getProviderStyles(seed) {
  const palette = [
    { color: '#0f172a', bg: '#e2e8f0' },
    { color: '#065f46', bg: '#d1fae5' },
    { color: '#1d4ed8', bg: '#dbeafe' },
    { color: '#7c2d12', bg: '#ffedd5' },
    { color: '#6d28d9', bg: '#ede9fe' },
  ]

  const text = String(seed || 'ridecompare')
  const hash = [...text].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function normalizeRideType(value) {
  const text = String(value || '').toLowerCase().trim()

  if (text.includes('boda')) return 'boda'
  if (text.includes('standard') || text.includes('chapchap')) return 'standard'
  if (text.includes('xl')) return 'xl'
  if (text.includes('comfort')) return 'comfort'
  if (text.includes('delivery') || text.includes('send') || text.includes('connect')) return 'delivery'

  return text
}

/* ─────────────────────────────────────────────
   haversineKm  (internal helper)
   ─────────────────────────────────────────────
   Unchanged from before — pure math, no network call.
*/
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2

  return R * 2 * Math.asin(Math.sqrt(a))
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}