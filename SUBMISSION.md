# Submission Notes

## Summary

Implemented the Issue #37 inspection workflow across the NestJS API and React
frontend. Managers can create and assign inspections and view the full list;
Inspectors see only their own assignments and can record a location, start time,
duration, result, and comments to complete an inspection. Added service tests
for role-scoped listing, assignment, ownership, and completion behavior.

Validation: `npm run test --workspace backend` passed (6 tests); `npm run build`
passed. `npm run lint --workspace backend` could not run because the starter
repository has no ESLint configuration.

## Assumptions

- Duration is a positive whole number of minutes.
- Inspections are created without a location; the assigned Inspector records the location when completing the inspection.
- Only inspections in `Yet to Start` can be assigned or completed. Completed inspections cannot be reassigned or completed again.
- Start times are submitted as ISO 8601 timestamps.

## Trade-offs / Known Limitations

- The UI is a simple Bootstrap workflow with no pagination, filtering, or editing after completion.
- The starter project's MySQL configuration and `synchronize: true` behavior are unchanged.
- Assignment and completion do not use database locking for concurrent requests.

## Security Notes

- All inspection routes require JWT authentication. Manager-only mutations use the existing role guard; completion is Inspector-only.
- The list query filters Inspectors by their authenticated user ID. Completion checks the stored assignee against the authenticated ID and returns not-found for non-owned inspections. Client-supplied identity or role values are never used.

## AI Usage

- Used an AI assistant through Copilot SDK in VS Code to help implement the API, UI, tests, and assessment notes.
- Reviewed the existing conventions and requirements, checked the resulting authorization and workflow logic, and ran the backend tests and full build.

## What I Would Improve With More Time

- Add end-to-end tests against a test database, and consider locking or conditional updates to protect against simultaneous completion requests.
- Add API documentation and workflow feedback/confirmation states.
