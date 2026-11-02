# Week 12 Monitoring Notes (RideCompare API)

All numbers are from our own `requests.log` and `GET /stats` output on 2026-11-02. Counters reset on every restart, so each capture covers one server run.

## Part A: Predictions (written before looking at any data)
1. **Slowest endpoint:** `GET /events`, because it calls the partner API over the internet (with retries) on every request, while the other routes only run a local MySQL query. Runner-up: `GET /rides`, which joins `ride_types` and `providers`.
2. **Most errors:** `GET /landmarks/:id` for 4xx, because ids that don't exist return 404. `GET /events` for 5xx, because it depends on a partner that can fail.

## Sample log lines (key hashed, no query strings, no key anywhere)
```json
{"time":"2026-11-02T04:23:28.460Z","method":"GET","path":"/providers","status":200,"ms":77.1,"caller":"key-99b75d"}
{"time":"2026-11-02T04:24:55.739Z","method":"GET","path":"/providers","status":200,"ms":2.6,"caller":"key-99b75d"}
{"time":"2026-11-02T04:25:40.209Z","method":"GET","path":"/providers","status":401,"ms":1,"caller":"none"}
{"time":"2026-11-02T04:26:20.791Z","method":"GET","path":"/providers","status":401,"ms":0.7,"caller":"none"}
```
The 401s (wrong key, no key) appear because `monitor` is registered before `requireApiKey`.

## Traffic generated
- **Ours:** `traffic.js` against my own API, N=200, about 50 ms apart. One run's summary: 52 x 200, 11 x 400, 14 x 401, 37 x 404, **86 x 429**. The 86 rate-limited requests match the limit of 100 per minute per key: 186 of the 200 carried a valid key, and 186 - 100 = 86.
- **VoterEdu (ring partner):** they ran `traffic.js` against our Cloudflare tunnel URL with their own key, N=200 (their copy was the older request mix, so `/rides` had no coordinates). Their summary: 91 x 200, 23 x 400, 18 x 401, 65 x 404, 3 x 429. Their key's fingerprint, and so their `caller` label, is `key-7c9364`, different from mine (`key-99b75d`). They hit only 3 rate limits against my 86, probably because their requests went through the tunnel and took longer, so the 200 requests spread over more than one minute.

## /stats captured after both runs (same server run since 07:57:48Z, uptime 20579 s)
```json
{
  "total": 540, "clientErrors": 361, "serverErrors": 0, "errorRatePercent": 0, "avgMs": 87.6,
  "routes": {
    "GET /rides/:id":     { "count": 31,  "clientErrors": 31,  "serverErrors": 0, "avgMs": 2.3,    "maxMs": 12.6 },
    "GET /landmarks/:id": { "count": 80,  "clientErrors": 36,  "serverErrors": 0, "avgMs": 1.5,    "maxMs": 3 },
    "GET /events":        { "count": 37,  "clientErrors": 0,   "serverErrors": 0, "avgMs": 1258.6, "maxMs": 5195 },
    "GET /providers":     { "count": 36,  "clientErrors": 0,   "serverErrors": 0, "avgMs": 1.5,    "maxMs": 3.1 },
    "GET (no route)":     { "count": 264, "clientErrors": 264, "serverErrors": 0, "avgMs": 0.6,    "maxMs": 2.8 },
    "GET /rides":         { "count": 40,  "clientErrors": 30,  "serverErrors": 0, "avgMs": 3.4,    "maxMs": 52.1 },
    "GET /landmarks":     { "count": 50,  "clientErrors": 0,   "serverErrors": 0, "avgMs": 3.6,    "maxMs": 48.9 },
    "GET /stats":         { "count": 2,   "clientErrors": 0,   "serverErrors": 0, "avgMs": 1,      "maxMs": 1.1 }
  }
}
```
Earlier in the same server run (201 requests, uptime 261 s), `GET /events` had 12 calls, an average of 511.9 ms and a worst call of 1224.6 ms. A separate, earlier server run (6 requests) had one `GET /events` call that took 5149.6 ms and returned a 502.

## Part E: Predicted vs actual
| Question | Prediction | Data |
|---|---|---|
| Slowest endpoint on average | `GET /events`, then `GET /rides` | **`GET /events` correct.** It averaged 1258.6 ms over 37 calls. Every database route averaged under 4 ms. The runner-up was nearly a tie: `GET /landmarks` at 3.6 ms and `GET /rides` at 3.4 ms. `GET /rides` is a muddy number because 30 of its 40 calls were instant 400s; We estimate its 10 successful calls took about 11 ms each. |
| Slow worst case | not predicted | `GET /events` worst call was 5195 ms. Among database routes, `GET /rides` (52.1 ms, average 3.4) and `GET /landmarks` (48.9 ms, average 3.6) both had worst calls about 14x their average, so the averages hide a few slow queries. |
| Most 4xx | `GET /landmarks/:id` | **Correct by count.** 36 of its 80 calls (45%) were 404s, ahead of `GET /rides/:id` (31) and `GET /rides` (30). By rate, `GET /rides/:id` was worst: 31 of 31 failed, because the id `1` in our traffic mix does not exist. |
| Most 5xx | `GET /events` | **Not in this run.** 0 server errors in 540 requests. The only 5xx I have is the 502 from `GET /events` in the earlier 6-request run. |
| Are the 401s a mistake or probing? | not predicted | **Test traffic, not probing.** The 401s come from the "no key at all" line in `traffic.js` (14 of our 200 and 18 of VoterEdu's 200), and the log shows them with `caller: "none"`. |
| Is the error rate healthy? | not predicted | `errorRatePercent` was 0 over 540 requests, even though `clientErrors` was 361 (67%). That is not a problem: the 4xx are 401s and 429s from the rate-limit test, 404s I asked for on purpose, and invalid `/rides` calls. Only 5xx count towards the error rate. |

## Real pattern in our traffic
`GET /events` was 37 of 540 requests (7%) but about 98% of all time spent (37 x 1258.6 ms of roughly 47,300 ms in total). The other 503 requests averaged about 1.5 ms. It also got slower during the run: its first 12 calls averaged 511.9 ms, while the next 25 averaged about 1617 ms. The worst call (5195 ms) is almost exactly our Week 11 worst case of 5100 ms, yet `serverErrors` is 0, so we think that call exhausted its retries and was answered with saved data instead of a 502.

## Why we think it happens, and what we would check next
- **The partner is getting slower or less reliable** (the Mental Health Events API on Render). Everything else is a local query of a few milliseconds, so `/events` time is mostly waiting on them. We would call the partner URL directly with curl 20 times and compare its latency with our numbers to confirm the time is theirs, not ours.
- **The 5195 ms call was probably the Week 11 fallback working.** We would check the log for a `/events` line with `ms` around 5100 or more and status 200, and confirm the response said `stale: true`. If so, the fallback saved users from a 502 that the earlier 6-request run showed happening when `lastGood` was empty after a restart.
- **The 50 ms calls on `/rides` and `/landmarks`** are far slower than their ~3 ms average. The server had been up for over 5 hours, so our guess is an occasional slow query or a re-opened idle MySQL connection, like the 77.1 ms first request in the log. we would send the same request 50 times and look at how often it is slow.
- **The 1258.6 ms average is close to our 1500 ms timeout**, so more calls may start timing out and retrying as the partner slows down. We would log the attempt number on failures.

## Alert we would want in production
- **Metric:** `errorRatePercent` from `/stats` (5xx only).
- **Threshold:** above 5% for 5 minutes.
- **When it fires:** page whoever is on call to investigate the partner. Meanwhile `/events` should keep serving the saved `lastGood` data with `stale: true`, so users still see events. Our own data shows the gap in that plan: `lastGood` lives in memory, so after a restart with the partner down, the first caller gets a 502. We would save the last good response to disk or the database.


## Limits
- Counters reset on restart, and `/stats` does not split by caller, so our traffic and VoterEdu's are mixed together in the totals. Only the log can separate them by `caller` label.
