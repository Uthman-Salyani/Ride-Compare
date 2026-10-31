import { useState } from 'react'
import LandingPage  from './pages/LandingPage.jsx'
import SearchPage   from './pages/SearchPage.jsx'
import ResultsPage  from './pages/ResultsPage.jsx'
import BookingPage  from './pages/BookingPage.jsx'
import EventsPage   from './pages/EventsPage.jsx'

/*
  Screens:
    'landing'  — hero + entry points
    'search'   — route input form
    'results'  — fare comparison
    'booking'  — simulated booking confirmation
    'events'   — today's campus events with ride options
*/
export default function App() {
  const [screen,     setScreen]     = useState('landing')
  const [routeData,  setRouteData]  = useState(null)
  const [chosenRide, setChosenRide] = useState(null)
  const [eventsPickup, setEventsPickup] = useState('')

  function handleStart() {
    setRouteData(null)
    setChosenRide(null)
    setScreen('search')
  }

  function handleSearch(data) {
    setRouteData(data)
    setScreen('results')
  }

  // route is optional: events bookings pass their own trip so BookingPage has one to show
  function handleBook(ride, route) {
    if (route) setRouteData(route)
    setChosenRide(ride)
    setScreen('booking')
  }

  function handleReset() {
    setRouteData(null)
    setChosenRide(null)
    setScreen('landing')
  }

  function handleViewEvents(pickup) {
    setEventsPickup(pickup)
    setScreen('events')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute right-[-6rem] top-40 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/80 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.65)]" />
            <span className="text-base font-black tracking-tight text-slate-950 sm:text-lg">RideCompare</span>
          </div>
          {screen === 'landing' ? (
            <button
              onClick={handleStart}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              ← Home
            </button>
          )}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        {screen === 'landing' && (
          <LandingPage onStart={handleStart} onViewEvents={handleViewEvents} />
        )}
        {screen === 'search' && (
          <SearchPage onSearch={handleSearch} />
        )}
        {screen === 'results' && (
          <ResultsPage routeData={routeData} onBook={handleBook} />
        )}
        {screen === 'booking' && (
          <BookingPage ride={chosenRide} routeData={routeData} onReset={handleReset} />
        )}
        {screen === 'events' && (
          <EventsPage pickup={eventsPickup} onBook={handleBook} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}