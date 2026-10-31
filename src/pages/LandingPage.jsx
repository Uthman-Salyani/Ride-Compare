import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/fareUtils.js'

export default function LandingPage({ onStart, onViewEvents }) {
  const [eventsPickup, setEventsPickup] = useState('')
  const [pickupError,  setPickupError]  = useState('')
  const [landmarks,    setLandmarks]    = useState([])

  // Fetch landmarks once so we can validate the pickup before navigating
  useEffect(() => {
    apiFetch('/landmarks')
      .then(r => r.json())
      .then(data => setLandmarks(data))
      .catch(() => {}) // silent — validation just won't block if fetch fails
  }, [])

  const appStats = [
    { value: '4', label: 'providers compared at once' },
    { value: '1', label: 'search gives live fare estimates' },
    { value: '2', label: 'pickup and dropoff points mapped' },
  ]

  const steps = [
    {
      title: 'Enter your route',
      text: 'Type any Nairobi pickup and dropoff location to start a comparison.',
    },
    {
      title: 'See fares side by side',
      text: 'The app calculates estimated fares, ETAs, and seat counts for each provider.',
    },
    {
      title: 'Pick and book',
      text: 'Choose the best option and continue to a simulated booking confirmation.',
    },
  ]

  function handleViewEvents(e) {
    e.preventDefault()
    const typed = eventsPickup.trim()
    const key   = typed.toLowerCase()

    if (!typed) {
      setPickupError('Please enter your pickup location.')
      return
    }

    // Landmarks haven't arrived yet (slow network or backend down)
    if (landmarks.length === 0) {
      setPickupError('Locations are still loading. Try again in a moment.')
      return
    }

    // Only accept locations that exist in our landmarks database
    const isKnown = landmarks.some(lm => lm.name?.toLowerCase() === key)
    if (!isKnown) {
      setPickupError('Please enter a supported location such as Westlands, CBD, Kilimani, Karen, or Parklands.')
      return
    }

    setPickupError('')
    onViewEvents(typed)
  }

  return (
    <div className="space-y-6 lg:space-y-8">

      {/* ── Hero ── */}
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Nairobi ride comparison
          </div>
          <div className="space-y-3">
            <h1 className="max-w-xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Compare ride prices before you book.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              RideCompare helps you check Uber, Bolt, Little, Faras, and YEGO side by side so you can see fares, ETAs, and route context before you commit.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onStart}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
            >
              Get Started
            </button>
            <a
              href="#how-it-works"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Live snapshot card */}
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_35%)] blur-2xl" />
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-slate-300/50 backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Live snapshot</div>
                <h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">Westlands to CBD</h2>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:text-sm">
                Best value: KES 320 - 480
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Fastest', value: '13 min' },
                { label: 'Cheapest', value: 'KES 320' },
                { label: 'Capacity', value: '4 seats' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.label}</div>
                  <div className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[1.5rem] bg-gradient-to-br from-emerald-400 via-teal-300 to-sky-300 p-4 text-slate-950 shadow-inner">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Route preview</span>
                <span>Fare comparison</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-4 rounded-[1.25rem] bg-white/70 p-3 backdrop-blur">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Best option</div>
                  <div className="mt-1 text-lg font-black text-slate-950 sm:text-xl">Bolt</div>
                  <div className="text-xs text-slate-600 sm:text-sm">ETA 11 min</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Estimated fare</div>
                  <div className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">KES 320</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="grid gap-3 sm:grid-cols-3">
        {appStats.map(stat => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur">
            <div className="text-xl font-black text-slate-950 sm:text-2xl">{stat.value}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="grid gap-4 lg:grid-cols-3">
        {steps.map(step => (
          <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Step</div>
            <h3 className="mt-2 text-base font-bold text-slate-950 sm:text-lg">{step.title}</h3>
            <p className="mt-2 text-xs leading-6 text-slate-600 sm:text-sm">{step.text}</p>
          </div>
        ))}
      </section>

      {/* ── Events entry card ── */}
      <section>
        <div className="rounded-[2rem] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            {/* Left: description */}
            <div className="space-y-1 max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Live from Strathmore Mental Health
              </div>
              <h2 className="text-lg font-black text-slate-950">Campus events happening today</h2>
              <p className="text-sm text-slate-600 leading-6">
                See today's wellness events with the fastest and cheapest ride to get you there on time.<br></br>
                Your Mental Health Matters!
              </p>
            </div>

            {/* Right: pickup input + button */}
            <form onSubmit={handleViewEvents} className="flex flex-col gap-2 sm:min-w-64">
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <input
                  type="text"
                  placeholder="Your pickup (e.g. Westlands)"
                  value={eventsPickup}
                  onChange={e => setEventsPickup(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              {pickupError && (
                <p className="text-xs text-red-500 px-1">{pickupError}</p>
              )}
              <button
                type="submit"
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                View today's events →
              </button>
            </form>

          </div>
        </div>
      </section>

    </div>
  )
}