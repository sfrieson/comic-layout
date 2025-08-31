export interface Vec2 {
  x: number;
  y: number;
}

export function vec2Sub(a: Vec2, b: Vec2 | number) {
  if (typeof b === "number") {
    return { x: a.x - b, y: a.y - b };
  }
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Add(a: Vec2, b: Vec2 | number) {
  if (typeof b === "number") {
    return { x: a.x + b, y: a.y + b };
  }
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Mult(a: Vec2, b: Vec2 | number) {
  if (typeof b === "number") {
    return { x: a.x * b, y: a.y * b };
  }
  return { x: a.x * b.x, y: a.y * b.y };
}

export function vec2Div(a: Vec2, b: Vec2 | number) {
  if (typeof b === "number") {
    return { x: a.x / b, y: a.y / b };
  }
  return { x: a.x / b.x, y: a.y / b.y };
}

export function eventVec2(e: Pick<MouseEvent, "clientX" | "clientY">) {
  return { x: e.clientX, y: e.clientY };
}
