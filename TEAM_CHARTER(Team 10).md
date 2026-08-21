# Team Charter - Team 10

Repository: https://github.com/Uthman-Salyani/Ride-Compare.git

## 1. Team Members & Roles

| Team Member | Role |
| --- | --- |
| Edenmike Mwaura Ruhanga | API Lead |
| Uthman Salyani | Backend Dev |
| Joy Gatimu | Integration/QA Lead |
| Ashley Akinyi | Docs/DevOps Lead |

*Roles rotate every 4 weeks.*

## 2. App Summary

RideCompare is a web-based ride fare comparison platform for Nairobi commuters. Instead of checking Uber, Bolt, Little, Faras, and Yego separately, users enter a pickup and dropoff location and see fares, ETAs, and seat capacity for all providers ranked side by side, using each provider's real pricing formula. The app is built with React/Tailwind on the frontend and a Node.js/Express + MySQL backend.

## 3. Resource & Action Audit

**Part B: Auditing your App - RideCompare**

### a) What the app stores

1. Landmarks - locations in Nairobi, e.g. CBD, Karen
2. Drivers
3. Providers - Uber, Bolt, etc.
4. Ride types - Boda, XL, Standard, etc.
5. Routes/searches - a pickup and dropoff location a user enters

### b) Every action a user can take on those things

1. Entering pickup and dropoff locations
2. Comparing prices among different providers
3. Booking a ride
4. Filtering results by ride type, such as Standard or Boda
5. Viewing a route preview on the map, including pickup and dropoff markers and the route line
6. Sorting results by price, ETA (Estimated Time of Arrival), or capacity
7. Viewing booking confirmation, including the assigned driver and countdown

## 4. Ring Position

- Upstream partner (we consume their API): Team 9
- Downstream partner (they consume our API): Team 11