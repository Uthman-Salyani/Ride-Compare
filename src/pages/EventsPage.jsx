import { useState, useEffect } from 'react'
import { apiFetch, getEvents, getMockRoute, buildResults } from '../utils/fareUtils.js'
import { getEventDemand, reserveRide, getScarcity, stockLevel, typeLabel } from '../utils/demandUtils.js'

/*
  EventsPage.jsx: today's campus events, each with its own ride options.

  For every event we:
    1. Match the event's location text to one of our landmarks
    2. Work out the route from the user's pickup to that landmark
    3. Fetch fares for that route
    4. Look up the (simulated) demand for that event and drop ride types that are sold out
    5. Pick the fastest and cheapest of what's left and compare door-to-door time
       against the minutes left before the event

  Props:
    pickup       the validated pickup the user typed on the landing page
    onBook(ride, route)  books a ride (route is passed so BookingPage has a trip to show)
*/

/*
  Venues whose text doesn't contain a landmark name, mapped to the nearest
  landmark we have. These are best-guess mappings, edit them freely.
*/
const VENUE_ALIASES = {
  'kicc':                   'cbd',
  'kenyatta international': 'cbd',
  'uhuru gardens':          'langata',
  'nairobi national park':  'langata',
  'nairobi arboretum':      'kilimani',
  'karura':                 'gigiri',
  'strathmore':             'south c',
  'adams':                  'ngong road',
}

// Returns the name of the landmark an event takes place at, or null
function findLandmarkForEvent(location, landmarkNames) {
  const text = location.toLowerCase()

  // 1. A landmark name appears in the location text (longest name first)
  const direct = [...landmarkNames]
    .sort((a, b) => b.length - a.length)
    .find(name => text.includes(name))
  if (direct) return direct

  // 2. A known venue alias
  for (const [venue, landmark] of Object.entries(VENUE_ALIASES)) {
    if (text.includes(venue) && landmarkNames.includes(landmark)) return landmark
  }
  return null
}

/*
  Events carry full dates, but we only care about the time of day.
  This puts the event's local time on today's date.
  (Local getters on purpose: UTC getters would shift the time by 3 hours in Nairobi.)
*/
function toTodayDate(isoString) {
  const original = new Date(isoString)
  const today = new Date()
  today.setHours(original.getHours(), original.getMinutes(), 0, 0)
  return today
}

const minutesUntil = date => Math.round((date - Date.now()) / 60000)
const formatTime   = date => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const pickFastest  = rides => [...rides].sort((a, b) => a.eta_min - b.eta_min || a.fare - b.fare)[0]
const pickCheapest = rides => [...rides].sort((a, b) => a.fare - b.fare || a.eta_min - b.eta_min)[0]

const TONES = {
  blue:    { box: 'border-blue-100 bg-blue-50',       label: 'text-blue-700',    pill: 'bg-blue-100 text-blue-700',       btn: 'bg-blue-600 hover:bg-blue-700' },
  emerald: { box: 'border-emerald-100 bg-emerald-50', label: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
}

// Colours for the stock level: 'out' (sold out), 'low' (running low), 'ok' (plenty left)
const SCARCITY_TEXT = { out: 'text-red-600',  low: 'text-amber-700', ok: 'text-slate-500' }
const CHIP_STYLE    = { out: 'bg-red-50 text-red-600', low: 'bg-amber-50 text-amber-700', ok: 'bg-slate-100 text-slate-600' }

// One ride option inside an event card
function RideTile({ label, tone, ride, minsLeft, tripMin, scarcity, wide, onBook }) {
  const t = TONES[tone]
  const doorToDoor = ride.eta_min + tripMin   // driver arrival + the trip itself
  const spare = minsLeft - doorToDoor

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 ${t.box} ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${t.label}`}>{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.pill}`}>{doorToDoor} min door to door</span>
      </div>
      <p className="text-sm font-bold text-slate-950">{ride.providerName}: {ride.type}</p>
      <p className="text-sm text-slate-600">KES {ride.fare.toLocaleString()}</p>
      <p className={`text-xs font-medium ${spare >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
        {spare >= 0 ? `${spare} min to spare` : `${-spare} min after the event starts`}
      </p>

      {/* Simulated demand for this ride type at this event */}
      {scarcity && (
        <p className={`text-xs font-medium ${SCARCITY_TEXT[scarcity.level]}`}>{scarcity.text}</p>
      )}

      <button
        onClick={onBook}
        className={`mt-1 w-full rounded-xl py-2 text-xs font-semibold text-white transition ${t.btn}`}
      >
        Book it
      </button>
    </div>
  )
}

export default function EventsPage({ pickup, onBook }) {
  const [cards,   setCards]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [eventsData, landmarkRows] = await Promise.all([
          getEvents(),
          apiFetch('/landmarks').then(r => r.json()),
        ])
        const landmarkNames = landmarkRows.map(l => l.name.toLowerCase())

        // Today's remaining events, soonest first, each tagged with its landmark
        const upcoming = eventsData
          .map(ev => ({ ...ev, startsAt: toTodayDate(ev.startTime) }))
          .filter(ev => minutesUntil(ev.startsAt) > 0)
          .sort((a, b) => a.startsAt - b.startsAt)
          .map(ev => ({ ...ev, landmark: findLandmarkForEvent(ev.location, landmarkNames) }))

        // One route + fare lookup per distinct destination (events can share a landmark)
        const destinations = [...new Set(upcoming.map(ev => ev.landmark).filter(Boolean))]
        const lookups = {}
        await Promise.all(destinations.map(async name => {
          try {
            const route = await getMockRoute(pickup, name)
            const all   = await buildResults({ ...route })
            // Events are for people, so leave out delivery services
            lookups[name] = { route, rides: all.filter(r => r.vehicle_type !== 'delivery') }
          } catch {
            lookups[name] = null
          }
        }))

        if (!cancelled) {
          setCards(upcoming.map(ev => ({ ...ev, ...(lookups[ev.landmark] || {}) })))
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [pickup])

  return (
    <div className="flex flex-col gap-6">

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Today's events</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Campus events happening today</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ride options from <span className="font-medium text-slate-700">{pickup}</span> · times in your local time
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
          <p className="text-sm text-slate-500">Working out rides for today's events...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-medium text-amber-700">Events are unavailable right now. Please try again later.</p>
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No more events for today. Check back tomorrow.</p>
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="flex flex-col gap-4">
          {cards.map(ev => {
            const minsLeft = minutesUntil(ev.startsAt)
            const tripMin  = ev.route?.duration ?? 0
            const sameArea = ev.landmark && ev.landmark === pickup.trim().toLowerCase()

            // ── Simulated traffic for this event ──
            const demand   = getEventDemand(ev.id)
            const allRides = ev.rides || []
            const hasRides = allRides.length > 0

            // Only ride types that still have seats left can be offered
            const available = allRides.filter(r => (demand[r.vehicle_type]?.remaining ?? 1) > 0)
            const canBook   = available.length > 0

            const fastest  = canBook ? pickFastest(available)  : null
            const cheapest = canBook ? pickCheapest(available) : null
            const same     = canBook && fastest.id === cheapest.id

            // Ride types that would have been picked if they weren't sold out
            const idealTypes   = hasRides ? [pickFastest(allRides), pickCheapest(allRides)].map(r => r.vehicle_type) : []
            const soldOutPicks = [...new Set(idealTypes)].filter(t => demand[t]?.remaining === 0)

            // Ride types this event actually has options for (for the availability chips)
            const typesHere = Object.keys(demand).filter(t => allRides.some(r => r.vehicle_type === t))

            const bookWith = ride => () => {
              reserveRide(ev.id, ride.vehicle_type)   // takes one ride out of the pool
              onBook(ride, { pickup, dropoff: ev.location, selectedVehicleType: '', ...ev.route })
            }

            return (
              <div key={ev.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">{ev.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">📍 {ev.location}</p>
                    {sameArea && (
                      <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Same area as your pickup
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-black text-slate-950">{formatTime(ev.startsAt)}</p>
                    <p className="text-xs text-slate-400">in {minsLeft} min</p>
                  </div>
                </div>

                <div className="mb-4 border-t border-slate-100" />

                {!ev.landmark && (
                  <p className="text-sm text-slate-500">
                    We can't map this venue to one of our pickup zones yet, so there's no ride estimate.
                  </p>
                )}

                {ev.landmark && !hasRides && (
                  <p className="text-sm text-slate-500">Ride estimates are unavailable for this event right now.</p>
                )}

                {hasRides && (
                  <>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      {ev.route.distance} km · about {tripMin} min trip from {pickup}
                    </p>

                    {/* Availability chips: how many rides are left per ride type */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      {typesHere.map(t => {
                        const d = demand[t]
                        return (
                          <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ${CHIP_STYLE[stockLevel(d)]}`}>
                            {typeLabel(t)}: {d.remaining === 0 ? 'sold out' : `${d.remaining} left`}
                          </span>
                        )
                      })}
                    </div>

                    {/* The best option was sold out, so point the user at the next best one */}
                    {canBook && soldOutPicks.length > 0 && (
                      <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
                        🚫 {soldOutPicks.map(typeLabel).join(' and ')} {soldOutPicks.length > 1 ? 'are' : 'is'} fully
                        booked for this event, so these are the next best options.
                      </div>
                    )}

                    {!canBook && (
                      <div className="rounded-xl bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
                        🚫 Every ride type is fully booked for this event.
                      </div>
                    )}

                    {canBook && (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {same ? (
                            <RideTile label="Fastest & cheapest" tone="emerald" ride={fastest} wide
                              minsLeft={minsLeft} tripMin={tripMin}
                              scarcity={getScarcity(fastest.vehicle_type, demand[fastest.vehicle_type])}
                              onBook={bookWith(fastest)} />
                          ) : (
                            <>
                              <RideTile label="Fastest" tone="blue" ride={fastest}
                                minsLeft={minsLeft} tripMin={tripMin}
                                scarcity={getScarcity(fastest.vehicle_type, demand[fastest.vehicle_type])}
                                onBook={bookWith(fastest)} />
                              <RideTile label="Cheapest" tone="emerald" ride={cheapest}
                                minsLeft={minsLeft} tripMin={tripMin}
                                scarcity={getScarcity(cheapest.vehicle_type, demand[cheapest.vehicle_type])}
                                onBook={bookWith(cheapest)} />
                            </>
                          )}
                        </div>

                        <div className={`mt-3 rounded-xl px-4 py-2 text-xs font-medium
                          ${minsLeft >= fastest.eta_min + tripMin ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {minsLeft >= fastest.eta_min + tripMin
                            ? `✅ You can make it. The fastest available option gets you there with ${minsLeft - (fastest.eta_min + tripMin)} min to spare.`
                            : '❌ Every available option arrives after the event starts.'}
                        </div>
                      </>
                    )}
                  </>
                )}

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}