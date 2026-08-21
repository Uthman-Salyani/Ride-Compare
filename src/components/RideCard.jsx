/*
  RideCard.jsx — Displays a single ride option in the results list.

  Props:
    ride    — one result object from buildResults() in fareUtils.js
    onBook() — called when the user clicks the Book button
*/
export default function RideCard({ ride, onBook }) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 flex items-center gap-4 card-hover
        ${ride.bestValue ? 'border-emerald-400 border-l-4' : 'border-gray-200'}`}
    >

      {/* Provider logo / initials badge */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center
                   text-sm font-semibold shrink-0"
        style={{ backgroundColor: ride.providerBg, color: ride.providerColor }}
      >
        {/* First 4 characters of provider name as logo placeholder */}
        {ride.providerName.slice(0, 4)}
      </div>

      {/* Middle section: name, badges, meta */}
      <div className="flex-1 min-w-0">

        {/* Ride name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{ride.type}</span>

          {/* Best value badge */}
          {ride.bestValue && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              Best value
            </span>
          )}

          {/* Fastest ETA badge */}
          {ride.fastest && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Fastest
            </span>
          )}
        </div>

        {/* Meta: ETA and capacity */}
        <div className="flex gap-3 mt-1 text-xs text-gray-500">
          <span>⏱ {ride.eta_min} min away</span>
          <span>👤 {ride.capacity} seats</span>
        </div>

      </div>

      {/* Right section: fare + book button */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-base font-bold text-gray-900">
          KES {ride.fare.toLocaleString()}
        </span>
        <button
          onClick={onBook}
          className={`text-xs px-4 py-1.5 rounded-lg font-medium transition
            ${ride.bestValue
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
        >
          Book
        </button>
      </div>

    </div>
  )
}