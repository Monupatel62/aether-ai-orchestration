# aether-ai-orchestration

**Status:** Initial deterministic run state machine implemented on a feature branch. Durable orchestration is not implemented.

## Implemented

- [State machine](src/index.js): explicit run transitions, owner/system command context, version compare checks, terminal-state immutability, cancellation acknowledgment and safe terminal race handling.
- [Unit tests](test/orchestration.test.js): normal transitions, cancellation, stale versions, unauthorized actors, invalid transitions, terminal states, and idempotent cancellation.
- Dependency-free Node.js package with Node 20/22 CI.

## Important limitations

This is a pure state-transition helper. It does not persist runs, provide distributed compare-and-swap, schedule queue jobs, implement outbox/inbox delivery, execute agent steps, or recover after crashes. Production integration must enforce actor identity at the calling boundary and persist transitions atomically with version checks; the caller must not allow clients to set trusted system-command fields.

## Documentation

- [Repository specification](docs/REPOSITORY_SPECIFICATION.md)
- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
