/*
  fareUtils.js — Helper functions for fare calculation and route simulation.
*/

// Base URL of our backend
export const API = import.meta.env.VITE_API_BASE_URL || '/api'

// API key from .env — attached to every backend request
const API_KEY = import.meta.env.VITE_API_KEY || ''

/*
  apiFetch — wrapper around fetch that always includes the X-API-Key header.
  Use this instead of fetch() for every backend call so auth is never forgotten.
*/
export function apiFetch(path, options = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(options.headers || {}),
    },
  })
}

/* ─────────────────────────────────────────────
   calculateFare
─────────────────────────────────────────────── */
export function calculateFare(rideType, distanceKm, durationMin) {
  const baseFare = parseFloat(rideType.base_fare)
  const perKm    = parseFloat(rideType.per_km)
  const perMin   = parseFloat(rideType.per_min)
  return Math.round(baseFare + perKm * distanceKm + perMin * durationMin)
}

/* ─────────────────────────────────────────────
   getMockRoute
─────────────────────────────────────────────── */
export async function getMockRoute(pickup, dropoff) {
  const fromKey = pickup.trim().toLowerCase()
  const toKey   = dropoff.trim().toLowerCase()

  const response    = await apiFetch('/landmarks')
  const landmarkRows = await response.json()

  const landmarks = {}
  landmarkRows.forEach(row => {
    const latitude  = row.latitude  ?? row.location?.lat
    const longitude = row.longitude ?? row.location?.lng
    landmarks[row.name.toLowerCase()] = [parseFloat(latitude), parseFloat(longitude)]
  })

  const pickupCoords  = landmarks[fromKey]  || null
  const dropoffCoords = landmarks[toKey]    || null

  let distance

  if (pickupCoords && dropoffCoords) {
    distance = haversineKm(pickupCoords, dropoffCoords)
    distance = parseFloat((distance * 1.2).toFixed(1))
  } else {
    distance = parseFloat((Math.random() * 23 + 2).toFixed(1))
  }

  const duration = Math.max(5, Math.round(distance * 3.5))

  return { distance, duration, pickupCoords, dropoffCoords }
}

/* ─────────────────────────────────────────────
   buildResults
─────────────────────────────────────────────── */
export async function buildResults(routeData) {
  const { pickupCoords, dropoffCoords, selectedVehicleType } = routeData || {}

  if (!pickupCoords || !dropoffCoords) return []

  const params = new URLSearchParams({
    pickup_lat:  String(pickupCoords[0]),
    pickup_lng:  String(pickupCoords[1]),
    dropoff_lat: String(dropoffCoords[0]),
    dropoff_lng: String(dropoffCoords[1]),
  })

  if (selectedVehicleType) params.set('type', selectedVehicleType)

  let response     = await apiFetch(`/rides?${params.toString()}`)
  let rideEstimates = await response.json()

  // If type filter returns nothing, retry without it
  if (selectedVehicleType && rideEstimates.length === 0) {
    params.delete('type')
    response      = await apiFetch(`/rides?${params.toString()}`)
    rideEstimates = await response.json()
  }

  const results = rideEstimates.map((ride, index) => {
    const canonicalType = normalizeRideType(ride.rideType || ride.type)
    const styles        = getProviderStyles(ride.providerId || ride.providerName)

    return {
      id:            ride.id,
      providerId:    ride.providerId,
      providerName:  ride.providerName,
      providerColor: styles.color,
      providerBg:    styles.bg,
      type:          ride.rideType || canonicalType,
      vehicle_type:  canonicalType,
      fare:          ride.fare?.amount ?? 0,
      eta_min:       ride.etaMinutes,
      capacity:      ride.capacity,
      bestValue:     index === 0,
    }
  })

  const fastestIdx = results.reduce(
    (minIdx, ride, i, arr) => ride.eta_min < arr[minIdx].eta_min ? i : minIdx, 0
  )
  if (results[fastestIdx]) results[fastestIdx].fastest = true

  return results
}

/* ─────────────────────────────────────────────
   getDriver
─────────────────────────────────────────────── */
export async function getDriver(vehicleType) {
  const response = await apiFetch(`/drivers/${vehicleType}`)
  return response.json()
}

/* ─────────────────────────────────────────────
   getEvents — fetches today's events from the backend
─────────────────────────────────────────────── */
export async function getEvents() {
  const response = await apiFetch('/events')
  if (!response.ok) throw new Error('events unavailable')
  return response.json()
}

/* ─────────────────────────────────────────────
   getRides — fetches ride estimates for a coordinate pair
─────────────────────────────────────────────── */
export async function getRides(pickupCoords, dropoffCoords) {
  const params = new URLSearchParams({
    pickup_lat:  String(pickupCoords[0]),
    pickup_lng:  String(pickupCoords[1]),
    dropoff_lat: String(dropoffCoords[0]),
    dropoff_lng: String(dropoffCoords[1]),
  })
  const response = await apiFetch(`/rides?${params.toString()}`)
  return response.json()
}

/* ─── Internal helpers ─────────────────────── */

function getProviderStyles(seed) {
  const palette = [
    { color: '#0f172a', bg: '#e2e8f0' },
    { color: '#065f46', bg: '#d1fae5' },
    { color: '#1d4ed8', bg: '#dbeafe' },
    { color: '#7c2d12', bg: '#ffedd5' },
    { color: '#6d28d9', bg: '#ede9fe' },
  ]
  const hash = [...String(seed || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function normalizeRideType(value) {
  const text = String(value || '').toLowerCase().trim()
  if (text.includes('boda'))                                          return 'boda'
  if (text.includes('standard') || text.includes('chapchap'))        return 'standard'
  if (text.includes('xl'))                                            return 'xl'
  if (text.includes('comfort'))                                       return 'comfort'
  if (text.includes('delivery') || text.includes('send') || text.includes('connect')) return 'delivery'
  return text
}

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R    = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function toRad(deg) { return deg * (Math.PI / 180) }