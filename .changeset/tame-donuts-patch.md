---
"@aarvay/pi-synthetic-provider": patch
---

Truncate error response bodies from the /models fetch to 200 characters so
failures stay readable, and mark `pricing` optional in the response type to
match the defensive parsing already in place.
