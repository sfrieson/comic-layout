import { describe, it, expect } from "vitest";

import { assert, expect as assertExpect } from "./assert.js";

describe("assert", () => {
  it("should throw an error if the condition is false", () => {
    expect(() => assert(false, "test")).toThrow();
  });
  it("should not throw an error if the condition is true", () => {
    expect(() => assert(true, "test")).not.toThrow();
  });
});

describe("expect", () => {
  it("should throw an error if the value is undefined", () => {
    expect(() => assertExpect(undefined, "test")).toThrow();
  });
  it("should not throw an error if the value is defined", () => {
    expect(assertExpect("taco", "test")).toBe("taco");
  });
});
