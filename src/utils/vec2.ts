export function vec2Sub(
  a: { x: number; y: number },
  b: { x: number; y: number } | number,
) {
  if (typeof b === "number") {
    return { x: a.x - b, y: a.y - b };
  }
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Add(
  a: { x: number; y: number },
  b: { x: number; y: number } | number,
) {
  if (typeof b === "number") {
    return { x: a.x + b, y: a.y + b };
  }
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Mult(
  a: { x: number; y: number },
  b: { x: number; y: number } | number,
) {
  if (typeof b === "number") {
    return { x: a.x * b, y: a.y * b };
  }
  return { x: a.x * b.x, y: a.y * b.y };
}

export function vec2Div(
  a: { x: number; y: number },
  b: { x: number; y: number } | number,
) {
  if (typeof b === "number") {
    return { x: a.x / b, y: a.y / b };
  }
  return { x: a.x / b.x, y: a.y / b.y };
}

export function eventVec2(e: Pick<MouseEvent, "clientX" | "clientY">) {
  return { x: e.clientX, y: e.clientY };
}
