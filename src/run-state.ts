export type RunState =
  | "created"
  | "queued"
  | "running"
  | "awaiting_approval"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out";

export type RunEvent =
  | "enqueue"
  | "start"
  | "approval_required"
  | "approval_granted"
  | "approval_denied"
  | "complete"
  | "fail"
  | "cancel"
  | "timeout"
  | "retry";

export interface RunSnapshot {
  readonly runId: string;
  readonly state: RunState;
  readonly attempt: number;
  readonly version: number;
}

export interface TransitionResult {
  readonly accepted: boolean;
  readonly state: RunState;
  readonly attempt: number;
  readonly version: number;
  readonly reason?: "invalid_run_id" | "invalid_attempt" | "invalid_version" | "invalid_transition" | "retry_limit";
}

const transitions: Readonly<Record<RunState, Readonly<Partial<Record<RunEvent, RunState>>>>> = {
  created: { enqueue: "queued", cancel: "cancelled" },
  queued: { start: "running", cancel: "cancelled" },
  running: {
    approval_required: "awaiting_approval",
    complete: "succeeded",
    fail: "failed",
    cancel: "cancelled",
    timeout: "timed_out",
    retry: "queued"
  },
  awaiting_approval: { approval_granted: "queued", approval_denied: "cancelled", cancel: "cancelled", timeout: "timed_out" },
  succeeded: {},
  failed: {},
  cancelled: {},
  timed_out: {}
};

/**
 * Pure state transition decision only. Persistence, optimistic locking, leases, authorization,
 * side-effect idempotency and queue delivery guarantees must be implemented by the orchestrator.
 */
export function transitionRun(
  snapshot: RunSnapshot,
  event: RunEvent,
  options: { readonly maxAttempts?: number; readonly expectedVersion?: number } = {}
): TransitionResult {
  const maxAttempts = options.maxAttempts ?? 3;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(snapshot.runId)) {
    return rejected(snapshot, "invalid_run_id");
  }
  if (!Number.isInteger(snapshot.attempt) || snapshot.attempt < 0 || snapshot.attempt > 1_000_000) {
    return rejected(snapshot, "invalid_attempt");
  }
  if (!Number.isSafeInteger(snapshot.version) || snapshot.version < 0) {
    return rejected(snapshot, "invalid_version");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new RangeError("maxAttempts must be between 1 and 100.");
  }
  if (options.expectedVersion !== undefined && options.expectedVersion !== snapshot.version) {
    return rejected(snapshot, "invalid_version");
  }
  if (event === "retry" && snapshot.attempt >= maxAttempts) return rejected(snapshot, "retry_limit");

  const nextState = transitions[snapshot.state]?.[event];
  if (!nextState) return rejected(snapshot, "invalid_transition");

  return {
    accepted: true,
    state: nextState,
    attempt: event === "retry" ? snapshot.attempt + 1 : snapshot.attempt,
    version: snapshot.version + 1
  };
}

function rejected(snapshot: RunSnapshot, reason: NonNullable<TransitionResult["reason"]>): TransitionResult {
  return { accepted: false, state: snapshot.state, attempt: snapshot.attempt, version: snapshot.version, reason };
}
