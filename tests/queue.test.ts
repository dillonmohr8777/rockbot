import { describe, expect, it } from "vitest";
import { AsyncPushQueue } from "../src/lib/providers/queue";

describe("provider stream queue", () => {
  it("delivers streamed chunks in order", async () => {
    const queue = new AsyncPushQueue<string>();
    const iterator = queue[Symbol.asyncIterator]();
    queue.push("one");
    queue.push("two");
    queue.close();
    await expect(iterator.next()).resolves.toEqual({ value: "one", done: false });
    await expect(iterator.next()).resolves.toEqual({ value: "two", done: false });
    await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });
  });

  it("propagates a provider failure to an active consumer", async () => {
    const queue = new AsyncPushQueue<string>();
    const iterator = queue[Symbol.asyncIterator]();
    const pending = iterator.next();
    queue.fail(new Error("provider unavailable"));
    await expect(pending).rejects.toThrow("provider unavailable");
  });
});
