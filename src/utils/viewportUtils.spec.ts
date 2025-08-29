import { describe, it, expect } from "vitest";
import { screenToWorld, aabbFromPoints, nodeToBB } from "./viewportUtils.js";
import { createCell, createPage, Path } from "../project/Project.js";

describe("viewportUtils", () => {
  describe("screenToWorld", () => {
    it("should convert a screen position to a world position", () => {
      const pos = { x: 100, y: 100 };
      const ui = { pan: { x: 0, y: 0 }, zoom: 1 };
      const world = screenToWorld(pos, ui);
      expect(world).toEqual({ x: 100, y: 100 });

      const pos2 = { x: 200, y: 200 };
      const ui2 = { pan: { x: 100, y: 100 }, zoom: 2 };
      const world2 = screenToWorld(pos2, ui2);
      expect(world2).toEqual({ x: 50, y: 50 });
    });
  });

  describe("aabbFromPoints", () => {
    it("should create an AABB from a list of points", () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const aabb = aabbFromPoints(points);
      expect(aabb).toMatchObject({ x: 0, y: 0, width: 100, height: 100 });
    });
    it("should perform hit testing", () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const tests = [
        { x: 50, y: 50, contains: true },
        { x: 100, y: 0, contains: true },
        { x: 100, y: 100, contains: true },
        { x: 100, y: 101, contains: false },
        { x: 101, y: 100, contains: false },
        { x: 101, y: 101, contains: false },
      ];
      const aabb = aabbFromPoints(points);
      for (const test of tests) {
        expect(aabb.contains({ x: test.x, y: test.y })).toBe(test.contains);
      }
    });
  });

  describe("nodeToBB", () => {
    it("should create an AABB from a Page", () => {
      const width = Math.random() * 500 + 100;
      const height = Math.random() * 500 + 100;
      const page = createPage({
        width,
        height,
      });
      const aabb = nodeToBB(page);
      expect(aabb).toMatchObject({ x: 0, y: 0, width, height });
    });
    it("should create an AABB from a Cell", () => {
      const cell = createCell({
        path: Path.create({
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        }),
        parent: null as any,
      });
      const aabb = nodeToBB(cell);
      expect(aabb).toMatchObject({ x: 0, y: 0, width: 100, height: 100 });
    });
    it("should throw on unexpected nodes", () => {
      const node = { type: "taco" } as any;
      expect(() => nodeToBB(node)).toThrow(/taco/);
    });
  });
});
