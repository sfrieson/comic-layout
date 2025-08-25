import { describe, it, expect } from "vitest";

import { vec2Sub, vec2Add, vec2Mult, vec2Div, eventVec2 } from "./vec2.js";

describe("vec2Sub", () => {
  it("should subtract two vectors", () => {
    expect(vec2Sub({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: -2, y: -2 });
  });
  it("should accept a scalar as the second argument", () => {
    expect(vec2Sub({ x: 1, y: 2 }, 3)).toEqual({ x: -2, y: -1 });
  });
});

describe("vec2Add", () => {
  it("should add two vectors", () => {
    expect(vec2Add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
  });
  it("should accept a scalar as the second argument", () => {
    expect(vec2Add({ x: 1, y: 2 }, 3)).toEqual({ x: 4, y: 5 });
  });
});

describe("vec2mult", () => {
  it("should multiply two vectors", () => {
    expect(vec2Mult({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 3, y: 8 });
  });
  it("should multiply a vector by a scalar", () => {
    expect(vec2Mult({ x: 1, y: 2 }, 3)).toEqual({ x: 3, y: 6 });
  });
});

describe("vec2Div", () => {
  it("should divide two vectors", () => {
    expect(vec2Div({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({
      x: 1 / 3,
      y: 1 / 2,
    });
  });
  it("should divide a vector by a scalar", () => {
    expect(vec2Div({ x: 1, y: 2 }, 3)).toEqual({ x: 1 / 3, y: 2 / 3 });
  });
});

describe("eventVec2", () => {
  it("should convert an event to a vector", () => {
    expect(eventVec2({ clientX: 1, clientY: 2 })).toEqual({ x: 1, y: 2 });
  });
});
