import { Node } from "../project/Project.js";
import { screenToWorld, ViewportRenderer } from "../renderer/Renderer.js";
import { assert, expect } from "../utils/assert.js";
import { eventVec2, vec2Add, vec2mult, vec2Sub } from "../utils/vec2.js";
import { store } from "./App.js";

export class Viewport {
  #canvas: HTMLCanvasElement;
  #renderer: ViewportRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#renderer = new ViewportRenderer(canvas);
    new Interactvity(canvas, store);

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
    this.render();
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

    this.#renderer.render(
      expect(store.getState().project, "Project not found"),
      store.getState().ui,
    );
  }

  #renderQueued = false;
  render() {
    if (this.#renderQueued) return;
    this.#renderQueued = true;
    requestAnimationFrame(() => {
      this.#renderQueued = false;
      this.#renderer.render(
        expect(store.getState().project, "Project not found"),
        store.getState().ui,
      );
    });
  }
}

class Interactvity {
  #canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement, s: typeof store) {
    s.subscribe((state) => {
      this.onStateChange(state);
    });
    this.#canvas = canvas;
    this.onStateChange(s.getState());
    this.#setCanvasListeners();
  }

  #setCanvasListeners() {
    this.#canvas.addEventListener(
      "wheel",
      (e) => {
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
      { passive: false },
    );

    this.#canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;

      this.#select(e.clientX, e.clientY);
    });
  }

  onStateChange({ project }: ReturnType<typeof store.getState>) {
    assert(project, "Project not found");

    // const view = {
    //   x: ui.pan.x,
    //   y: ui.pan.y,
    //   width: this.#canvas.width / ui.zoom,
    //   height: this.#canvas.height / ui.zoom,
    // };

    // const qt = quadTree(
    //   {
    //     x: view.x + view.width / 2,
    //     y: view.y + view.height / 2 - (view.width - view.height) / 2, // bbox is square, so we need to offset the y to center the bbox
    //   },
    //   view.width / 2,
    // );
  }

  #select(x: number, y: number) {
    const { project, ui } = store.getState();
    assert(project, "Project not found");
    const worldPos = screenToWorld({ x, y }, ui);

    const deselect = () => store.getState().setActivePage("");

    const aPage = project.pages.at(0);

    if (!aPage) return;

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
    console.log("click on active page");
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
}

function nodeToBB(node: Node, offset: { x: number; y: number }) {
  if (node.type === "cell") {
    return aabbFromPoints(node.path.points, offset);
  }
  return null;
}

function aabbFromPoints(
  points: { x: number; y: number }[],
  offset: { x: number; y: number },
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
