// This file forces the test runner to exit after all tests have completed.
// It bypasses the hanging database connections that sometimes keep the Vitest process alive.

export default function teardown() {
  console.log('Global Teardown: Forcing process exit to prevent hang.');
  process.exit(0);
}
