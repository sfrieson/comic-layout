import type {
  Cell,
  Fill,
  Node,
  Page,
  Project,
  Rectangle,
  PathAlignedText,
} from "../project/Project.js";
import { expect } from "../utils/assert.js";
import { nodeToBB } from "../utils/viewportUtils.js";

export type RenderCallbackOptions =
  | {
      type: "page";
      node: Page;
      renderInfo: {
        transform: DOMMatrix;
      };
    }
  | {
      type: "rect-like";
      node: Cell | Rectangle;
      renderInfo: {
        transform: DOMMatrix;
        path: Path2D;
      };
    };

export type RenderCallback = (options: RenderCallbackOptions) => void;

export interface RenderInfo {
  context: CanvasRenderingContext2D;
  project: Project;
  onRendered?: RenderCallback;
  imageMap: Map<number, HTMLImageElement>;
}

function fillRect(
  { context, imageMap }: RenderInfo,
  fill: Fill,
  { width, height }: { width: number; height: number },
) {
  context.save();
  const cleanup = () => {
    context.restore();
  };
  context.globalAlpha = fill.opacity;
  switch (fill.type) {
    case "color":
      context.fillStyle = fill.value;
      context.beginPath();
      context.rect(0, 0, width, height);
      context.fill();
      break;
    case "image": {
      if (fill.value == null) return cleanup();
      const image = imageMap.get(fill.value);
      if (!image) return cleanup();

      switch (fill.position) {
        case "stretch":
          context.drawImage(image, 0, 0, width, height);
          break;
        case "contain":
        case "cover": {
          let scale = 1;
          if (fill.position === "contain") {
            scale = Math.min(width / image.width, height / image.height);
          } else if (fill.position === "cover") {
            scale = Math.max(width / image.width, height / image.height);
          } else {
            throw new Error(`Unexpected fill position: ${fill.position}`);
          }
          const scaledWidth = image.width * scale;
          const scaledHeight = image.height * scale;
          context.drawImage(
            image,
            (width - scaledWidth) / 2,
            (height - scaledHeight) / 2,
            scaledWidth,
            scaledHeight,
          );
          break;
        }
        default: {
          if (typeof fill.position === "object") {
            throw new Error(`Unexpected fill position: ${fill.position}`);
          }
          const { x, y, width, height } = fill.position;
          context.drawImage(image, x, y, width, height);
        }
      }
    }
  }
  cleanup();
}

export function renderPage(renderInfo: RenderInfo, page: Page) {
  const { width, height, fills, children } = page;
  const { context } = renderInfo;
  for (const fill of fills.renderOrder()) {
    fillRect(renderInfo, fill, { width, height });
  }
  renderInfo.onRendered?.({
    type: "page",
    node: page,
    renderInfo: {
      transform: context.getTransform(),
    },
  });
  for (const child of children.renderOrder()) {
    renderChild(renderInfo, child);
  }
}

function renderRectangle(renderInfo: RenderInfo, node: Cell | Rectangle) {
  const { context } = renderInfo;
  const { translation, path, fills } = node;
  const path2d = new Path2D();
  const bb = expect(nodeToBB(node), "Node has no path, type: " + node.type);

  let started = false;
  for (const point of path.points) {
    if (!started) {
      path2d.moveTo(point.x, point.y);
      started = true;
    } else {
      path2d.lineTo(point.x, point.y);
    }
  }
  if (path.closed) {
    path2d.closePath();
  }
  context.save();
  context.translate(translation.x, translation.y);
  context.clip(path2d);
  for (const fill of fills.renderOrder()) {
    fillRect(renderInfo, fill, bb);
  }
  renderInfo.onRendered?.({
    type: "rect-like",
    node,
    renderInfo: {
      transform: context.getTransform(),
      path: path2d,
    },
  });
  for (const child of node.children.renderOrder()) {
    renderChild(renderInfo, child);
  }
  context.restore();
}

function renderPathAlignedText(renderInfo: RenderInfo, node: PathAlignedText) {
  const { context } = renderInfo;
  context.save();
  context.translate(node.translation.x, node.translation.y);
  context.font = `${node.fontSize}px Courier`;
  for (const line of node.lines) {
    for (const fill of node.fills.renderOrder()) {
      if (fill.type !== "color") {
        console.warn(
          `Text doesn't yet support non-color fills. Fill type: ${fill.type}`,
        );
        continue;
      }
      context.fillStyle = fill.value;
      context.fillText(line, 0, 0);
    }
    context.translate(0, node.lineHeight * node.fontSize);
  }
  context.restore();
}

function renderChild(renderInfo: RenderInfo, child: Node) {
  switch (child.type) {
    case "cell":
    case "rectangle":
      renderRectangle(renderInfo, child);
      break;
    case "text_path-aligned":
      renderPathAlignedText(renderInfo, child);
      break;
    case "page":
      throw new Error("Page should not be a child of a page");
    default:
      const _unreachable: never = child;
      throw new Error(`Unexpected node type: ${(_unreachable as Node).type}`);
  }
}
