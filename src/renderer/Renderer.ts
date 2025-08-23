import { Cell, Page, Project, Node } from "../project/Project.js";

export interface RenderInfo {
  screen: (n: number) => number;
  context: CanvasRenderingContext2D;
  project: Project;
  onRendered?: (node: Node, renderInfo: any) => void;
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
  renderInfo.onRendered?.(page, {
    type: "page",
    transform: context.getTransform(),
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

  path2d.moveTo(path.points[0].x, path.points[0].y);
  for (const point of path.points) {
    path2d.lineTo(point.x, point.y);
  }

  context.save();
  context.translate(translation.x, translation.y);
  for (const fill of fills) {
    switch (fill.type) {
      case "color":
        context.fillStyle = fill.value;
        context.fill(path2d);
        break;
    }
  }
  renderInfo.onRendered?.(cell, {
    type: "cell",
    transform: context.getTransform(),
    path: path2d,
  });
  context.restore();
}
