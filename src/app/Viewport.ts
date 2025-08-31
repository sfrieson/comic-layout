import type { Node, Project } from "../project/Project.js";
import { type RenderInfo, renderPage } from "../renderer/Renderer.js";
import { assert, expect } from "../utils/assert.js";
import { eventVec2, Vec2, vec2Add, vec2Mult, vec2Sub } from "../utils/vec2.js";
import { store } from "./App.js";
import React from "react";
import ReactDOM from "react-dom/client";
import { RootSVG, type Data as UIData } from "../ui/editing/ViewportRoot.js";
import type { ExtractState } from "zustand";
import {
  aabbFromRect,
  nodeHitTest,
  screenToWorld,
} from "../utils/viewportUtils.js";
import { scaleNode, translateNode } from "./projectActions.js";
import { WithCleanup } from "../utils/Composition.js";
import { projectAssetsTable } from "./db.js";
import { loadImageFromURL } from "../utils/file.js";

export class Viewport extends WithCleanup {
  #root: HTMLElement;
  #renderer: ViewportRenderer;
  #canvas: HTMLCanvasElement;
  #svgContainer: HTMLDivElement;

  constructor(root: HTMLElement) {
    super();
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

    this.addCleanup(() => {
      this.#renderer.destroy();
    });

    this.#setCanvasSize();

    this.#setCanvasListeners();

    store.subscribe((state) => {
      this.#setUIStateListener(state.ui);
    });

    if (import.meta.hot) {
      import.meta.hot.accept("../renderer/Renderer.ts", (e) => {
        this.render();
      });
    }
  }

  destroy() {
    this.cleanup();
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

  #imageCacheLoading = new Set<number>();
  #imageCache = new Map<number, HTMLImageElement>();
  async #backgroundLoadImage(assetId: number) {
    if (this.#imageCache.has(assetId)) return;
    if (this.#imageCacheLoading.has(assetId)) return;
    try {
      this.#imageCacheLoading.add(assetId);
      const asset = await projectAssetsTable.getAsset(assetId);
      const urlObj = URL.createObjectURL(asset);
      this.addCleanup(() => {
        URL.revokeObjectURL(urlObj);
        this.#imageCache.delete(assetId);
      });
      const image = await loadImageFromURL(urlObj);
      image.src = urlObj;

      this.#imageCache.set(assetId, image);
      requestAnimationFrame(() => {
        this.#queueRender();
      });
    } catch (e) {
      console.error("error loading", assetId);
    } finally {
      this.#imageCacheLoading.delete(assetId);
    }
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
    const images = store.getState().project?.images ?? [];
    for (const assetId of images) {
      this.#backgroundLoadImage(assetId);
    }
  }

  #render() {
    const { ui, project } = store.getState();
    this.#renderRequested = false;
    this.#renderer.render(expect(project, "Project not found"), ui, {
      imageMap: this.#imageCache,
    });
  }
}

function interactivity() {
  function select(x: number, y: number) {
    const { project, ui } = store.getState();
    assert(project, "Project not found");
    if (!project.pages.length) return;

    const deselect = () => store.getState().setActivePage("");

    const worldPos = screenToWorld({ x, y }, ui);

    let foundPage = null;
    let foundPageBB = null;
    for (const [i, page] of project.pages.entries()) {
      const bb = aabbFromRect({
        x: page.width * i,
        y: 0,
        width: page.width,
        height: page.height,
      });
      if (bb.contains(worldPos)) {
        foundPage = page;
        foundPageBB = bb;
        break;
      }
    }

    if (!foundPage || !foundPageBB) {
      deselect();
      return;
    }

    if (foundPage && foundPage.id !== ui.activePage) {
      store.getState().setActivePage(foundPage.id);
      return;
    }

    // TODO: selection is in the active page. Select from elements in the active page.

    function findClickedChild(clickPos: Vec2, children: Node[]) {
      // forEach works here since we want to go top down (visibility order, not render order)
      for (const child of children) {
        if (nodeHitTest(child, clickPos)) {
          const childClicked = findClickedChild(
            vec2Sub(clickPos, child.translation),
            child.children.toArray(),
          );
          if (childClicked) {
            return true;
          }
          store.getState().setSelectedNodes([child]);
          return true;
        }
      }

      return false;
    }

    const clicked = findClickedChild(
      vec2Sub(worldPos, foundPageBB),
      foundPage.children.toArray(),
    );

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
          vec2Mult(zoomOrigin, currentZoom),
          vec2Mult(zoomOrigin, currentZoom + zoomDelta),
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
      if (e.button !== 0) return;

      if (e.target instanceof SVGElement && e.target.dataset.nodeId) {
        const node = expect(
          store.getState().project?.nodeMap.get(e.target.dataset.nodeId),
          "Node not found",
        );
        store.getState().setSelectedNodes([node]);
        return;
      }

      select(e.clientX, e.clientY);
    },
  };
}

// supports over HMR
let _renderPage = renderPage;
/** Manages rendering the screen of the application, which could be multiple pages as well as UI elements. */
class ViewportRenderer {
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

  render(
    project: Project,
    ui: ExtractState<typeof store>["ui"],
    grabBag: { imageMap: Map<number, HTMLImageElement> },
  ) {
    const context = this.ctx;
    context.fillStyle = ui.canvasColor;
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    const uiData: UIData[] = [];

    this.#scope((context) => {
      context.scale(devicePixelRatio, devicePixelRatio);
      context.translate(ui.pan.x, ui.pan.y);
      context.scale(ui.zoom, ui.zoom);
      // const screen = (n: number) => n / devicePixelRatio / ui.zoom;
      const renderInfo: RenderInfo = {
        context,
        project,
        imageMap: grabBag.imageMap,
        onRendered(opt) {
          // decide if clickable
          // decide if it needs UI
          const onActivePage: Map<Node, boolean> = new Map();
          function isOnActivePage(node: Node) {
            if (node.type === "page") {
              return ui.activePage === node.id;
            }
            if (!onActivePage.has(node)) {
              onActivePage.set(node, isOnActivePage(node.parent));
            }
            return !!onActivePage.get(node);
          }
          if (opt.type === "page") {
            if (ui.activePage !== opt.node.id) return;
            uiData.push({
              type: "page",
              node: opt.node,
              transform: opt.renderInfo.transform,
              active: true,
              width: opt.node.width,
              height: opt.node.height,
            });
            return;
          }
          if (!isOnActivePage(opt.node)) return;
          switch (opt.type) {
            case "rect-like":
              uiData.push({
                type: "rect-like",
                node: opt.node,
                transform: opt.renderInfo.transform,
                path: opt.renderInfo.path,
                selected: ui.selection.has(opt.node),
              });
              break;
            case "text_path-aligned":
              uiData.push(opt);
              break;
            default: {
              const _unreachable: never = opt;
            }
          }
        },
      };

      for (const [i, page] of project.pages.entries()) {
        this.#scope((context) => {
          const { width } = page;
          context.translate(width * i, 0);
          this.#scope(() => {
            // TODO: Mask the area of the page that is not visible in the viewport, (but also support removing the mask)
            _renderPage(renderInfo, page);
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
          scaleNode: scaleNode,
          translateCell: translateNode,
        }),
      ),
    );
  }
}

if (import.meta.hot) {
  import.meta.hot.accept("../renderer/Renderer.ts", (e) => {
    _renderPage = e?.renderPage;
  });
}
