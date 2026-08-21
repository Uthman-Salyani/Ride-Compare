# RideCompare

> **Compare Uber, Bolt, Little, Faras, and Yego side by side — one search, one screen, one tap.**

RideCompare is a web-based ride fare comparison platform built for Nairobi commuters. Instead of opening multiple apps to check prices, users enter a pickup and dropoff location and instantly see fares, ETAs, and seat capacity for all major providers ranked side by side.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Supported Locations](#supported-locations)
- [Providers & Ride Types](#providers--ride-types)
- [Team](#team)

---

## Overview

RideCompare was built as a Web Development coursework project at Strathmore University (ICS-2.1C). The brief required building a frontend web application using React and Tailwind CSS that improves on an existing idea.

The problem it solves: riders in Nairobi open Uber, Bolt, Little, and Faras separately to compare prices — a slow and frustrating process. RideCompare aggregates all providers into one interface, calculates estimated fares using each provider's real pricing formula, and simulates a booking flow.

In the second phase of the project, the mock JSON data layer was replaced with a real **MySQL database** connected via a **Node.js/Express** backend API.

---

## Features

- **Multi-provider fare comparison** — Uber, Bolt, Little, Faras, and Yego Mobility
- **Real pricing formula** — `Total = Base Fare + (Per Km × Distance) + (Per Min × Duration)`
- **Route map preview** — Interactive Leaflet map with pickup/dropoff markers and a dashed route line
- **Vehicle type filter** — Filter by Standard, Comfort, XL, Boda, or Delivery
- **Sort controls** — Sort results by Price, ETA, or Capacity
- **Best value & fastest badges** — Automatically flagged on the cheapest and fastest options
- **Simulated booking flow** — Loading screen, randomly assigned driver, live countdown timer
- **MySQL backend** — All providers, ride types, landmarks, and drivers stored in a real database
- **REST API** — Express backend serves data to the React frontend

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React (Vite) | Component-based UI framework |
| Tailwind CSS | Utility-first styling |
| React Leaflet | Interactive map with OpenStreetMap tiles |
| JavaScript (ES6+) | Logic, async fetch, state management |

### Backend
| Tool | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express | REST API server |
| mysql2 | MySQL database driver |
| cors | Cross-origin request handling |

### Database
| Tool | Purpose |
|---|---|
| MySQL | Relational database for all app data |

---

## Project Structure

```
Ride-Compare/
├── backend/                  # Node.js/Express backend
│   ├── index.js              # Server entry point, DB connection, API routes
│   └── package.json
│
├── src/
│   ├── main.jsx              # React entry point — mounts App into #root
│   ├── App.jsx               # Root component — controls screen/navigation state
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx   # Hero landing screen
│   │   ├── SearchPage.jsx    # Route input form
│   │   ├── ResultsPage.jsx   # Fare comparison results
│   │   └── BookingPage.jsx   # Simulated booking confirmation
│   │
│   ├── components/
│   │   ├── RideCard.jsx      # Single ride option card
│   │   └── RouteMap.jsx      # Leaflet map component
│   │
│   ├── utils/
│   │   └── fareUtils.js      # Fare calculation, route simulation, API fetching
│   │
│   └── styles/
│       └── index.css         # Tailwind directives + global styles
│
├── index.html                # HTML shell — contains <div id="root">
├── vite.config.js            # Vite build configuration
├── tailwind.config.js        # Tailwind content paths
└── postcss.config.js         # PostCSS configuration
```

---

## Database Schema

The MySQL database is named `ridecompare` and contains four tables:

### `providers`
Stores the five ride-hailing providers.
```sql
id        VARCHAR(20)  PRIMARY KEY
name      VARCHAR(50)
color     VARCHAR(10)   -- brand hex colour
bg_color  VARCHAR(10)   -- light background hex colour
```

### `ride_types`
Stores all ride tiers with their pricing parameters.
```sql
id            VARCHAR(50)  PRIMARY KEY
provider_id   VARCHAR(20)  REFERENCES providers(id)
type          VARCHAR(50)
vehicle_type  VARCHAR(20)  -- standard | comfort | xl | boda | delivery
base_fare     DECIMAL(10,2)
per_km        DECIMAL(10,2)
per_min       DECIMAL(10,2)
capacity      INT
eta_min       INT
```

### `landmarks`
Stores Nairobi landmark coordinates used for route calculation and map display.
```sql
id         INT  AUTO_INCREMENT PRIMARY KEY
name       VARCHAR(50)
latitude   DECIMAL(10,7)
longitude  DECIMAL(10,7)
```

### `drivers`
Stores mock drivers assigned during the simulated booking flow.
```sql
id            INT  AUTO_INCREMENT PRIMARY KEY
name          VARCHAR(100)
rating        DECIMAL(2,1)
plate         VARCHAR(20)
car           VARCHAR(100)
vehicle_type  VARCHAR(20)
```

---

## API Endpoints

The backend runs on `http://localhost:3001`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/providers` | Returns all 5 providers |
| GET | `/api/ride-types` | Returns all 17 ride types with pricing |
| GET | `/api/landmarks` | Returns all 31 Nairobi landmarks |
| GET | `/api/drivers/:vehicleType` | Returns a random driver matching the vehicle type |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL (v8+)

### 1. Clone the repository
```bash
git clone https://github.com/Uthman-Salyani/RideCompare.git
cd RideCompare
```

### 2. Set up the database
Start MySQL and run the following:
```sql
CREATE DATABASE ridecompare;
USE ridecompare;
```
Then create the four tables and insert the seed data as defined in the [Database Schema](#database-schema) section above.

### 3. Configure the backend
Open `backend/index.js` and update the database connection with your MySQL credentials:
```js
const db = mysql.createConnection({
  host:     'localhost',
  user:     'root',
  password: 'your_password_here',
  database: 'ridecompare'
})
```

### 4. Start the backend
```bash
cd backend
npm install
node index.js
```
You should see:
```
🚀 Backend running at http://localhost:3001
✅ Connected to MySQL database
```

### 5. Start the frontend
Open a new terminal tab:
```bash
cd ..
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## How It Works

### Fare Calculation
Every fare is calculated using the standard ride-hailing pricing formula:

```
Total Fare = Base Fare + (Per Km Rate × Distance) + (Per Min Rate × Duration)
```

Distance is calculated using the **Haversine formula** between two landmark coordinates, then increased by 20% to account for road routing (roads are never straight lines). Duration is estimated at 3.5 minutes per kilometre, with a minimum of 5 minutes.

### Route Simulation
Since the app has no access to real provider APIs, all data is simulated:
- Landmark coordinates are stored in MySQL and used to calculate real geographic distances
- Pricing parameters are based on approximate real-world Nairobi rates
- Drivers are randomly assigned from a pool matched by vehicle type

### Navigation
The app uses a simple screen state in `App.jsx` (`landing` → `search` → `results` → `booking`) instead of a URL router, keeping the architecture beginner-friendly.

---

## Supported Locations

The following Nairobi areas are recognised for route calculation and map display:

Westlands, CBD, Kilimani, Karen, Eastleigh, Lavington, Parklands, Upperhill, Gigiri, Runda, Ruaka, Thika Road, Ngong Road, South B, South C, Kileleshwa, Langata, Embakasi, Kasarani, Roysambu, Kahawa West, Donholm, Umoja, Buruburu, Kitengela, Syokimau, Mombasa Road, JKIA, Galleria, Two Rivers, Village Market

---

## Providers & Ride Types

| Provider | Ride Types |
|---|---|
| **Uber** | Uber Chapchap, Uber Comfort, UberXL, UberBoda, Uber Connect |
| **Bolt** | Bolt Standard, Bolt XL, Bolt Boda, Bolt Send |
| **Little** | Little Standard, Little Comfort, Little XL |
| **Faras** | Faras Standard, Faras Boda, Faras Delivery |
| **Yego Mobility** | YEGO Boda, YEGO Delivery |

---

## Team

Built by the ICS-2.1C Web Development group at Strathmore University.

- **Uthman Salyani** — [@Uthman-Salyani](https://github.com/Uthman-Salyani)
- **Edenmike Mwaura** — [@GT_MRE](https://github.com/GT_MRE)
- **Ashley Akinyi** — [@itsashleyakinyi](https://github.com/itsashleyakinyi)
- **Joy Gatimu** — [@joy-gatimu](https://github.com/joy-gatimu)

---

*This project is for educational purposes. Fare estimates are simulated and do not reflect real-time pricing from any provider.*