# RideCompare API

RideCompare is a read-only REST API that compares ride options in Nairobi across
providers (Uber, Bolt, Little, ...) and ride types (Boda, Standard, XL, Comfort,
Delivery). It is built for partner apps (such as Voter Edu) that want to show a
user the available rides, fares and ETAs between two points, without booking
anything. Every endpoint is a `GET` and every response is JSON.



Base URL: `https://booth-declare-workers-queens.trycloudflare.com`

Opening the base URL on its own in a browser shows `Cannot GET /`. That is expected: the API has no home page. Add an endpoint path, for example `/providers`.

> This is a temporary public address that only works while the API host has the server running. If every request fails or times out, the host's server is offline. In that case, use the "Run it yourself" section at the bottom.

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

## Run it yourself (optional)

Use this only if the hosted URL above is not responding. It runs the API on your own machine at `http://localhost:3001`; use `http://localhost:3001` in place of the base URL in every example above.

Prerequisites: Node.js 18+ and MySQL 8 running locally.

### 1. Get the code and install the backend

```bash
git clone https://github.com/Uthman-Salyani/Ride-Compare.git
cd Ride-Compare/backend
npm install
```

(The API lives in the `backend/` folder. You do not need the React frontend in the
repo root to use the API.)

### 2. Create the database and tables

Open a MySQL shell (`mysql -u root -p`) and paste the whole block below. It is safe
to run more than once.

```sql
CREATE DATABASE IF NOT EXISTS ridecompare;
USE ridecompare;

CREATE TABLE IF NOT EXISTS providers (
  id        VARCHAR(20) PRIMARY KEY,
  name      VARCHAR(50),
  color     VARCHAR(10),   -- brand hex colour
  bg_color  VARCHAR(10)    -- light background hex colour
);

CREATE TABLE IF NOT EXISTS ride_types (
  id            VARCHAR(50) PRIMARY KEY,
  provider_id   VARCHAR(20),
  type          VARCHAR(50),
  vehicle_type  VARCHAR(20),   -- standard | comfort | xl | boda | delivery
  base_fare     DECIMAL(10,2),
  per_km        DECIMAL(10,2),
  per_min       DECIMAL(10,2),
  capacity      INT,
  eta_min       INT,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS landmarks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(50) UNIQUE,
  latitude   DECIMAL(10,7),
  longitude  DECIMAL(10,7)
);

-- Used only by RideCompare's internal booking flow (not exposed by this API)
CREATE TABLE IF NOT EXISTS drivers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100),
  rating        DECIMAL(2,1),
  plate         VARCHAR(20),
  car           VARCHAR(100),
  vehicle_type  VARCHAR(20)
);
```

### 3. Load the sample data

Still in the MySQL shell, paste this. These rows produce exactly the responses
shown in the examples above.

```sql
INSERT IGNORE INTO providers (id, name, color, bg_color) VALUES
  ('uber',   'Uber',   '#000000', '#F3F3F3'),
  ('bolt',   'Bolt',   '#34D186', '#E8F9F1'),
  ('little', 'Little', '#FF6B00', '#FFF1E6');

INSERT IGNORE INTO ride_types
  (id, provider_id, type, vehicle_type, base_fare, per_km, per_min, capacity, eta_min) VALUES
  ('uber-x',    'uber', 'Standard', 'standard', 120.00, 30.00, 5.00, 4, 5),
  ('bolt-boda', 'bolt', 'Boda',     'boda',      41.00, 15.00, 2.00, 1, 3);

INSERT IGNORE INTO landmarks (name, latitude, longitude) VALUES
  ('westlands', -1.2676000, 36.8123000),
  ('cbd',       -1.2833000, 36.8172000);
```

### 4. Start the API

From the `backend/` folder, copy the example settings file:

```bash
cp .env.example .env
```

Open `.env` and set `DB_PASSWORD` to your MySQL root password (leave it empty if
your root user has no password). The other defaults are fine:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ridecompare
PORT=3001
```

Then start the server:

```bash
node index.js
```

You should see `Backend running at http://localhost:3001` and
`Connected to MySQL database (ridecompare)`. If you see `Database connection failed`,
fix your `.env` credentials and restart.

Check it works:

```bash
curl http://localhost:3001/providers
curl http://localhost:3001/landmarks/1
```

You should see the providers list and the `westlands` landmark. If you see `[]`,
the sample data in step 3 was not loaded. If you see a `500 INTERNAL_ERROR`, the
API cannot reach the database.
