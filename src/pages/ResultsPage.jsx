import { useState, useEffect } from 'react'
import { buildResults } from '../utils/fareUtils.js'
import RideCard from '../components/RideCard.jsx'
import RouteMap from '../components/RouteMap.jsx'

/*
  ResultsPage.jsx — Shows the comparison of all ride options.

  Changes from the previous version:
  - Replaced useMemo with useEffect + useState because buildResults is now async
  - Added a loading state while results are being fetched from the backend
  - vehicle_type (snake_case) replaces vehicleType (camelCase) to match MySQL column names
  - eta_min replaces etaMin for the same reason

  Props:
    routeData    — { pickup, dropoff, distance, duration, pickupCoords, dropoffCoords }
    onBook(ride) — called when user picks a ride, passes chosen ride up to App.jsx
*/
export default function ResultsPage({ routeData, onBook }) {
  const {
    pickup,
    dropoff,
    distance,
    duration,
    pickupCoords,
    dropoffCoords,
    selectedVehicleType,
  } = routeData

  // Sort preference: 'price' | 'eta' | 'capacity'
  const [sortBy, setSortBy] = useState('price')

  // Results fetched and calculated from the backend
  const [results, setResults] = useState([])

  // Loading state — true while waiting for the backend response
  const [loading, setLoading] = useState(true)

  /*
    useEffect replaces useMemo here because buildResults is now async.
    useMemo cannot await a Promise — useEffect can.
    This runs once when the component mounts, fetches the data,
    calculates fares, and stores the results in state.
  */
  useEffect(() => {
    setLoading(true)
    buildResults(distance, duration)
      .then(data => {
        setResults(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to build results:', err)
        setLoading(false)
      })
  }, [distance, duration])

  // Sort the results based on the user's selected sort preference
  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'price')    return a.fare      - b.fare
    if (sortBy === 'eta')      return a.eta_min   - b.eta_min   // snake_case from MySQL
    if (sortBy === 'capacity') return b.capacity  - a.capacity
    return 0
  })

  // Filter by vehicle type if the user selected one on the search page
  const filtered = sorted.filter(ride => {
    if (selectedVehicleType) return ride.vehicle_type === selectedVehicleType // snake_case
    return true
  })

  return (
    <div className="flex flex-col gap-6">

      {/* Route summary */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {pickup} → {dropoff}
        </p>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>📍 {distance} km</span>
          <span>⏱ ~{duration} min in traffic</span>
          {selectedVehicleType && (
            <span>
              🎯 {selectedVehicleType.charAt(0).toUpperCase() + selectedVehicleType.slice(1)} only
            </span>
          )}
        </div>
      </div>

      {/* Map preview — only shown if we have real coordinates */}
      {pickupCoords && dropoffCoords && (
        <RouteMap
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          pickupLabel={pickup}
          dropoffLabel={dropoff}
        />
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide mr-1">Sort by</span>
        {['price', 'eta', 'capacity'].map(opt => (
          <button
            key={opt}
            onClick={() => setSortBy(opt)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition
              ${sortBy === opt
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Fetching ride options...</p>
        </div>
      )}

      {/* Ride cards */}
      {!loading && (
        <div className="flex flex-col gap-3">
          {filtered.length > 0 ? (
            filtered.map(ride => (
              <RideCard
                key={ride.id}
                ride={ride}
                pickup={pickup}
                dropoff={dropoff}
                onBook={() => onBook(ride)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
              No rides match the selected type. Go back and choose a different type or switch to All types.
            </div>
          )}
        </div>
      )}

    </div>
  )
}