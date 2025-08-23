import { Page, Project } from "../project/Project.js";
import { expect } from "../utils/assert.js";
import { vec2Div, vec2Sub } from "../utils/vec2.js";

interface UI {
  zoom: number;
  pan: { x: number; y: number };
  canvasColor: string;
  activePage: string;
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

    this.#scope((context) => {
      context.scale(devicePixelRatio, devicePixelRatio);
      context.translate(ui.pan.x, ui.pan.y);
      context.scale(ui.zoom, ui.zoom);
      const screen = (n: number) => n / devicePixelRatio / ui.zoom;
      const renderInfo: UIRenderInfo = {
        screen,
        context,
        project,
        ui,
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
      const selectedPage = project.pages[selectedI];
      if (selectedPage) {
        this.#scope((context) => {
          context.translate(selectedPage.width * selectedI, 0);
          renderSelectedPageUI(renderInfo, selectedPage);
        });
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
}

function renderPage({ context }: RenderInfo, { width, height, fills }: Page) {
  for (const fill of fills) {
    switch (fill.type) {
      case "color":
        context.fillStyle = fill.value;
        context.fillRect(0, 0, width, height);
        break;
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
  { width, height }: Page,
) {
  context.strokeStyle = "#0ff";
  context.lineWidth = screen(2);
  context.strokeRect(
    screen(-1),
    screen(-1),
    width + screen(2),
    height + screen(2),
  );
}

export function screenToWorld(
  pos: { x: number; y: number },
  ui: { pan: { x: number; y: number }; zoom: number },
) {
  return vec2Div(vec2Sub(pos, ui.pan), ui.zoom);
}
