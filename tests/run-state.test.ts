import { describe, expect, it } from "vitest";
import { transitionRun } from "../src/index.js";
import type { RunSnapshot } from "../src/index.js";

const snapshot: RunSnapshot = { runId: "run-123", state: "running", attempt: 0, version: 4 };

describe("pure run-state transition decisions", () => {
  it("moves running to success and increments version", () => {
    expect(transitionRun(snapshot, "complete")).toEqual({
      accepted: true, state: "succeeded", attempt: 0, version: 5
    });
  });

  it("rejects terminal-state transitions", () => {
    expect(transitionRun({ ...snapshot, state: "succeeded" }, "retry")).toMatchObject({
      accepted: false, reason: "invalid_transition", state: "succeeded"
    });
  });

  it("increments attempt on retry and enforces retry limit", () => {
    expect(transitionRun(snapshot, "retry", { maxAttempts: 3 })).toMatchObject({
      accepted: true, state: "queued", attempt: 1, version: 5
    });
    expect(transitionRun({ ...snapshot, attempt: 3 }, "retry", { maxAttempts: 3 })).toMatchObject({
      accepted: false, reason: "retry_limit"
    });
  });

  it("supports approval pause/resume only through explicit events", () => {
    const paused = transitionRun(snapshot, "approval_required");
    expect(paused).toMatchObject({ accepted: true, state: "awaiting_approval" });
    expect(transitionRun({ ...snapshot, state: "awaiting_approval" }, "approval_granted"))
      .toMatchObject({ accepted: true, state: "queued" });
  });

  it("rejects stale expected versions and malformed run IDs", () => {
    expect(transitionRun(snapshot, "complete", { expectedVersion: 3 })).toMatchObject({
      accepted: false, reason: "invalid_version"
    });
    expect(transitionRun({ ...snapshot, runId: "../bad" }, "complete")).toMatchObject({
      accepted: false, reason: "invalid_run_id"
    });
  });
});
