# aether-ai-orchestration

> **Status: Initial pure run-state transition validator is in review.** No durable orchestration runtime or production deployment is implemented.

## Purpose

Coordinates jobs, workflow steps, agent runs, retries, cancellation, concurrency, and recovery.

## Responsibility boundary

Execution coordination and durable state transitions; not a model provider.

## Dependencies

aether-ai-workflows, aether-ai-agents, aether-ai-queue, aether-ai-database, aether-ai-observability.

## Project rules

- No implementation starts until the documentation and cross-repository contracts are reviewed.
- Do not commit secrets, API keys, user data, or production credentials.
- Public interfaces, security decisions, and non-obvious implementation choices must be documented.

## Initial implementation

The draft package models allowed run lifecycle transitions, explicit approval pause/resume events, bounded retry attempts, and optimistic version checks. It is a pure decision helper only: it does not persist state, enforce leases, authorize users, provide exactly-once delivery, recover crashes, or make tool side effects idempotent. The state model remains subject to the orchestration ADRs.

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

## Before coding

Read the project specification, architecture, contracts, implementation plan, and work log. Update the docs in the same change whenever behavior, an API contract, a dependency, or a security boundary changes.
