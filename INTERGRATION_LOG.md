# INTEGRATION_LOG.md: Week 10

**Our team:** Group 10 (RideCompare)
**Upstream partner (we consume):** Mental Health App, Events API
**Downstream partner (consumes us):** VoterEdu


## Setup

| | Details |
|---|---|
| Partner base URL | `https://whole-ctrl-chris-adventures.trycloudflare.com/api` (temporary Cloudflare tunnel from a partner laptop) |
| Authentication | None. Reading events is public, so there is no API key and no key header. |
| Our feature | `GET /events` in our backend (port 3001). It fetches events from today onward, removes cancelled ones, and returns only `id`, `title`, `location` and `startTime`, so events can be suggested as ride destinations. |
| Config | `PARTNER_URL` is set in `.env` and listed in `.env.example`. It is never hardcoded. |
| Where the call happens | Our server calls the partner, never the browser. The partner's README says its CORS only allows `http://localhost:5173`, so a browser call would be blocked. |

---

## Part B: First calls from the terminal

Calls checked against the partner's `openapi.yaml`:

| Call | Expected (from their contract) |
|---|---|
| `GET /api/events` | 200, array of events |
| `GET /api/events/evt_1` | 200, one event |
| `GET /api/events/evt_999` | 404, `{"message":"No event found with that id"}` |
| `GET /api/events?after=notadate` | 400, `{"message":"after must be a real date like 2026-08-31"}` |

Result: all four calls matched the contract (200, 200, 404 with the `message` body, and 400 with the `message` body). No surprises on the first calls, so we then tested the failure cases on purpose (nonexistent id, invalid date) instead of waiting for bugs.

---

## Part C: Wiring into our app

Called our own route with `curl.exe http://localhost:3001/events`. Result: 7 events in start-time order, each with all four mapped fields filled in. No `cancelled` or `description` fields appear, as intended.

Field-shape check: printed the raw partner event once and compared it to their `Event` schema. Field names and types matched (`id`, `title`, `location`, `startTime` present and correctly named). The temporary print was removed before committing.

Frontend check: the page showed the partner's events, the Network tab showed the request going to our own `/events` (not the partner's URL), and there were no CORS errors in the console.

---

## Bugs and surprises

| # | What broke or what we noticed (symptom) | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| 1 | Design note: partner events have a text `location` only, with no latitude or longitude, while our landmarks use `location.lat` and `location.lng`. | Contract difference, not a bug. The partner's `Event` schema has no coordinates. | Our route passes the location through as text. | Neither (design decision) |
| 2 | Design note: the partner's CORS only allows `http://localhost:5173`. | Their server restricts browser origins. | We call their API from our server, where CORS does not apply. | Neither (design decision) |

---

## Our consumer's API tests (what VoterEdu will call)

Base URL at the end of the lab: `https://percentage-lunch-lasting-ferry.trycloudflare.com`

| Test | Expected | Result |
|---|---|---|
| `GET /providers` | 200 | Matched contract |
| `GET /landmarks` | 200, 31 landmarks with `id`, `name`, `location.lat`, `location.lng` | Matched contract |
| `GET /landmarks/1` | 200, Westlands | Matched contract |
| `GET /rides` with the four required parameters | 200, ride estimates | Matched contract |
| `GET /landmarks/99999` | 404 `NOT_FOUND` | Matched contract |
| `GET /rides` with no parameters | 400 `INVALID_PARAMETER` | Matched contract |
| `GET /rides/{real id}` | 200 | Matched contract |

Notes for consumers: landmark ids are strings, coordinates are nested under `location`, and errors use `{"code": "...", "message": "..."}`. Our responses include `Access-Control-Allow-Origin: *`.

---

## Part D: Partner down

| Step | Result |
|---|---|
| Ran curl against a nonexistent hostname | Failed before any HTTP response (could not resolve host), which is the `ENOTFOUND` case |
| Ran curl against `localhost:9999` (nothing listening) | Failed before any HTTP response (failed to connect), which is the `ECONNREFUSED` case |
| Pointed `PARTNER_URL` at a bad address in `.env` and restarted our server | Our `/events` route returned 502 with the friendly message, and the terminal log line showed the cause (`ENOTFOUND` or `ECONNREFUSED`) |
| Our other routes (e.g. `/providers`) still worked while the partner was unreachable | Yes, our server stayed up and kept answering |
| Restored `PARTNER_URL` and the feature recovered without code changes | Yes, events returned after restoring the URL and restarting our server |

---

## Part E: Being a good provider

Downstream partner calling our API: VoterEdu.

Watched our server terminal while VoterEdu called our API: no unexpected 401, 404 or 429 responses. Their calls worked against our contract.

---
