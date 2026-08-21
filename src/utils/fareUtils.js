/*
  fareUtils.js — Helper functions for fare calculation and route simulation.

  Previously this file imported data directly from providers.js (a local JSON file).
  Now it fetches data from the Express backend, which reads from MySQL.

  Because fetching data over a network takes time, these functions are now
  async — meaning they return a Promise and must be awaited by the caller.
*/

// The base URL of our backend — all API calls go here
const API = 'http://localhost:3001/api'

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
    landmarks[row.name] = [parseFloat(row.latitude), parseFloat(row.longitude)]
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
export async function buildResults(distanceKm, durationMin) {
  // Fetch both providers and ride types from the backend in parallel
  // Promise.all means both requests fire at the same time instead of one after the other
  const [providersRes, rideTypesRes] = await Promise.all([
    fetch(`${API}/providers`),
    fetch(`${API}/ride-types`)
  ])

  const providers = await providersRes.json()
  const rideTypes = await rideTypesRes.json()

  // Build results array — same logic as before
  const results = rideTypes.map(rt => {
    // Find the matching provider for this ride type
    const provider = providers.find(p => p.id === rt.provider_id)

    return {
      ...rt,
      providerName:  provider.name,
      providerColor: provider.color,
      providerBg:    provider.bg_color,  // note: bg_color not bgColor (MySQL snake_case)
      fare: calculateFare(rt, distanceKm, durationMin),
    }
  })

  // Sort by fare, cheapest first
  results.sort((a, b) => a.fare - b.fare)

  // Flag the cheapest option
  results[0].bestValue = true

  // Flag the fastest ETA option
  const fastestIdx = results.reduce(
    (minIdx, r, i, arr) => r.eta_min < arr[minIdx].eta_min ? i : minIdx, 0
  )
  results[fastestIdx].fastest = true

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