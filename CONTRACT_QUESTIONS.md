# Contract Questions — Upstream Partner (Team 9, Mental Health App Events API)

## 1. `GET /events/{id}` — missing `required` list on the response schema

The list endpoint `GET /events` marks `id, title, location, startTime, cancelled` as `required` on each item. But the single-item response schema for `GET /events/{id}` has no `required` array at all — every field, including `id`, `title`, and `cancelled`, is technically optional per the schema.

**Question:** Is `GET /events/{id}` guaranteed to return the same required fields as the list endpoint, or can any of them legitimately be missing on a single-event fetch? If they're always present, please add the same `required` block so we don't have to null-check fields that will never actually be null.

## 2. `PATCH /events/{id}` success response is missing `description`

Every other event object in the spec (the list, the single GET, and the POST response) includes a `description` field. The `200` response schema for `PATCH /events/{id}` only lists `id, title, location, startTime, cancelled` — `description` isn't there.

**Question:** Is `description` intentionally dropped from the update response, or was it just left out of the schema by mistake? We need to know whether we should expect `description` back after a PATCH, since we'd cache it from the initial GET otherwise.

## 3. No pagination or limit on `GET /events`, and no documented empty-result behavior

`GET /events` returns a plain array with only the optional `after` date filter — no `limit`, `page`, or `cursor` parameter, and no note on a maximum array size or how a request with zero matching events responds (e.g., `200` with `[]`, or something else).

**Question:** As your event list grows over the semester, will `GET /events` still return the full unpaginated list, and can we confirm an empty result is a `200` with an empty array rather than a `404` or an error? We're using this endpoint to populate ride destinations, so an unbounded response size affects how we build our polling/caching logic on our side.

s