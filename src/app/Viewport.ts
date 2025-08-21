import { screenToWorld, ViewportRenderer } from "../renderer/Renderer.js";
import { assert, expect } from "../utils/assert.js";
import { store } from "./App.js";

export class Viewport {
  #canvas: HTMLCanvasElement;
  #renderer: ViewportRenderer;
  #interactvity: Interactvity;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#renderer = new ViewportRenderer(canvas);
    this.#interactvity = new Interactvity(canvas, store);

    this.#setCanvasSize();

    this.#setCanvasListeners();

    store.subscribe((state) => {
      this.#setUIStateListener(state.ui);
      this.#interactvity.onStateChange(state);
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
    this.#canvas.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        // `ctrlKey` is set by the browser and doesn't need the key to be pressed
        e.preventDefault(); // don't zoom the browser
        store.getState().setZoom(store.getState().ui.zoom + e.deltaY * -0.0125);
      } else {
        store.getState().setPan({
          x: store.getState().ui.pan.x - e.deltaX,
          y: store.getState().ui.pan.y - e.deltaY,
        });
      }
    });

    this.#canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;

      this.#select(e.clientX, e.clientY);
    });
  }

  onStateChange({ project, ui }: ReturnType<typeof store.getState>) {
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
  }
}
