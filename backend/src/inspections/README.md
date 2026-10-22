# Inspections Module

Inspections are created in the `Yet to Start` state. Managers can list all
inspections, create them with an assigned Inspector, and reassign them to one
Inspector. Inspectors only receive their own assigned inspections and can
complete each one once.

The API is protected by JWT authentication:

- `GET /inspections` — list all inspections for Managers or assigned inspections
  for Inspectors
- `POST /inspections` — create an inspection with `{ "inspectorId": 1 }` (Manager)
- `PATCH /inspections/:id/assign` — assign an Inspector (Manager)
- `PATCH /inspections/:id/complete` — record completion (assigned Inspector)

Duration is recorded in whole minutes. The location and completion details are
recorded when the Inspector completes the inspection.
