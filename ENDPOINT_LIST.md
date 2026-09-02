# ENDPOINT_LIST.md — Team 10 (RideCompare)

## Part B — Initial Draft

| Method | Path | Purpose | Maps to Need |
|---|---|---|---|
| GET | `/landmarks` | Return the list of Nairobi landmarks (name + location) | Read Nairobi landmarks |
| GET | `/landmarks/{id}` | Return details for a single landmark | Read Nairobi landmarks |
| GET | `/rides?pickup={lat,lng}&dropoff={lat,lng}` | Return fare/ETA estimates across providers for a pickup–dropoff pair | Read fare & ETA estimates |
| GET | `/rides?pickup={lat,lng}&dropoff={lat,lng}&type={rideType}` | Return ride estimates filtered by ride type (e.g. Boda vs Standard) | Filter ride results by ride type |
| GET | `/rides?pickup={lat,lng}&dropoff={lat,lng}&sort=eta` | Return ride estimates sorted by ETA | Sort by ETA |

**Flag re: write requirement.** Every Week 2 needs statement for this partnership is read-only — Voter Edu never books, creates, or modifies anything in RideCompare.

---

## Part C (actual swap) — Peer Review from Team 5

1. **Missing write verb** — risk that the rubric's "at least one write verb" line gets enforced literally; suggested adding `POST /rides/{id}/bookings`, `POST /reports`, or `POST /searches`.
2. **Coordinate format** — `{lat,lng}` as a single query value complicates OpenAPI serialization; suggested splitting into scalar params.
3. **List→detail traceability** — reminder that `GET /rides` responses need a unique `id` per estimate for `GET /rides/{id}` to be usable.

## Part D (round 2) — Response to Team 5's Feedback

1. **Pushed back, not fixed, on the write-verb comment.** Inventing `POST /rides/{id}/bookings` or `POST /reports` would mean designing an endpoint nobody's needs statement asked for.  Voter Edu's four needs statements are all reads, and that's a real finding from our Week 2 work.

   To address the *issue* of the write endpoint without fabricating a partner need: RideCompare's full product does have real write endpoints (e.g., an internal `POST /bookings` used when a rider actually books through RideCompare's own app) — those just aren't exposed to Voter Edu, since Voter Edu never books through us. 
   
   Added a one-line note to the final table below making that explicit, so the absence of a write endpoint here reads as a scoping decision, not a gap in the API design.

2. **Fixed.** Split the combined `{lat,lng}` parameter into four scalar query params: `pickup_lat`, `pickup_lng`, `dropoff_lat`, `dropoff_lng`. Cleaner for validation.


3. **Fixed (documentation note, not a table change).** Added a one-line implementation note under the final table confirming each object in the `GET /rides` response array carries a unique `id` matching what `GET /rides/{id}` expects.

## Part E — Final Endpoint List

| Method | Path | Purpose | Maps to Need |
|---|---|---|---|
| GET | `/landmarks` | Return the list of Nairobi landmarks, so a polling station can be identified by a recognizable place name | Read Nairobi Landmarks |
| GET | `/landmarks/{id}` | Return details for a single landmark | Read Nairobi landmarks |
| GET | `/providers` | Return the list of ride providers included in comparisons | Supports read fare & ETA estimates (not directly named in a needs statement — flagged in Part D) |
| GET | `/rides?pickup_lat={float}&pickup_lng={float}&dropoff_lat={float}&dropoff_lng={float}&type={rideType}&sort={eta\|fare}` | Return fare/ETA estimates for a pickup–dropoff pair across providers, filterable by ride type, sortable by ETA | Filter ride results by ride type, Read fare & ETA estimates, Filter rides by ride type |
| GET | `/rides/{id}` | Return a single ride estimate's detail (fare, ETA, capacity, provider) | Sort rides by ETA |

**Notes:**
- All five endpoints are GET. Voter Edu's needs statements are read-only across the board — see Part D for why we didn't add a fabricated write endpoint. RideCompare's own product does have write endpoints (e.g. `POST /bookings`) for when a rider books directly through RideCompare
- Each estimate object returned by `GET /rides` must include a unique `id` field so a client can construct `GET /rides/{id}` from it.

