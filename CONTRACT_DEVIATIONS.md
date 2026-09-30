## Week 6 — POST /landmarks added

**Change:** Added `POST /landmarks` write endpoint to the contract.

**Reason:** Required by the Week 6 lab to implement at least one write
endpoint with input validation.

**Fields added to contract:**
- `NewLandmark` schema (request body for POST)
- `409 Conflict` response for duplicate landmark names
- `400 Bad Request` with three distinct error cases:
  missing fields, wrong type, coordinates out of Nairobi range

**Impact on partners:** None. Voter Edu (Team 11) only consumes GET
endpoints. `POST /landmarks` is an internal data management endpoint
and is not part of the partner integration surface.

---

## All other endpoints

No deviations. All database records from MySQL are explicitly mapped
and type-cast to conform strictly to the OpenAPI contract schema.
