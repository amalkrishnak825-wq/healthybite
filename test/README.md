# HealthyBite unit tests

These executable JavaScript tests use Node's built-in `node:test` and `assert` modules, like the test files in the reference image. They cover pure client validation/formatting helpers and backend validation, query, and meal-availability rules. They need no MongoDB or external service credentials.

Run from this folder with `npm test`, or from the repository root with `npm --prefix test test`.

Tests live under `unit/client` and `unit/server`. Add new unit tests next to the relevant feature. These are unit tests, not full browser or database integration tests.
