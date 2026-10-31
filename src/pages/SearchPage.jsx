import { useState, useEffect } from 'react'
import { apiFetch, getMockRoute } from '../utils/fareUtils.js'

const VEHICLE_TYPES = ['boda', 'standard', 'xl', 'comfort', 'delivery']

export default function SearchPage({ onSearch }) {
  const [pickup,              setPickup]              = useState('')
  const [dropoff,             setDropoff]             = useState('')
  const [selectedVehicleType, setSelectedVehicleType] = useState('')
  const [error,               setError]               = useState('')
  const [landmarks,           setLandmarks]           = useState([])

  // Fetch landmarks once on mount for location validation
  // Uses apiFetch so the X-API-Key header is included automatically
  useEffect(() => {
    apiFetch('/landmarks')
      .then(res => res.json())
      .then(data => setLandmarks(data))
      .catch(err => console.error('Failed to fetch landmarks:', err))
  }, [])

  function isValidLocation(location) {
    const key = location.trim().toLowerCase()
    return landmarks.some(lm => lm.name?.toLowerCase() === key)
  }

  function swapLocations() {
    setPickup(dropoff)
    setDropoff(pickup)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!pickup.trim() || !dropoff.trim()) {
      setError('Please enter both a pickup and dropoff location.')
      return
    }
    if (pickup.trim().toLowerCase() === dropoff.trim().toLowerCase()) {
      setError('Pickup and dropoff cannot be the same location.')
      return
    }
    if (!isValidLocation(pickup) || !isValidLocation(dropoff)) {
      setError('Please enter a supported location such as Westlands, CBD, Kilimani, Karen, or Parklands.')
      return
    }

    setError('')

    const routeData = await getMockRoute(pickup, dropoff)

    onSearch({
      pickup,
      dropoff,
      selectedVehicleType,
      ...routeData,
    })
  }

  return (
    <section className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 sm:text-2xl">Start comparing</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Type your route and the app will calculate a fresh estimate.</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 whitespace-nowrap sm:text-xs">
          No signup needed
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500" />
            <input
              type="text"
              placeholder="Pickup location (e.g. Westlands)"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={swapLocations}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:text-xs"
            aria-label="Swap pickup and dropoff"
          >
            Swap
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <span className="h-3 w-3 shrink-0 rounded-full bg-rose-400" />
            <input
              type="text"
              placeholder="Dropoff location (e.g. CBD)"
              value={dropoff}
              onChange={e => setDropoff(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-1">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Ride type
            <select
              value={selectedVehicleType}
              onChange={e => setSelectedVehicleType(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="">All types</option>
              {VEHICLE_TYPES.map(vehicleType => (
                <option key={vehicleType} value={vehicleType}>
                  {vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-500 sm:text-sm">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Compare rides
        </button>
      </form>

      <p className="mt-3 text-center text-[11px] text-slate-500 sm:text-xs">
        Try Westlands, CBD, Kilimani, Karen, Eastleigh, Lavington, Upperhill, Parklands etc.
      </p>
    </section>
  )
}