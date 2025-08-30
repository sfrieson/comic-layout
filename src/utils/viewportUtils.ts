import type { Node } from "../project/Project.js";
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
  if (node.type === "page") {
    return aabbFromPoints(
      [
        { x: 0, y: 0 },
        { x: node.width, y: node.height },
      ],
      offset,
    );
  }
  if (node.type === "cell") {
    return aabbFromPoints(node.path.points, offset);
  }
  if (node.type === "rectangle") {
    return aabbFromPoints(
      [
        node.translation,
        {
          x: node.width + node.translation.x,
          y: node.height + node.translation.y,
        },
      ],
      offset,
    );
  }
  const _unreachable: never = node;
  throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
}
