const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STATUSES = new Set(["queued", "running", "cancel_requested", "succeeded", "failed", "cancelled"]);
const TERMINAL = new Set(["succeeded", "failed", "cancelled"]);
const TRANSITIONS = Object.freeze({
  queued: new Set(["running", "cancelled"]),
  running: new Set(["cancel_requested", "succeeded", "failed"]),
  cancel_requested: new Set(["cancelled", "succeeded", "failed"]),
  succeeded: new Set(),
  failed: new Set(),
  cancelled: new Set(),
});

export class RunStateError extends Error {
  constructor(code, message = "Invalid run state transition") { super(message); this.name = "RunStateError"; this.code = code; }
}
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validId(value) { return typeof value === "string" && ID.test(value) && value.trim() === value; }
function validRun(run) {
  return isRecord(run)
    && validId(run.id) && validId(run.tenantId) && validId(run.ownerId)
    && STATUSES.has(run.status)
    && Number.isSafeInteger(run.version) && run.version >= 1;
}

/**
 * Apply one lifecycle command to a run snapshot.
 * Persistence must use compare-and-swap on version; this pure helper does not
 * provide durable storage, distributed locking, or queue delivery guarantees.
 */
export function applyRunCommand(runInput, commandInput) {
  if (!validRun(runInput)) throw new RunStateError("invalid_run", "Run snapshot is invalid");
  if (!isRecord(commandInput) || !validId(commandInput.type)) throw new RunStateError("invalid_command", "Run command is invalid");
  const command = commandInput.type;
  const expectedVersion = commandInput.expectedVersion;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new RunStateError("invalid_version", "Expected version is required");
  if (expectedVersion !== runInput.version) throw new RunStateError("version_conflict", "Run version changed; reload before retrying");
  if (!Number.isSafeInteger(commandInput.at) || commandInput.at < 0) throw new RunStateError("invalid_timestamp", "Command timestamp is invalid");
  if (commandInput.actorId !== runInput.ownerId && commandInput.system !== true) {
    throw new RunStateError("forbidden", "Actor is not permitted to mutate this run");
  }

  const target = ({
    start: "running",
    request_cancel: runInput.status === "queued" ? "cancelled" : "cancel_requested",
    succeed: "succeeded",
    fail: "failed",
    acknowledge_cancel: "cancelled",
  })[command];
  if (!target) throw new RunStateError("unknown_command", "Run command is unsupported");
  if (TERMINAL.has(runInput.status)) {
    if (target === runInput.status) return Object.freeze({ run: Object.freeze({ ...runInput }), event: null, idempotent: true });
    throw new RunStateError("terminal_run", "Terminal run state cannot be changed");
  }
  if (!TRANSITIONS[runInput.status].has(target)) {
    if (command === "request_cancel" && runInput.status === "cancel_requested") {
      return Object.freeze({ run: Object.freeze({ ...runInput }), event: null, idempotent: true });
    }
    throw new RunStateError("invalid_transition", `Cannot transition from ${runInput.status} to ${target}`);
  }

  const run = Object.freeze({
    ...runInput,
    status: target,
    version: runInput.version + 1,
    updatedAt: commandInput.at,
    ...(target === "succeeded" || target === "failed" || target === "cancelled" ? { finishedAt: commandInput.at } : {}),
  });
  const event = Object.freeze({
    type: "run.state_changed",
    runId: run.id,
    tenantId: run.tenantId,
    from: runInput.status,
    to: target,
    version: run.version,
    actorId: commandInput.system === true ? "system" : commandInput.actorId,
    at: commandInput.at,
  });
  return Object.freeze({ run, event, idempotent: false });
}
