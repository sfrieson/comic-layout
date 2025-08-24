import { Node } from "../project/Project.js";
import { vec2Div, vec2Sub } from "./vec2.js";

export function screenToWorld(
  pos: { x: number; y: number },
  ui: { pan: { x: number; y: number }; zoom: number },
) {
  return vec2Div(vec2Sub(pos, ui.pan), ui.zoom);
}
export function aabbFromPoints(
  points: { x: number; y: number }[],
  offset: { x: number; y: number } = { x: 0, y: 0 },
) {
  const minX = Math.min(...points.map((p) => p.x)) + offset.x;
  const minY = Math.min(...points.map((p) => p.y)) + offset.y;
  const maxX = Math.max(...points.map((p) => p.x)) + offset.x;
  const maxY = Math.max(...points.map((p) => p.y)) + offset.y;
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    contains: (p: { x: number; y: number }) =>
      p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY,
  };
}
export function nodeToBB(
  node: Node,
  offset: { x: number; y: number } = { x: 0, y: 0 },
) {
  if (node.type === "cell") {
    return aabbFromPoints(node.path.points, offset);
  }
  return null;
}
