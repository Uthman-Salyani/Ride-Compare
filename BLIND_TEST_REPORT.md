# Blind Test Report — Week 8

## Setup
-  Team: Team 10 (RideCompare API)
- Team who tested our README: Team 5 
- How our API was reached: hosted from a laptop through a temporary Cloudflare tunnel (`https://booth-declare-workers-queens.trycloudflare.com`).

## 1. What happened when the README was tested
- **Did they get a successful response?** Yes. The testing team reported that everything worked.
- **Where did they get stuck?** They reported no problems and did not need to message me. TODO: add anything they mentioned in passing, such as a step that felt slow or unclear.
- **What they called:** the quickstart `GET /rides` request, then other endpoints

We gave them only the README and the base URL, with no verbal explanation.

## 2. What was fixed and what we're flagging
**Gaps we did not close:**
- The hosted URL is a temporary tunnel. It only works while our backend is running and the tunnel is running, and the URL changes whenever the tunnel restarts.
- The repository contains no SQL seed file, so the "Run it yourself" section relies on sample data I wrote into the README rather than an export of the real database. The other team did not test that section (TODO: confirm they used the hosted URL and not the local setup).
- Example ids in the README (`uber-x`, `bolt-boda`) come from the contract. TODO: confirm they match real ids in the database, or list what differs.


## 3. Honest summary
The other team followed the README and reported that everything worked, without asking  any questions. That suggests the quickstart and endpoint examples were clear enough for a reader with no prior context.