# Partner Test Results (Week 7)

## 1. Overview
This document records the results of the partner test exchange for Week 7. Tests were written directly against the `openapi.yaml` contract (RideCompare API) without access to internal implementation details, and executed against the live API server.

---

## 2. Test Execution Summary
* **Total Endpoints Tested:** 5 (`GET /landmarks`, `GET /landmarks/{id}`, `GET /providers`, `GET /rides`, `GET /rides/{id}`)
* **Total Test Cases Executed:** 13
* **Passed:** 11
* **Failed / Issues Surfaced:** 2

---

## 3. Findings & Categorization

### Finding 1: Unhandled Enum Validation Rejections on `GET /rides`
* **Classification:** Real Bug
* **Details:** Partner tests submitted invalid filter query parameters (e.g. `?type=Helicopter` and `?sort=distance`). The OpenAPI contract specifies that values outside the allowed enum lists must return `400 INVALID_PARAMETER`. The server previously returned `200 OK` with an empty array for `type` and ignored invalid `sort` values.
* **Resolution:** Added explicit parameter validation checks in `GET /rides` against allowed enums (`['boda', 'standard', 'xl', 'comfort', 'delivery']` and `['eta', 'fare']`). The server now correctly returns HTTP 400 when invalid values are received.

### Finding 2: `rideType` Property Resolution Fallback
* **Classification:** Real Bug
* **Details:** Partner tests verified that every object in the `GET /rides` response array contained a valid string for `rideType`. Because database column names varied (`vehicle_type` vs `type`), the field mapped as `undefined` on certain test environments.
* **Resolution:** Updated response mapping in `GET /rides` and `GET /rides/:id` to check `row.type || row.vehicle_type`, ensuring contract field compliance across all database setups.

---

