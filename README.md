# aether-ai-orchestration

> **Status: Documentation phase.** No application code or production deployment has been started in this repository.

## Purpose

Coordinates durable runs, workflow steps, retries, cancellation, concurrency, and recovery.

## Responsibility boundary

Owns the authoritative durable run/step state machine and idempotency/recovery contract. A queue transports work notifications; it is not the state authority. Workflows defines and statically validates graph definitions; Agents owns bounded agent execution and must not depend back on Orchestration.

## Dependencies

Consumes contracts/primitives from `aether-ai-workflows`, `aether-ai-agents`, `aether-ai-queue`, `aether-ai-database`, `aether-ai-security`, and `aether-ai-observability`. The exact package/API/event edges and runtime topology remain subject to review; this list does not select queue/database vendors.

## Project rules

- No application implementation until cross-repository contracts and the Phase 0 gate have been reviewed and explicitly approved.
- Do not commit secrets, API keys, user data, or production credentials.
- Public interfaces, security decisions, and non-obvious implementation choices must be documented.

## Documentation

- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture and connections](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan and acceptance criteria](docs/IMPLEMENTATION_PLAN.md)
- [Research and license notes](docs/RESEARCH_AND_LICENSES.md)
- [Repository-specific technical design and test plan](docs/TECHNICAL_DESIGN.md)
- [Repository-specific security review checklist](docs/SECURITY_REVIEW.md)
- [Engineering and commenting standard](docs/ENGINEERING_STANDARD.md)
- [Work log and decisions](docs/WORKLOG.md)
- [Master 33-repository catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
- [Continuity handoff for new chats](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/WORK_HANDOFF.md)

## Before implementation

Resolve the durable run-state contract, event schema/version policy, deduplication/outbox strategy, worker lease/fencing model, cancellation/reconciliation behavior, current authorization authority, operational limits, and applicable acceptance tests. Review open ADRs and obtain explicit approval to leave Phase 0.
