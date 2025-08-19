import { Renderer } from "../renderer/Renderer.js";
import { expect } from "../utils/assert.js";
import { store } from "./App.js";

export class Viewport {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #renderer: Renderer;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = expect(
      canvas.getContext("2d"),
      "Canvas 2D context could not be created",
    );
    this.#renderer = expect(new Renderer(canvas), "Renderer not found");

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
  }

  #setCanvasSize() {
    const { width, height } =
      this.#canvas.parentElement!.getBoundingClientRect();
    this.#canvas.width = width * devicePixelRatio;
    this.#canvas.height = height * devicePixelRatio;
    this.#ctx.scale(devicePixelRatio, devicePixelRatio);

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
