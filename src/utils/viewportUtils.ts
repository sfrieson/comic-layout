import type { Node } from "../project/Project.js";
import { Vec2, vec2Add, vec2Div, vec2Sub } from "./vec2.js";

export function screenToWorld(pos: Vec2, ui: { pan: Vec2; zoom: number }) {
  return vec2Div(vec2Sub(pos, ui.pan), ui.zoom);
}
export function aabbFromPoints(points: Vec2[]) {
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    contains: (p: Vec2) =>
      p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY,
  };
}
export function aabbFromRect(
  rect:
    | { x: number; y: number; width: number; height: number }
    | { translation: Vec2; width: number; height: number }
    | { width: number; height: number },
) {
  if ("translation" in rect) {
    return aabbFromPoints([
      rect.translation,
      {
        x: rect.width + rect.translation.x,
        y: rect.height + rect.translation.y,
      },
    ]);
  }
  let x = 0,
    y = 0;
  if ("x" in rect) x = rect.x;
  if ("y" in rect) y = rect.y;
  const { width, height } = rect;
  return aabbFromPoints([
    { x, y },
    { x: x + width, y: y + height },
  ]);
}
export function nodeToBB(node: Node) {
  switch (node.type) {
    case "page":
      return aabbFromRect(node);
    case "cell":
      return aabbFromPoints(
        node.path.points.map((p) => vec2Add(p, node.translation)),
      );
    case "rectangle":
      return aabbFromRect(node);
    case "text_path-aligned":
    case "duplicated":
      throw new Error(`Node does not support AABB: ${node.type}`);
    default:
      const _unreachable: never = node;
      throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
  }
}

export function nodeHitTest(node: Node, pos: Vec2) {
  switch (node.type) {
    case "page":
    case "cell":
    case "rectangle":
      return nodeToBB(node).contains(pos);
    case "text_path-aligned":
    case "duplicated":
      console.warn(
        `${node.type} does not support hit testing. Only SVG hit testing is supported.`,
      );
      return false;
    default:
      const _unreachable: never = node;
      throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
  }
}
