# LiveFit Implementation Todo

## In Progress
- [ ] Clear the local `.next` lock so production builds can run again.

## Next

## Later

## Done
- [x] Stabilize the dashboard data flow with shared TypeScript types.
- [x] Replace placeholder history, workout, and sleep UI with real DB-backed data.
- [x] Fix current lint errors introduced by `any` usage and brittle effect patterns.
- [x] Wire chat image upload to a real file selection and analysis flow.
- [x] Refresh `README.md` so it matches the Next.js + Prisma app instead of the old single-file prototype.
- [x] Add a small chart/analytics view using the existing `/api/analytics` route.
- [x] Persist day type if historical "Rest / Training / Lite" rows should be accurate.
- [x] Add stronger request validation and user-facing API error handling.
- [x] Add tests for dashboard aggregation and API parsing helpers.
