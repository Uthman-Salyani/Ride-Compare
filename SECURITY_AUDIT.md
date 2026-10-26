# Security Audit: RideCompare API (Week 9)

Scope: `backend/index.js`, `openapi.yaml`, `README.md`, and the git repository.
Consumers: `voteredu` (downstream partner) and `team` (our own testing).
Method: read every route in `index.js`, then called the running API with a valid key and read the full responses and headers.

## 1. Authentication

- Every endpoint requires a valid `X-API-Key` header. The middleware is registered before all routes, so the handler never runs without a valid key. There are no open endpoints (no public health-check).
- One key per consumer (`voteredu`, `team`), 24 random bytes (48 hex characters, confirmed at startup by key length), stored in the `API_KEYS` environment variable as `name:key` pairs. Revoking one consumer means deleting one pair.
- `.env` is gitignored; `.env.example` is committed with placeholders only. Startup logs only the number of keys loaded, never the keys.
- Status codes: `401` for a missing or wrong key (confirmed live: no key returns `401 {"code":"UNAUTHORIZED","message":"Missing or invalid API key"}`). `403` is used for the internal `/drivers` endpoints (see section 3).

Evidence:
![alt text](<Screenshot 2026-10-26 110817.png>)


![alt text](<Screenshot 2026-10-26 110952.png>)


## 2. Rate limiting

- 100 requests per minute per API key, held in memory. Over the limit the API returns `429` with a `Retry-After` header and a JSON body `{ code: "RATE_LIMITED", message, retryAfter }`.
- Why 100: a partner screen needs a handful of calls (providers, landmarks, rides), so 100/min is far above legitimate use, but a buggy loop is stopped within a minute. Limits are per key, so one consumer's bug cannot lock out the other.
- Automated test (`ratelimit.test.js`, limit set to 3) confirms `200 200 200 429 429`, the `Retry-After` header, and that another key is unaffected.
- Limitations: the counter resets on restart and does not work across several server copies (production would use a shared store such as Redis). Failed-auth requests are rejected before the limiter, so they are not counted; guessing a 192-bit key is infeasible, so this is accepted.

Evidence (limit temporarily set to 3):

![alt text](<Screenshot 2026-10-26 111300.png>)

![alt text](<Screenshot 2026-10-26 111657.png>)



## 3. Checklist: what I checked, found, and fixed

| Item | What I checked | Found | Fixed |
|---|---|---|---|
| Sensitive fields | Read every response mapper, then called `/providers`, `/landmarks`, `/landmarks/1`, `/rides`, `/rides/uber-x` with the `voteredu` key and read every field | Nothing leaked. Providers return only `id, name, logoUrl`; landmarks only `id, name, location`; rides only `id, providerId, providerName, rideType, fare, etaMinutes, capacity`. The queries use `SELECT *`, but columns such as `color`, `bg_color`, `per_km`, `per_min` are never returned because responses are built from explicit field lists. | Nothing needed |
| Other people's data | Changed ids in `/landmarks/{id}` and `/rides/{id}`; sent injection-style ids (`1 OR 1=1`, `uber-x' OR '1'='1`) | No per-user data exists; all records are public reference data. Queries use `?` placeholders, so injection returned no extra rows (`uber-x' OR '1'='1` gave 404). Minor quirk: `/landmarks/1 OR 1=1` returned landmark 1, because MySQL converts the text `1 OR 1=1` to the number 1. | `/landmarks/:id` now accepts digits only and returns 404 for anything else |
| Error messages | Called the API with bad input and read the full bodies: invalid coordinates (400), invalid `type` (400), unknown ride id (404), no key (401). Read every `500` handler. | The live 400/404/401 bodies contain only `code` and `message`: no stack trace, file path, SQL or table name. By code review, **5 routes returned MySQL's `err.message` on a 500**, which can contain table names and SQL. | Added `dbError()`: logs the error code on the server only and returns a generic `Internal server error`. [PASTE the live 500 result after stopping MySQL] |
| Response headers | Read the headers of every `curl -i` response | **`X-Powered-By: Express` was sent on every response**, revealing the framework. | `app.disable('x-powered-by')`; a test confirms the header is gone |
| Internal endpoints | Compared the routes in `index.js` with `openapi.yaml` | **`GET /drivers` and `GET /drivers/:type` are not in the partner contract** and return a driver's name, car and number plate. Any valid key could call them. | Restricted to the `team` consumer; other keys get `403 FORBIDDEN`. [PASTE live result: voteredu key -> 403, team key -> 200] |
| CORS | Read the CORS config and the `Access-Control-Allow-Origin` header | **`allowedHeaders` did not include `X-API-Key`**, so browser preflight requests would fail once auth was on. Methods listed POST/PUT/DELETE although no such routes exist. Origin is `*`, which is acceptable here because access is controlled by the API key header, not cookies. | Allowed `X-API-Key`; methods limited to `GET, OPTIONS`; a test confirms preflight works. CORS runs before the auth middleware, so preflights are not rejected with 401. |
| Write endpoints | Searched `index.js` for `app.post/put/patch/delete` and `req.body` | No matches. The API is read-only; no route reads a request body, so extra fields such as `isAdmin` cannot be saved. | n/a |
| Keys in the wrong place | Searched `index.js`, `README.md`, `openapi.yaml` and this file for the real key values; checked that `.env` is not tracked; searched git history for both keys; checked `git status` | No key or password in code,docs or logs. | Nothing to fix |

