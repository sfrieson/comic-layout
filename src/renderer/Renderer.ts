import { Cell, Page, Project, Node } from "../project/Project.js";
import { expect } from "../utils/assert.js";
import { vec2Div, vec2Sub } from "../utils/vec2.js";

interface UI {
  zoom: number;
  pan: { x: number; y: number };
  canvasColor: string;
  activePage: string;
  selection: Set<Node>;
}

/** Manages rendering the screen of the application, which could be multiple pages as well as UI elements. */
export class ViewportRenderer {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = expect(canvas.getContext("2d"), "Canvas context not created");
  }

  #scope(fn: (context: CanvasRenderingContext2D) => void) {
    this.#ctx.save();
    fn(this.#ctx);
    this.#ctx.restore();
  }

  render(project: Project, ui: UI) {
    const context = this.#ctx;
    context.fillStyle = ui.canvasColor;
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    const uiRenders = [] as (() => void)[];
    this.#scope((context) => {
      context.scale(devicePixelRatio, devicePixelRatio);
      context.translate(ui.pan.x, ui.pan.y);
      context.scale(ui.zoom, ui.zoom);
      const screen = (n: number) => n / devicePixelRatio / ui.zoom;
      const registerUI = (cb: () => void) => {
        uiRenders.push(cb);
      };
      const renderInfo: UIRenderInfo = {
        screen,
        context,
        project,
        ui,
        registerUI,
      };

      let selectedI = -1;
      for (const [i, page] of project.pages.entries()) {
        this.#scope((context) => {
          const { id, width } = page;
          if (id === ui.activePage) {
            selectedI = i;
          }
          context.translate(width * i, 0);

          // TODO: Mask the area of the page that is not visible in the viewport, (but also support removing the mask)
          renderPage(renderInfo, page);
          renderPageUI(renderInfo, page);
        });
      }
      for (const uiRender of uiRenders) {
        uiRender();
      }
    });
  }
}

interface RenderInfo {
  screen: (n: number) => number;
  context: CanvasRenderingContext2D;
  project: Project;
}

interface UIRenderInfo extends RenderInfo {
  ui: UI;
  registerUI: (cb: () => void) => void;
}

function renderPage(
  renderInfo: UIRenderInfo,
  { id, width, height, fills, children }: Page,
) {
  const { context } = renderInfo;
  for (const fill of fills) {
    switch (fill.type) {
      case "color":
        context.fillStyle = fill.value;
        context.fillRect(0, 0, width, height);
        break;
    }
  }
  if (renderInfo.ui.activePage === id) {
    const transform = context.getTransform();
    renderInfo.registerUI(() => {
      renderSelectedPageUI(renderInfo, {
        width,
        height,
        transform,
      });
    });
  }
  for (const child of children) {
    if (child.type === "cell") {
      renderCell(renderInfo, child);
    }
  }
}

function renderPageUI(
  { context, screen }: UIRenderInfo,
  { width, height }: Page,
) {
  context.strokeStyle = "#000";
  context.lineWidth = screen(1);
  context.strokeRect(
    screen(-0.5),
    screen(-0.5),
    width + screen(1),
    height + screen(1),
  );
}
function renderSelectedPageUI(
  { context, screen }: UIRenderInfo,
  {
    width,
    height,
    transform,
  }: { width: number; height: number; transform: DOMMatrix },
) {
  context.save();
  context.setTransform(transform);
  context.strokeStyle = "#0ff";
  context.lineWidth = screen(2);
  context.strokeRect(
    screen(-1),
    screen(-1),
    width + screen(2),
    height + screen(2),
  );
  context.restore();
}

function renderCell(renderInfo: UIRenderInfo, cell: Cell) {
  const { context, ui, registerUI } = renderInfo;
  const { translation, path, fills } = cell;
  const path2d = new Path2D();
  path2d.moveTo(path.points[0].x, path.points[0].y);
  for (const point of path.points) {
    path2d.lineTo(point.x, point.y);
  }
  if (ui.selection.has(cell)) {
    const transform = context.getTransform();
    registerUI(() => {
      renderCellUI(renderInfo, {
        transform,
        path: path2d,
      });
    });
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
  context.restore();
}

function renderCellUI(
  { context, screen }: UIRenderInfo,
  { transform, path }: { transform: DOMMatrix; path: Path2D },
) {
  context.save();
  context.setTransform(transform);
  context.strokeStyle = "#00ffff";
  context.lineWidth = screen(2);
  context.stroke(path);
  context.restore();
}

export function screenToWorld(
  pos: { x: number; y: number },
  ui: { pan: { x: number; y: number }; zoom: number },
) {
  return vec2Div(vec2Sub(pos, ui.pan), ui.zoom);
}
