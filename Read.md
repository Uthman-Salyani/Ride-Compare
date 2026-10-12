# RideCompare API

RideCompare is a read-only REST API that compares ride options in Nairobi across
providers (Uber, Bolt, Little, ...) and ride types (Boda, Standard, XL, Comfort,
Delivery). It is built for partner apps (such as Voter Edu) that want to show a
user the available rides, fares and ETAs between two points, without booking
anything. Every endpoint is a `GET` and every response is JSON.



Base URL: `https://booth-declare-workers-queens.trycloudflare.com`

Opening the base URL on its own in a browser shows `Cannot GET /`. That is expected: the API has no home page. Add an endpoint path, for example `/providers`.

> This is a temporary public address that only works while the API host has the server running. If every request fails or times out, the host's server is offline.

---

## Quickstart (copy, paste, it works)

This returns the Standard rides between two Nairobi points, soonest ETA first:

```bash
curl "https://booth-declare-workers-queens.trycloudflare.com/rides?pickup_lat=-1.2864&pickup_lng=36.8172&dropoff_lat=-1.3197&dropoff_lng=36.8271&type=Standard&sort=eta"
```

Expected: HTTP `200` and a JSON array like:

```json
[
  {
    "id": "uber-x",
    "providerId": "uber",
    "providerName": "Uber",
    "rideType": "Standard",
    "fare": { "currency": "KES", "amount": 120.0 },
    "etaMinutes": 5,
    "capacity": 4
  }
]
```

---

## Authentication

None yet. This version needs **no API key and no `Authorization` header**.
(Real authentication is planned for Week 9; when it arrives it will be
documented here.)

---

## Endpoints

### GET /providers

List the ride providers included in comparisons.

```bash
curl https://booth-declare-workers-queens.trycloudflare.com/providers
```

Response `200`:

```json
[
  { "id": "little", "name": "Little", "logoUrl": "https://cdn.ridecompare.co.ke/logos/little.png" },
  { "id": "bolt", "name": "Bolt", "logoUrl": "https://cdn.ridecompare.co.ke/logos/bolt.png" }
]
```

### GET /landmarks

List known Nairobi landmarks (name + coordinates). Use these as handy
pickup/dropoff coordinates.

```bash
curl https://booth-declare-workers-queens.trycloudflare.com/landmarks
```

Response `200`:

```json
[
  { "id": "1", "name": "westlands", "location": { "lat": -1.2676, "lng": 36.8123 } },
  { "id": "2", "name": "cbd", "location": { "lat": -1.2833, "lng": 36.8172 } }
]
```

### GET /landmarks/{id}

One landmark, by the `id` returned from `GET /landmarks`.

```bash
curl https://booth-declare-workers-queens.trycloudflare.com/landmarks/1
```

Response `200`:

```json
{ "id": "1", "name": "westlands", "location": { "lat": -1.2676, "lng": 36.8123 } }
```

Unknown id (`curl https://booth-declare-workers-queens.trycloudflare.com/landmarks/9999`) returns `404`:

```json
{ "code": "NOT_FOUND", "message": "No landmark found with id '9999'" }
```

### GET /rides

Fare and ETA estimates across providers and ride types.

| Query parameter | Required | Notes |
|---|---|---|
| `pickup_lat`, `pickup_lng` | yes | Numbers, e.g. `-1.2864`, `36.8172` |
| `dropoff_lat`, `dropoff_lng` | yes | Numbers, e.g. `-1.3197`, `36.8271` |
| `type` | no | One of `Boda`, `Standard`, `XL`, `Comfort`, `Delivery` (case-insensitive) |
| `sort` | no | `eta` or `fare`, ascending |

```bash
curl "https://booth-declare-workers-queens.trycloudflare.com/rides?pickup_lat=-1.2864&pickup_lng=36.8172&dropoff_lat=-1.3197&dropoff_lng=36.8271&sort=fare"
```

Response `200` (array; empty `[]` if nothing matches):

```json
[
  {
    "id": "bolt-boda",
    "providerId": "bolt",
    "providerName": "Bolt",
    "rideType": "Boda",
    "fare": { "currency": "KES", "amount": 41.0 },
    "etaMinutes": 3,
    "capacity": 1
  }
]
```

Bad input (for example `pickup_lat=abc`, or `type=Spaceship`) returns `400`:

```json
{
  "code": "INVALID_PARAMETER",
  "message": "'pickup_lat', 'pickup_lng', 'dropoff_lat', and 'dropoff_lng' must be valid floats"
}
```

> Note: `fare.amount` is currently each ride type's **base fare only**. It does
> not change with distance or travel time.

### GET /rides/{id}

One ride estimate, by the `id` returned from `GET /rides` (e.g. `uber-x`).

```bash
curl https://booth-declare-workers-queens.trycloudflare.com/rides/uber-x
```

Response `200`:

```json
{
  "id": "uber-x",
  "providerId": "uber",
  "providerName": "Uber",
  "rideType": "Standard",
  "fare": { "currency": "KES", "amount": 120.0 },
  "etaMinutes": 5,
  "capacity": 4
}
```

Unknown id (`curl https://booth-declare-workers-queens.trycloudflare.com/rides/nonexistent-id`) returns `404`:

```json
{ "code": "NOT_FOUND", "message": "No ride estimate found with id 'nonexistent-id'" }
```

---

## Errors

Every failure is JSON with the same two fields, and an HTTP status other than 200:

```json
{ "code": "NOT_FOUND", "message": "Human-readable explanation" }
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_PARAMETER` | Missing/non-numeric coordinates, or a bad `type` / `sort` value |
| 404 | `NOT_FOUND` | No landmark or ride estimate with that `id` |
| 500 | `INTERNAL_ERROR` | The API could not reach or query its database |

If the response is a JSON **array** or an object with `id`, it succeeded; if it
has `code` and `message`, it failed.

---


