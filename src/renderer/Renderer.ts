import type { RenderCallback } from "../app/Viewport.js";
import type { Cell, Page, Project } from "../project/Project.js";

export interface RenderInfo {
  screen: (n: number) => number;
  context: CanvasRenderingContext2D;
  project: Project;
  onRendered?: RenderCallback;
}

export function renderPage(renderInfo: RenderInfo, page: Page) {
  const { width, height, fills, children } = page;
  const { context } = renderInfo;
  for (const fill of fills) {
    switch (fill.type) {
      case "color":
        context.fillStyle = fill.value;
        context.fillRect(0, 0, width, height);
        break;
    }
  }
  renderInfo.onRendered?.({
    type: "page",
    node: page,
    renderInfo: {
      transform: context.getTransform(),
    },
  });
  for (const child of children) {
    if (child.type === "cell") {
      renderCell(renderInfo, child);
    }
  }
}

function renderCell(renderInfo: RenderInfo, cell: Cell) {
  const { context } = renderInfo;
  const { translation, path, fills } = cell;
  const path2d = new Path2D();

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
  for (const fill of fills) {
    switch (fill.type) {
      case "color":
        context.fillStyle = fill.value;
        context.globalAlpha = fill.opacity;
        context.fill(path2d);
        context.globalAlpha = 1;
        break;
    }
  }
  renderInfo.onRendered?.({
    type: "cell",
    node: cell,
    renderInfo: {
      transform: context.getTransform(),
      path: path2d,
    },
  });
  context.restore();
}
