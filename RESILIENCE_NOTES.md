# RESILIENCE_NOTES.md: Week 11

**Team:** Group 10 (RideCompare)
**Feature:** `GET /events` in our backend, which calls the Mental Health App Events API (our upstream partner) and feeds the Events page ("Campus events happening today") with ride options for each event.

Events page showing saved data with the banner while the partner is stopped
   ![alt text](<Screenshot 2026-10-31 174339.png>)

**Files:** `resilientFetch.js` (timeout and retries), `index.js` (`/events` route with the saved-data fallback), `EventsPage.jsx` (banner and friendly message).

## Before (Part A, Week 10 code)

Measured against the stand-in partner (`flaky-partner.js`) with our own `/events` route:

| Mode | What happened with the Week 10 code |
|---|---|
| Normal (`ok`) | Stand-in answered in **0.0028 s** (about 3 ms). |
| Slow | Our `/events` route took **10.09 s** to respond, because there was no timeout and we waited for the partner to finish. |
| Flaky | The first two requests returned **502** "Events are unavailable right now" and only the third returned 200 with events. A second attempt would have worked, but the old code never made one. |

The old log line only said `partner returned 503 application/json; charset=utf-8` once per failed request, with no retry and no saved data to fall back on.

## 1. What we tested (after the changes)

| Failure | What the user saw | What our log said |
|---|---|---|
| **Partner stopped** (real partner, made unreachable from our side) | The Events page showed the last events we had loaded, with the amber banner "Showing saved events from 05:42 PM. The events service is not responding." Ride options and availability still worked.| Two `attempt N failed, retrying in ... ms` lines, then `partner call failed: timeout`. The server stayed up. |
| **Slow** (stand-in, answers after 10 s) | With a saved copy: the same events plus the banner. With no saved copy (backend restarted): the friendly message "Events are unavailable right now. Please try again later." and no crash.  | `attempt 1 failed, retrying in 200 ms`, `attempt 2 failed, retrying in 400 ms`, then `partner call failed: timeout`. |
| **Flaky** (stand-in, 503 twice then OK) | Live events with no banner (`"stale":false`). The user never saw a failure. | Two `attempt N failed, retrying` lines per request, no final error. The stand-in's own log shows calls 1, 2, 3 for one request. |
| **Always 500** (stand-in `error` mode) | Saved events with the banner, or the friendly message if nothing was saved. | Exactly two retries (200 ms, then 400 ms), then `partner call failed: partner returned 500 application/json; charset=utf-8`. It stops there, so there is no infinite loop. |
| **Normal** (stand-in `ok` mode) | Live events, no banner. | No warnings. The response had `"stale":false` and an `asOf` time. |

Our logs record the reason for each failure and never contain an API key.

## 2. Our numbers and why

| Setting | Value | Why |
|---|---|---|
| Timeout | **1500 ms** | A normal call to the stand-in took about 3 ms, and a real partner over the internet should still answer well under half a second. 1500 ms leaves plenty of room for a bad moment and is much shorter than a rider's patience. |
| Retries | **2** | Enough to ride out a momentary failure like a restart or a dropped connection. More would make the user wait longer and add load to a partner that is already struggling. |
| Delay between attempts | **200 ms, then 400 ms** | Short, and it doubles each time so we never hammer the partner. We also honour `Retry-After` on a 429. |
| Worst-case wait | **(2 + 1) x 1500 + 200 + 400 = 5100 ms** | A bit over five seconds before the page gives up. That is acceptable here because the events list is only a shortcut for choosing a destination, and the page then shows saved data or a clear message rather than hanging. |

We retry only timeouts, connection failures and 429/5xx responses. 400, 401, 403 and 404 come straight back because asking again cannot fix a wrong request, and we never retry anything that is not a GET.

Known limit: the real partner runs on Render's free tier and can take about a minute to wake up after sitting idle. A 1.5 s timeout will treat that cold start as a failure. The timeout can be raised without a code change through `PARTNER_TIMEOUT_MS` in `.env` (default 1500), and we woke the partner before testing.

## 3. What a real user would experience without this code

A rider opens the Events page ("Campus events happening today") to pick an event as their destination and see fares and how many minutes they would have to spare. Without a timeout, a slow partner leaves the page on its loading spinner for 10 seconds or more, and the rider cannot tell whether the app is broken. Without retries, a 503 that would have worked a moment later shows "Events are unavailable right now" two times out of three, as we saw in our own flaky test. With nothing saved to show, the rider has no events and no ride estimates, so they would likely close the page, type a destination by hand on the search page, or open a competitor's app. With this code the page answers within about five seconds either way: live events when the partner recovers, or the last known events with a banner that says they are saved, so the rider can still compare fares and book.

## 4. What we did not build

A circuit breaker is a switch that stops calling a partner that has been failing for a while and tests it occasionally. Ours still tries every request three times, so a long outage would cost every user up to 5.1 seconds and keep adding traffic to the partner; a circuit breaker would send users straight to saved data and let the partner recover.

## Notes on the real partner drill

Our partner was not available to stop and restart their server for us at the time, so we made their API unreachable from our side instead, without restarting our backend (a restart would have cleared the saved copy). After loading live events once, we cut our own connection to the partner, reloaded the page and got the saved-data banner, then reconnected and got live data again with no code changes. `PARTNER_URL` points back at their real URL.
