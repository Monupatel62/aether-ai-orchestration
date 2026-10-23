import test from "node:test";
import assert from "node:assert/strict";
import { applyRunCommand, RunStateError } from "../src/index.js";

const run = { id: "run-1", tenantId: "tenant-a", ownerId: "user-1", status: "queued", version: 1, createdAt: 100, updatedAt: 100 };
function command(type, overrides = {}) { return { type, expectedVersion: 1, actorId: "user-1", at: 200, ...overrides }; }

test("moves queued run to running and increments version", () => {
  const result = applyRunCommand(run, command("start"));
  assert.equal(result.run.status, "running");
  assert.equal(result.run.version, 2);
  assert.equal(result.event.type, "run.state_changed");
});

test("supports queued cancellation and terminal timestamps", () => {
  const result = applyRunCommand(run, command("request_cancel"));
  assert.equal(result.run.status, "cancelled");
  assert.equal(result.run.finishedAt, 200);
});

test("running cancellation requires acknowledgement unless execution wins race", () => {
  const running = { ...run, status: "running", version: 2 };
  const requested = applyRunCommand(running, command("request_cancel", { expectedVersion: 2 }));
  assert.equal(requested.run.status, "cancel_requested");
  assert.equal(applyRunCommand(requested.run, command("acknowledge_cancel", { expectedVersion: 3 })).run.status, "cancelled");
  assert.equal(applyRunCommand(requested.run, command("succeed", { expectedVersion: 3 })).run.status, "succeeded");
});

test("rejects stale version, unauthorized actor, and illegal transitions", () => {
  assert.throws(() => applyRunCommand(run, command("start", { expectedVersion: 2 })), (e) => e.code === "version_conflict");
  assert.throws(() => applyRunCommand(run, command("start", { actorId: "other-user" })), (e) => e.code === "forbidden");
  assert.throws(() => applyRunCommand(run, command("succeed")), (e) => e.code === "invalid_transition");
});

test("terminal states are immutable and repeated cancellation is idempotent", () => {
  const done = { ...run, status: "succeeded", version: 2, finishedAt: 200 };
  assert.throws(() => applyRunCommand(done, command("fail", { expectedVersion: 2 })), (e) => e.code === "terminal_run");
  const requested = { ...run, status: "cancel_requested", version: 2 };
  assert.equal(applyRunCommand(requested, command("request_cancel", { expectedVersion: 2 })).idempotent, true);
});

test("validates run snapshots and commands", () => {
  assert.throws(() => applyRunCommand({ ...run, status: "unknown" }, command("start")), RunStateError);
  assert.throws(() => applyRunCommand(run, command("start", { at: -1 })), RunStateError);
});


test("does not trust a caller-supplied system flag without server authority", () => {
  assert.throws(() => applyRunCommand(run, command("start", { actorId: "system-user", system: true })), (e) => e.code === "forbidden");
  const result = applyRunCommand(run, command("start", { actorId: "system-user", system: true }), { trustedSystem: true });
  assert.equal(result.event.actorId, "system");
});
