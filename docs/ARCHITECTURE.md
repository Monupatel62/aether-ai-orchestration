# Architecture: aether-ai-orchestration

**Status:** proposed design, not implemented.

## Role in the system

Owns the single durable run/step lifecycle: persisted transitions, scheduling decisions, attempts, cancellation coordination, leases/fencing, crash recovery, and reconciliation of uncertain side effects. It does not implement model-provider APIs or tool business logic.

## Dependencies

Consumes the workflow-definition contract from `aether-ai-workflows`, bounded agent-execution contracts from `aether-ai-agents`, transport primitives from `aether-ai-queue`, persistence primitives from `aether-ai-database`, security/authorization contracts from `aether-ai-security`, and redacted telemetry contracts from `aether-ai-observability`.

The queue transports wake-up/work messages but is not run-state authority. Database tools provide persistence primitives; Orchestration owns the meaning of run/step state. Agents must not create a reverse dependency by calling orchestration internals. Exact package, API, event and deployment edges remain proposals until their contracts and ADRs are accepted.

## Data and control flow

1. The API or another authorized caller submits a run through the documented boundary; trusted identity and tenant/resource authorization are resolved by the owning security/API contract.
2. Orchestration validates the public request and its version, assigns stable run identity, and records the accepted state durably before claiming durable acceptance.
3. Eligible work is dispatched through a versioned queue envelope. A message is a wake-up signal, not proof of authorization or current run state.
4. A worker claims a step using a persisted lease/version/fencing mechanism. Stale workers must not commit after a newer owner takes over.
5. Before every delayed or sensitive side effect, the current principal/run and target resource are reauthorized. Workflow validation at publish time does not grant permission to execute later.
6. State changes use atomic version/state checks and durable event deduplication. Retries are bounded and side effects declare idempotency/reconciliation behavior.
7. Cancellation prevents new scheduling after intent is committed; in-flight remote effects are stopped or reconciled. Uncertain outcomes must not be blindly replayed.
8. Structured lifecycle events carry correlation IDs and bounded, redacted metadata. Observability is not the source of truth for run state.

## State and recovery invariants

- One authoritative durable run/step state machine; the API and Agents do not maintain competing durable run ledgers.
- Terminal states are immutable through ordinary queue/worker messages.
- A run cannot succeed while a required step remains unresolved.
- Queue delivery is assumed at-least-once unless an accepted adapter contract proves a different guarantee.
- Local database transactions do not promise exactly-once effects in remote systems.
- If a side effect may have occurred and no safe idempotency or reconciliation contract exists, block replay and record an outcome requiring reconciliation.
- Unknown event/schema versions fail closed with bounded diagnostics.
- Lease, retry, concurrency and retention values remain open until approved and tested.

## Boundary rules

- No circular imports or runtime dependency on downstream consumers.
- Cross-repository communication uses versioned HTTP/OpenAPI, typed package contracts, or documented event envelopes; never read another service's private tables or import private implementation internals.
- Credentials remain server-side and must not appear in queue payloads, logs, traces, or client-visible errors.
- Treat model output, uploaded files, external connector output, MCP metadata, workflow definitions, and queue messages as untrusted data.
- Tenant membership/role-grant ownership remains unresolved in ADR-0021; do not infer canonical authority from this component's dependency list.

## Proposed deployment shape

Start with a small, testable module/service boundary. A repository does not itself justify a separately deployed service. Select the runtime shape only after the architecture and operational ADRs are reviewed.

## Failure behavior

Document and test malformed or stale events, authorization revocation, duplicate deliveries, idempotency-key conflicts, concurrent claims, stale worker writes, process crashes before/after remote side effects, lease expiry, queue/database outages, retry exhaustion, cancellation races, and partial/uncertain results.

## Diagrams

The master end-to-end component graph lives in [the repository catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md). Keep that graph and this document synchronized whenever an ownership or dependency decision changes.
