# Durable Run-State and Recovery Contract

**Status:** proposed contract for review; not implemented or approved for production.
**Scope:** orchestration-owned run/step lifecycle, worker ownership, recovery, cancellation, and terminal-state invariants.
**Decision boundary:** this document does not select a queue, database schema, lease duration, retry count, deployment topology, or canonical tenant-membership owner. ADR-0021 remains unresolved.

## 1. Ownership

Orchestration owns the durable lifecycle of a run and its steps: validating requested transitions, scheduling eligible work, recording attempts, coordinating cancellation, and recovering abandoned work.

- Workflows owns the versioned workflow definition and static validation of its graph.
- Agents owns agent execution behavior and its own agent-facing contract; it must not call back into Orchestration through a reverse dependency.
- Queue transports versioned messages and may deliver them more than once. A queue message is not proof of current authorization or current run state.
- Database provides persistence primitives. Orchestration owns the meaning of run-state transitions, not a cross-repository private-table contract.
- Observability receives bounded, redacted lifecycle events; it is not the source of truth for run state.
- Tools and integrations own their external side-effect idempotency and approval requirements. Orchestration cannot promise exactly-once effects for a remote system.

## 2. Proposed state model

The following is a design vocabulary, not a finalized enum or database schema.

### Run states

- `accepted`: request passed input/schema checks and a durable run identity was assigned.
- `queued`: the run is eligible for scheduling.
- `running`: at least one step is actively owned by a valid worker lease.
- `waiting`: progress requires an external event, approval, or other explicitly represented condition.
- `cancelling`: cancellation was accepted and no new work should be scheduled; in-flight work is being stopped or reconciled.
- `succeeded`: all required steps completed and the terminal result was durably recorded.
- `failed`: the run reached a terminal failure according to its declared failure policy.
- `cancelled`: cancellation is complete and outstanding work has been stopped or safely accounted for.
- `needs_reconciliation`: an external side effect may have occurred but its outcome cannot safely be inferred; automatic replay is blocked until reconciled.

Terminal states are `succeeded`, `failed`, and `cancelled`. `needs_reconciliation` is a blocked operational state, not permission to retry blindly.

### Transition rules

1. Transitions are validated against the current persisted state and version, not client-supplied status fields.
2. A transition must be atomic with its version check (compare-and-swap, conditional update, or equivalent transaction).
3. Invalid, stale, duplicate, or out-of-order transitions are rejected or returned as an already-applied result only when the same idempotent operation can be proven.
4. Terminal states are immutable through ordinary worker messages. Any administrative repair requires a separate privileged, audited operation.
5. A run cannot become `succeeded` while a required step remains incomplete, failed, cancelled, or unresolved.
6. A step cannot start until its prerequisites have completed successfully and the current policy/authorization check permits the action.
7. Cancellation and completion races must resolve through persisted transition ordering; an acknowledgement alone must not overwrite a newer state.
8. A malformed or unknown schema version fails closed and is quarantined or rejected with bounded diagnostics.

## 3. Durable identity and idempotency

Every run, step, attempt, transition command, and queue event needs a stable identifier with documented scope. Proposed minimum fields for an event envelope:

- `schema_version`
- `event_id` and `event_type`
- `run_id`, and `step_id` when applicable
- `attempt_id` or monotonically increasing attempt number
- `created_at` and correlation/trace identifier
- tenant/principal scope only where defined by the approved identity contract
- expected run/step version or fencing token when applicable
- bounded payload reference or typed payload; no credentials or unbounded raw model output

Deduplicate event processing by durable event identity and atomically record the processing outcome with the state change, using an inbox or equivalent. If queue acknowledgement and database commit cannot be atomic, document the delivery strategy and recovery behavior.

An idempotency key is scoped to the authenticated caller and operation, bound to canonical request parameters, and retained for a declared window. Reuse with different parameters is rejected. Authorization is checked before returning a cached result. A local transaction cannot guarantee exactly-once behavior for an external side effect.

## 4. Worker lease, fencing, and crash recovery

- A worker may mutate a running step only while its lease is valid and its fencing/version token is current.
- Lease expiry permits recovery to consider work abandoned; it does not prove that a previous worker's external side effect did not happen.
- A stale worker must be prevented from committing a state update after a newer owner has taken over.
- Recovery scans are bounded, repeatable, observable, and safe to run concurrently.
- Before re-enqueueing an interrupted step, recovery checks durable state, attempt budget, cancellation state, and side-effect replay policy.
- If an external action may have happened and no reliable idempotency/reconciliation contract exists, move to `needs_reconciliation` rather than replaying it.
- Retry policies define eligible errors, maximum attempts, total elapsed-time budget, backoff with jitter, and terminal handling. Retry exhaustion must be durable and must not spin indefinitely.
- Queue/database outages must not cause unbounded in-memory buffering or report success before durable state is committed.

Lease duration, heartbeat cadence, recovery interval, and retry budgets remain configuration decisions requiring load/failure testing.

## 5. Cancellation semantics

Cancellation is a request to stop future progress, not proof that an in-flight remote action was reversed.

1. Authenticate and authorize the cancellation request against the current resource and caller context.
2. Atomically record cancellation intent and move the run to `cancelling` unless it is already terminal.
3. Stop scheduling new steps and signal active workers using a documented cancellation mechanism.
4. Each worker checks cancellation before beginning a side effect and before committing step completion.
5. For a side effect already submitted remotely, use that integration's cancellation or reconciliation contract; do not claim rollback unless confirmed.
6. Mark `cancelled` only after outstanding work is stopped or safely accounted for. Use `needs_reconciliation` when outcome uncertainty prevents a safe terminal conclusion.
7. Repeated cancellation requests are idempotent and return the durable current outcome.

## 6. Authorization and tenant isolation

Every state-changing command and every resumed/queued action must be authorized using the current approved identity and resource-access contract. Enqueue-time authorization is not sufficient for delayed execution. Validate tenant/resource scope at the consumer before side effects; do not trust a queue envelope's tenant or principal fields by themselves.

This document does not decide which repository owns canonical workspace membership or role grants. ADR-0021 remains open; do not infer ownership from Orchestration's dependency list. Until that decision is approved, the implementation gate must identify the authoritative authorization contract before any cross-tenant behavior is implemented.

## 7. Required acceptance scenarios

These are proposed contract tests; no runtime tests are claimed to exist.

| ID | Scenario | Required outcome |
| --- | --- | --- |
| ORCH-RUN-01 | Duplicate delivery of the same event | One durable transition; duplicate is harmless |
| ORCH-RUN-02 | Same idempotency key with changed parameters | Reject; no second action |
| ORCH-RUN-03 | Two workers claim the same step concurrently | Only current fenced owner may commit |
| ORCH-RUN-04 | Old worker returns after lease takeover | Stale write rejected |
| ORCH-RUN-05 | Crash after local state commit before queue ack | Redelivery is deduplicated safely |
| ORCH-RUN-06 | Crash after external side effect with unknown outcome | No blind replay; reconcile or block |
| ORCH-RUN-07 | Attempt to skip a prerequisite step | Reject without scheduling dependent action |
| ORCH-RUN-08 | Attempt to mutate a terminal run via worker message | Reject or return immutable terminal result |
| ORCH-RUN-09 | Cancel races with step completion | One consistent persisted outcome; no false rollback claim |
| ORCH-RUN-10 | Cancellation while queued | No new step begins after cancellation is committed |
| ORCH-RUN-11 | Retryable failure reaches attempt/time budget | Stop retrying and persist terminal policy outcome |
| ORCH-RUN-12 | Queue envelope has unknown schema version | Reject/quarantine without side effect |
| ORCH-RUN-13 | Principal loses access while run is waiting | Reauthorize before resumed side effect; deny if no longer allowed |
| ORCH-RUN-14 | Tenant/resource scope mismatches current authorization | Fail closed and emit redacted security telemetry |
| ORCH-RUN-15 | Database or queue unavailable | Do not claim durable success; bounded backpressure/recovery |
| ORCH-RUN-16 | Recovery scanner runs twice concurrently | No duplicate unsafe side effects or conflicting state |
| ORCH-RUN-17 | Required step is unresolved but run completion is requested | Reject success transition |
| ORCH-RUN-18 | Sensitive data appears in error or event payload | Redact/bound it; do not expose to client/default telemetry |

## 8. Operational evidence required before implementation approval

Before Phase 1, reviewers must approve:
- exact state/transition table and whether `needs_reconciliation` is run-level, step-level, or both;
- event schema and compatibility/version policy;
- durable deduplication and transaction/outbox/inbox strategy;
- lease/fencing design and recovery behavior;
- side-effect idempotency/reconciliation contract per tool/integration category;
- authorization authority and ADR-0021 resolution or an explicit approved interim contract;
- retry/timeout/retention/telemetry limits and operational ownership;
- executable tests for all applicable scenarios above, including concurrency and crash injection.

## 9. References and related contracts

- [Workflow definition validation and execution safety](https://github.com/Monupatel62/aether-ai-workflows/blob/main/docs/WORKFLOW_DEFINITION_VALIDATION_AND_EXECUTION_SAFETY.md)
- [Queue security and message-consumer boundary](https://github.com/Monupatel62/aether-ai-queue/blob/main/README.md)
- [Policy decision contract and acceptance](https://github.com/Monupatel62/aether-ai-security/blob/main/docs/POLICY_DECISION_CONTRACT_AND_ACCEPTANCE.md)
- [OWASP Business Logic Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html)
- [OWASP WSTG: Circumvention of Workflows](https://wstg.org/latest/4-Web_Application_Security_Testing/10-Business_Logic/06-Circumvention_of_Work_Flows/)

## Change policy

This proposal must be reviewed against the master repository catalog and adjacent contracts before implementation. Any accepted change to state names, event fields, delivery semantics, authorization, or retry behavior requires coordinated updates to affected repositories and contract tests.
