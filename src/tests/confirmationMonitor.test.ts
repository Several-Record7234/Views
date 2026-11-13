import { describe, it, expect } from "vitest";
import {
  applyConfirmation,
  expireMonitor,
  responseDeadlineMs,
  startMonitor,
  summariseMonitor,
} from "../animation/confirmationMonitor";

const roster = [
  { connectionId: "a", name: "Ash" },
  { connectionId: "b", name: "Bryn" },
];

const reply = (outcome: "completed" | "stopped" | "failed", id = "s1") =>
  ({ kind: "confirm", id, outcome }) as const;

describe("confirmation monitor", () => {
  it("starts everyone in the Room at Go as waiting", () => {
    const monitor = startMonitor("s1", roster);
    expect(monitor.entries.map((entry) => entry.status)).toEqual(["waiting", "waiting"]);
  });

  it("records a reply against its sender only", () => {
    const monitor = applyConfirmation(startMonitor("s1", roster), "b", reply("completed"));
    expect(monitor.entries.map((entry) => entry.status)).toEqual(["waiting", "completed"]);
  });

  it("ignores a reply for another shot", () => {
    const start = startMonitor("s1", roster);
    expect(applyConfirmation(start, "a", reply("completed", "old"))).toBe(start);
  });

  it("ignores a client that was not in the Room at Go", () => {
    const start = startMonitor("s1", roster);
    expect(applyConfirmation(start, "late-joiner", reply("completed"))).toBe(start);
  });

  it("keeps the first reply from a client", () => {
    const once = applyConfirmation(startMonitor("s1", roster), "a", reply("stopped"));
    expect(applyConfirmation(once, "a", reply("completed")).entries[0].status).toBe("stopped");
  });

  it("marks only the clients still waiting as no response at the deadline", () => {
    const monitor = expireMonitor(applyConfirmation(startMonitor("s1", roster), "a", reply("completed")));
    expect(monitor.entries.map((entry) => entry.status)).toEqual(["completed", "no-response"]);
  });

  it("lets a late reply replace no response", () => {
    const expired = expireMonitor(startMonitor("s1", roster));
    expect(applyConfirmation(expired, "b", reply("completed")).entries[1].status).toBe("completed");
  });

  it("counts statuses for the summary", () => {
    const monitor = applyConfirmation(startMonitor("s1", roster), "a", reply("failed"));
    const counts = summariseMonitor(monitor);
    expect(counts.failed).toBe(1);
    expect(counts.waiting).toBe(1);
    expect(counts.completed).toBe(0);
  });

  it("allows the shot's duration plus slack before giving up", () => {
    expect(responseDeadlineMs(3000)).toBe(5000);
  });
});
