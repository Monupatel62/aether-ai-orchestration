# Dependencies and contracts — aether-ai-orchestration

**Status:** proposed contract; no API implementation exists yet.

## Contract area

Durable run state machine, queue event envelope, step lease, cancellation and retry contract.

## Direct dependency contracts

- `aether-ai-workflows`: versioned workflow definition and validation contract only; orchestration owns scheduling and execution.
- `aether-ai-agents`: versioned agent execution contract; agents do not depend on orchestration.
- `aether-ai-queue`: neutral versioned envelope and delivery/lease semantics; queue must not import orchestration.
- `aether-ai-database`: public persistence/tooling contracts only; do not couple orchestration to private database implementation internals.
- `aether-ai-security`: shared policy/security contract for authorizing run and step actions.
- `aether-ai-observability`: low-level telemetry interfaces; observability must not import orchestration.

These are intended contract relationships, not proof that each dependency is a package import or separate runtime service. The edge type must be recorded explicitly in the master dependency matrix before implementation.

## Required rules

Define run/step states, versioned event schema, idempotency, duplicate delivery, lease expiry, recovery, concurrency caps, and terminal-state invariants.

## Contract governance

- The [master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md) is the canonical dependency map.
- Public REST endpoints require OpenAPI definitions, versioning, stable error codes, and compatibility tests.
- Events require a schema version, event/run ID, timestamp, correlation ID, tenant/principal scope where appropriate, and explicit retry/idempotency semantics.
- Package interfaces must distinguish public stable exports from internal implementation details.
- No service may read another service's private tables or import downstream application internals.
- Any breaking change must include consumer inventory, migration notes, staged rollout/rollback plan, and an update to affected repository specs.
- Provider/model differences must be surfaced as capabilities; do not claim all models support the same features.
- Never expose provider credentials or raw sensitive upstream errors to browsers or ordinary logs.

## Review checklist

- [ ] Inputs, outputs, errors, payload limits, timeout and rate-limit behavior defined.
- [ ] Authentication, authorization, and tenant boundary defined.
- [ ] Retries, cancellation, duplicate requests, and side effects defined.
- [ ] Correlation IDs and redaction rules defined.
- [ ] Unit and integration tests cover success and failure cases.
- [ ] Rollout, rollback, and compatibility plan documented.
