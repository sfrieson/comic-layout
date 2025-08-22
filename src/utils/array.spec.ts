import { describe, it, expect } from "vitest";
import { removeIndex, insertAtIndex } from "./array.js";

describe("array", () => {
  describe("removeIndex", () => {
    it("should remove the element at the given index", () => {
      const arr = [1, 2, 3, 4, 5];
      const newArr = removeIndex(arr, 2);
      expect(newArr).toEqual([1, 2, 4, 5]);
    });
  });

  describe("insertAtIndex", () => {
    it("should insert the element at the given index", () => {
      const arr = [1, 2, 3, 4, 5];
      const newArr = insertAtIndex(arr, 2, 10);
      expect(newArr).toEqual([1, 2, 10, 3, 4, 5]);
    });
  });
});
