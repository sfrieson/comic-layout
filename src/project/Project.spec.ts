import { describe, expect, it } from "vitest";

import { RenderQueue } from "./Project.js";

describe("RenderQueue", () => {
  it("should restore items from array", () => {
    const data = [{ name: "cat" }, { name: "dog" }, { name: "bird" }];
    const queue = new RenderQueue("test", { data });
    expect(queue.length).toBe(3);
    expect([...queue.renderOrder()]).toEqual(data);
    expect(Array.from(queue.listOrder())).toEqual(data.reverse());
  });

  it("should enqueue items", () => {
    const data = { id: "1", data: "test" };
    const queue = new RenderQueue<typeof data>("test", { data: [] });
    const node = queue.enqueue(data);
    expect(queue.length).toBe(1);
    expect(node.data).toEqual(data);
    expect(Array.from(queue.renderOrder())).toEqual([data]);
  });

  it("should remove items", () => {
    const datum = { name: "test" };
    const queue = new RenderQueue<typeof datum>("test", { data: [datum] });
    const n = queue.removeItem(0);
    expect(queue.length).toBe(0);
    expect(n.data).toEqual(datum);
    expect(Array.from(queue.renderOrder())).toEqual([]);
  });

  it("should update items", () => {
    const data = { name: "test" };
    const queue = new RenderQueue<typeof data>("test", { data: [data] });
    queue.updateItem(0, { name: "updated" });
    const node = Array.from(queue.renderOrder()).at(0);
    expect(node?.name).toEqual("updated");
  });
});
