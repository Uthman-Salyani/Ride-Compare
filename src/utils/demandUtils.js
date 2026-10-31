/*
  demandUtils.js: SIMULATED booking traffic for events.

  There are no real bookings in this app, so we invent believable numbers:
  for each event and each ride type, how many rides exist, how many are
  already booked, and how many are left.

  The numbers come from a "seeded" hash instead of Math.random(). The same
  event + ride type + day always produces the same numbers, so the page
  doesn't change every time you refresh, but different events look different.

  These are plain JavaScript functions, no React in here.
*/

// How many rides we could supply to one event, per ride type: [min, max]
const POOL = {
  boda:     [6, 12],
  standard: [8, 14],
  comfort:  [3, 6],
  xl:       [2, 5],
}

// Chance (in percent) that a ride type is already fully booked for an event.
// Raise this (e.g. to 60) during a demo to show the "try another ride type" fallback more often.
const SOLD_OUT_CHANCE = 20

// This many rides left (or fewer) counts as "running low"
const LOW_STOCK = 3

// Bookings the current user made during this session, e.g. { 'evt_3|boda': 1 }.
// Lives at module level so it survives moving between pages (it resets on a full refresh).
const myBookings = {}

/* ─────────────────────────────────────────────
   hashString
   ─────────────────────────────────────────────
   Turns any text into a big whole number. Same text in, same number out.
   (This is the FNV-1a hash, you don't need to memorise it.)
*/
function hashString(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0   // force it to be a positive number
}

/*
  seededInt: a repeatable "random" whole number between min and max (inclusive)
  that depends only on the seed text.
*/
function seededInt(seed, min, max) {
  return min + (hashString(seed) % (max - min + 1))
}

/* ─────────────────────────────────────────────
   getEventDemand
   ─────────────────────────────────────────────
   Returns the simulated demand for one event, keyed by ride type:
     { boda: { total: 9, booked: 7, remaining: 2 }, standard: {...}, ... }
*/
export function getEventDemand(eventId) {
  const day = new Date().toDateString()
  const demand = {}

  // 1. Generate base numbers for every ride type
  for (const [type, [min, max]] of Object.entries(POOL)) {
    const seed    = `${eventId}|${type}|${day}`
    const total   = seededInt(`${seed}|total`, min, max)
    const soldOut = seededInt(`${seed}|soldout`, 1, 100) <= SOLD_OUT_CHANCE
    const booked  = soldOut ? total : seededInt(`${seed}|booked`, 0, total - 1)
    demand[type]  = { total, booked }
  }

  // 2. Safety net: never let every ride type start out sold out
  if (Object.values(demand).every(d => d.booked >= d.total)) {
    demand.standard.booked = demand.standard.total - 2
  }

  // 3. Add the rides this user booked in this session, then work out what's left
  for (const type of Object.keys(demand)) {
    const mine = myBookings[`${eventId}|${type}`] || 0
    demand[type].booked    = Math.min(demand[type].booked + mine, demand[type].total)
    demand[type].remaining = demand[type].total - demand[type].booked
  }

  return demand
}

/*
  reserveRide: call this when the user clicks "Book it".
  It takes one ride out of the pool for that event and ride type.
*/
export function reserveRide(eventId, type) {
  const key = `${eventId}|${type}`
  myBookings[key] = (myBookings[key] || 0) + 1
}

/* ─────────────────────────────────────────────
   Display helpers
─────────────────────────────────────────────── */

// 'xl' -> 'XL', 'boda' -> 'Boda'
export function typeLabel(type) {
  return type === 'xl' ? 'XL' : type.charAt(0).toUpperCase() + type.slice(1)
}

// 'out' = sold out, 'low' = running low, 'ok' = plenty left
export function stockLevel(d) {
  if (!d) return 'ok'
  if (d.remaining === 0) return 'out'
  if (d.remaining <= LOW_STOCK) return 'low'
  return 'ok'
}

/*
  getScarcity: the message shown on a ride option.
  Returns { level, text }, or null if we have no demand data for that type.
*/
export function getScarcity(type, d) {
  if (!d) return null

  const label = typeLabel(type)
  const level = stockLevel(d)
  const rides = d.remaining === 1 ? 'ride' : 'rides'

  if (level === 'out') {
    return { level, text: `${label} is fully booked for this event (${d.total} of ${d.total} taken).` }
  }
  if (level === 'low') {
    return {
      level,
      text: `Only ${d.remaining} ${label} ${rides} left and ${d.booked} people have already booked. Book now or you'll have to take another ride type.`,
    }
  }
  return { level, text: `${d.booked} people have booked a ${label} ride to this event (${d.remaining} left).` }
}