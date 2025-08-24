import { Cell, Page, Project } from "../project/Project.js";
import { RenderInfo, renderPage } from "../renderer/Renderer.js";
import { assert, expect } from "../utils/assert.js";
import { eventVec2, vec2Add, vec2mult, vec2Sub } from "../utils/vec2.js";
import { store } from "./App.js";
import React from "react";
import ReactDOM from "react-dom/client";
import { RootSVG, Data as UIData } from "../ui/editing/ViewportRoot.js";
import { ExtractState } from "zustand";
import { nodeToBB, screenToWorld } from "../utils/viewportUtils.js";

export class Viewport {
  #root: HTMLElement;
  #renderer: ViewportRenderer;
  #canvas: HTMLCanvasElement;
  #svgContainer: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#canvas = document.createElement("canvas");
    this.#canvas.classList.add("w-full", "h-full");
    this.#svgContainer = document.createElement("div");
    this.#svgContainer.classList.add(
      "w-full",
      "h-full",
      "absolute",
      "top-0",
      "left-0",
    );
    this.#root.appendChild(this.#canvas);
    this.#root.appendChild(this.#svgContainer);
    this.#renderer = new ViewportRenderer(this.#canvas, this.#svgContainer);

    this.#setCanvasSize();

    this.#setCanvasListeners();

    store.subscribe((state) => {
      this.#setUIStateListener(state.ui);
    });
  }

  #previousUIState: unknown;
  #setUIStateListener(ui: unknown) {
    if (ui === this.#previousUIState) return;
    this.#previousUIState = ui;
    this.#queueRender();
  }

  #setCanvasListeners() {
    // resizeobserver
    const resizeObserver = new ResizeObserver(() => {
      this.#setCanvasSize();
    });
    resizeObserver.observe(this.#canvas);
  }

  #setCanvasSize() {
    const { width, height } =
      this.#canvas.parentElement!.getBoundingClientRect();
    this.#canvas.width = width * devicePixelRatio;
    this.#canvas.height = height * devicePixelRatio;

    this.#render(); // render immediately because changing canvas sizes clears the canvas
  }

  // public render method
  render() {
    this.#queueRender();
  }

  #renderRequested = false;
  #queueRender() {
    if (this.#renderRequested) return;
    this.#renderRequested = true;
    requestAnimationFrame(() => {
      this.#render();
    });
  }

  #render() {
    const { ui, project } = store.getState();
    this.#renderRequested = false;
    this.#renderer.render(expect(project, "Project not found"), ui);
  }
}

function interactivity() {
  function select(x: number, y: number) {
    const { project, ui } = store.getState();
    assert(project, "Project not found");
    const worldPos = screenToWorld({ x, y }, ui);

    if (!project.pages.length) return;

    const deselect = () => store.getState().setActivePage("");

    let found = null;
    for (const [i, page] of project.pages.entries()) {
      if (
        worldPos.x > page.width * i &&
        worldPos.x < page.width * (i + 1) &&
        worldPos.y > 0 &&
        worldPos.y < page.height
      ) {
        found = page;
        break;
      }
    }
    if (!found) {
      deselect();
      return;
    }

    if (found && found.id !== ui.activePage) {
      store.getState().setActivePage(found.id);
      return;
    }

    // TODO: selection is in the active page. Select from elements in the active page.

    let clicked = false;
    const pageTranslation = project.pages.indexOf(found);
    found.children.forEach((child) => {
      const bb = nodeToBB(child, { x: pageTranslation * found.width, y: 0 });
      if (!bb) return;

      if (bb.contains(worldPos)) {
        clicked = true;
        store.getState().setSelectedNodes([child]);
        return;
      }
    });
    if (!clicked) {
      store.getState().setSelectedNodes([]);
    }
  }
  return {
    onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey) {
        // `ctrlKey` is set by the browser and doesn't need the key to be pressed
        e.preventDefault(); // don't zoom the browser
        const clientPos = eventVec2(e);
        const zoomOrigin = screenToWorld(clientPos, store.getState().ui);
        const currentZoom = store.getState().ui.zoom;
        const pan = store.getState().ui.pan;
        const zoomDelta = e.deltaY * -0.0125;
        const originDelta = vec2Sub(
          vec2mult(zoomOrigin, currentZoom),
          vec2mult(zoomOrigin, currentZoom + zoomDelta),
        );

        store
          .getState()
          .setZoom(currentZoom + zoomDelta, vec2Add(pan, originDelta));
      } else {
        store.getState().setPan({
          x: store.getState().ui.pan.x - e.deltaX,
          y: store.getState().ui.pan.y - e.deltaY,
        });
      }
    },

    onMouseDown(e: MouseEvent) {
      console.log(e.target);
      if (e.button !== 0) return;

      select(e.clientX, e.clientY);
    },
  };
}

export type RenderCallbackOptions =
  | {
      type: "page";
      node: Page;
      renderInfo: {
        transform: DOMMatrix;
      };
    }
  | {
      type: "cell";
      node: Cell;
      renderInfo: {
        transform: DOMMatrix;
        path: Path2D;
      };
    };

export type RenderCallback = (options: RenderCallbackOptions) => void;

/** Manages rendering the screen of the application, which could be multiple pages as well as UI elements. */
export class ViewportRenderer {
  #canvas: HTMLCanvasElement;
  #root: ReactDOM.Root;
  ctx: CanvasRenderingContext2D;
  #interactivity: ReturnType<typeof interactivity>;
  constructor(canvas: HTMLCanvasElement, svgContainer: HTMLDivElement) {
    this.#canvas = canvas;
    this.ctx = expect(canvas.getContext("2d"), "Canvas context not created");
    this.#root = ReactDOM.createRoot(svgContainer);
    this.#interactivity = interactivity();
  }

  destroy() {
    this.#root.unmount();
  }

  #scope(fn: (context: CanvasRenderingContext2D) => void) {
    this.ctx.save();
    fn(this.ctx);
    this.ctx.restore();
  }

  render(project: Project, ui: ExtractState<typeof store>["ui"]) {
    const context = this.ctx;
    context.fillStyle = ui.canvasColor;
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    const uiData: UIData[] = [];
    const addUIData = (data: UIData) => {
      if ("active" in data && data.active) {
        uiData.unshift(data);
        return;
      }
      if ("selected" in data && data.selected) {
        uiData.push(data);
        return;
      }
      uiData.push(data);
    };

    this.#scope((context) => {
      context.scale(devicePixelRatio, devicePixelRatio);
      context.translate(ui.pan.x, ui.pan.y);
      context.scale(ui.zoom, ui.zoom);
      const screen = (n: number) => n / devicePixelRatio / ui.zoom;
      const renderInfo: RenderInfo = {
        screen,
        context,
        project,
        onRendered(opt) {
          // decide if clickable
          // decide if it needs UI
          switch (opt.type) {
            case "page":
              if (ui.activePage !== opt.node.id) return;
              addUIData({
                type: "page",
                node: opt.node,
                transform: opt.renderInfo.transform,
                active: true,
                width: opt.node.width,
                height: opt.node.height,
              });
              break;
            case "cell":
              if (!ui.selection.has(opt.node)) return;
              addUIData({
                type: "cell",
                node: opt.node,
                transform: opt.renderInfo.transform,
                path: opt.renderInfo.path,
                selected: true,
              });
              break;
          }
        },
      };

      for (const [i, page] of project.pages.entries()) {
        this.#scope((context) => {
          const { width } = page;
          context.translate(width * i, 0);
          this.#scope(() => {
            // TODO: Mask the area of the page that is not visible in the viewport, (but also support removing the mask)
            renderPage(renderInfo, page);
          });
        });
      }
    });

    this.#root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(RootSVG, {
          data: uiData,
          width: this.#canvas.width,
          height: this.#canvas.height,
          onWheel: this.#interactivity.onWheel,
          onMouseDown: this.#interactivity.onMouseDown,
        }),
      ),
    );
  }
}
