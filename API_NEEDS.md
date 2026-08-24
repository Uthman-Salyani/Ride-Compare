# API Needs — Team 10 (RideCompare)

## Part A: Downstream Partner Interview — Team 11 (Voter Edu)

**1. What data or actions from RideCompare would actually be useful to you?**
Voter Edu wants to help users figure out how to physically get to their polling station. They're interested in our landmark list (so they can map a polling station to a recognizable place name), fare comparisons for a pickup→dropoff pair, and ETA data.

**2. Would you ever need to create or change data in our system, or only read it?**
Read-only. Voter Edu never books a ride through their app — they just display an estimated cost and time so a voter can plan ahead for when they want to go to a polling station.

**3. How often would you need this?**
They would need it on-demand, as a voter would want to know how they can get to their polling station. They flagged that this could spike sharply on election-day mornings as voters would want to arrive early to get ahead of the long queues.

**4. Is there anything about our app you assumed you could access that actually isn't there?**
They initially assumed they could pull live driver/vehicle counts near a location. We clarified RideCompare only exposes fare/ETA/capacity estimates per search, not live driver availability as it is not a resource we store.

## Part B: Upstream Partner Interview — Team 9 (Mental Health Support App)

**1. What resources or data does your app manage that we might use?**
Events (community/wellness events).

**2. What can we actually do with it — just read, or also create/update/delete?**
Read-only. Create/edit/delete on Events is admin-only on their side.

**3. Is there anything sensitive or restricted we shouldn't expect access to?**
Yes — user profiles, appointment bookings, and discharge records are restricted. Only public Event fields (title, date, location) are exposed externally.

**4. How up-to-date is the data likely to be when we fetch it?**
Events are updated within the hour, not real-time.

## Part C: API Needs Statements (Team 11 consuming RideCompare)

1. **Voter Edu needs to read the list of Nairobi landmarks in order to** let users identify their nearest polling station using recognizable place names for example uisng Langata instead of  its raw coordinates.
   - Freshness: static
   - Volume: once per polling-station lookup flow.
   - Auth: not sensitive, no login required.

2. **Voter Edu needs to read fare and ETA estimates for a given pickup–dropoff pair across providers in order to** show users the cheapest and fastest way to reach their polling station on election day.
   - Freshness: near real-time (traffic/surge-sensitive) — a few minutes' staleness is tolerable.
   - Volume: once per user search; expect a heavy spike on election-day mornings.
   - Auth: not sensitive, but should be rate-limited given the expected spike.

3. **Voter Edu needs to filter ride results by ride type (e.g., Boda vs. Standard) in order to** surface the most affordable option for different types of voters such as those who are on a tight-budget.
   - Freshness: near real-time as it could be traffic or surge sensitive particularly on election days.
   - Volume: Once per user search
   - Auth: none.

4. **Voter Edu needs to sort ride results by ETA in order to** warn users if they might not reach their polling station before polls close.
   - Freshness: real-time.
   - Volume: Once per user search
   - Auth: none.

## Part D: Sanity Check Against Week 1 Audit

| Needs statement | Maps to Week 1 audit item |
|---|---|
| #1 Landmarks | "Landmarks" (resource) |
| #2 Fares/ETA for a route | "Routes/searches", "Comparing prices among providers" |
| #3 Filter by ride type | "Filtering results by ride type" |
| #4 Sort by ETA | "Sorting results by price, ETA, or capacity" |

No gaps — every statement maps cleanly to something we already audited. On the other side, several Week 1 audit items (booking a ride, viewing booking confirmation with driver/countdown, map route preview) map to **no** needs statement as Voter Edu never books through us, so those simply won't become part of this API.

## Part E: Reflection

We were surprised that our app and Voter Edu were compatible API partners as we assumed they would have no link to each other. Once we asked specific questions, a use case emerged (estimating the cost/time to reach a polling station) and every need it generated was read-only.
On the upstream side, we were surprised by how tightly Team 9 restricts anything patient-related — it confirmed that when we design our own consumption of their API next, we should plan around public Event data only, not assume we'll ever get doctor-patient details as those are confidential.
