import { describe, expect, it } from "vitest";

import { RenderQueue } from "./RenderQueue.js";

describe("RenderQueue", () => {
  it("should restore items from array", () => {
    const data = [{ name: "cat" }, { name: "dog" }, { name: "bird" }];
    const queue = new RenderQueue("test", data);
    expect(queue.length).toBe(3);
    expect(queue.toArray()).toEqual(data);
    expect([...queue.renderOrder()]).toEqual(data.reverse());
  });

  it("should enqueue items", () => {
    const data = { id: "1", data: "test" };
    const queue = new RenderQueue<typeof data>("test", []);
    const node = queue.addToTop(data);
    expect(queue.length).toBe(1);
    expect(node.data).toEqual(data);
    expect(Array.from(queue.renderOrder())).toEqual([data]);
  });

  it("should remove items", () => {
    const datum = { name: "test" };
    const datum2 = { name: "test2" };
    const queue = new RenderQueue<typeof datum>("test", [datum, datum2]);
    const n = queue.removeItemAt(0);
    expect(queue.length).toBe(1);
    expect(n.data).toEqual(datum);
    expect(Array.from(queue.renderOrder())).toEqual([datum2]);
    const deleted = queue.removeItem(datum2);
    expect(deleted).toEqual(datum2);
    expect(queue.length).toBe(0);
    expect(Array.from(queue.renderOrder())).toEqual([]);
  });

  it("should update items", () => {
    const data = { id: 3, name: "test" };
    const queue = new RenderQueue<typeof data>("test", [data]);
    queue.updateItem(0, { id: 2, name: "updated" });
    const node = Array.from(queue.renderOrder()).at(0);
    expect(node).toEqual({ id: 2, name: "updated" });
    queue.updateItem(0, (item) => ({ ...item, name: "updated2" }));
    const node2 = Array.from(queue.renderOrder()).at(0);
    expect(node2).toEqual({ id: 2, name: "updated2" });
  });

  it("should access an item at() an index", () => {
    const queue = new RenderQueue<{ n: number }>(
      "test",
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n })),
    );
    const node = queue.at(3);
    expect(node).toEqual({ n: 3 });
  });

  it("should reverseMap", () => {
    const queue = new RenderQueue<{ n: number }>(
      "test",
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n })),
    );
    const nodes = queue.reverseMap((d, i) => ({ n: d.n, i }));
    expect(nodes).toEqual([
      { n: 9, i: 9 },
      { n: 8, i: 8 },
      { n: 7, i: 7 },
      { n: 6, i: 6 },
      { n: 5, i: 5 },
      { n: 4, i: 4 },
      { n: 3, i: 3 },
      { n: 2, i: 2 },
      { n: 1, i: 1 },
      { n: 0, i: 0 },
    ]);
  });

  it("should find the index of an item", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n }));
    const queue = new RenderQueue<{ n: number }>("test", data);
    const index = queue.indexOf(data[5]!);
    expect(index).toBe(5);
  });

  it("should add an item at an index, pushing back other items", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n }));
    const queue = new RenderQueue<{ n: number }>("test", data);
    const added = { n: 10 };
    queue.insertAt(5, added);
    expect(queue.length).toBe(11);
    expect(queue.at(5)).toEqual(added);
    expect(queue.at(6)).toEqual(data[5]);
  });

  it("should forEach", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n }));
    const queue = new RenderQueue<{ n: number }>("test", data);
    queue.forEach((item, index) => {
      expect(item).toEqual(data[index]);
    });
  });

  it("should swapWithPrevious", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n }));
    const queue = new RenderQueue<{ n: number }>("test", data);
    queue.swapWithPrevious(data[5]!);
    expect(queue.at(5)).toEqual(data[4]);
    expect(queue.at(4)).toEqual(data[5]);
  });

  it("should swapWithNext", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n }));
    const queue = new RenderQueue<{ n: number }>("test", data);
    queue.swapWithNext(data[5]!);
    expect(queue.at(5)).toEqual(data[6]);
    expect(queue.at(6)).toEqual(data[5]);
  });
});
