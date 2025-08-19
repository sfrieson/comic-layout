import { expect } from "../utils/assert.js";
import { store as appStore } from "./App.js";

export class Viewport {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = expect(
      canvas.getContext("2d"),
      "Canvas 2D context could not be created",
    );

    this.#setCanvasSize();

    this.setCanvasListeners();
  }

  setCanvasListeners() {
    // resizeobserver
    const resizeObserver = new ResizeObserver(() => {
      this.#setCanvasSize();
    });
    resizeObserver.observe(this.#canvas);
  }

  #setCanvasSize() {
    console.log("setCanvasSize");
    const { width, height } =
      this.#canvas.parentElement!.getBoundingClientRect();
    this.#canvas.width = width * devicePixelRatio;
    this.#canvas.height = height * devicePixelRatio;
    this.#ctx.scale(devicePixelRatio, devicePixelRatio);

    this.#render();
  }

  #renderQueued = false;
  render() {
    if (this.#renderQueued) return;
    this.#renderQueued = true;
    requestAnimationFrame(() => {
      this.#renderQueued = false;
      this.#render();
    });
  }

  #render() {
    this.#ctx.fillStyle = "#333";
    this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    const project = appStore.getState().project;
    if (!project) return;

    // const focus = 0;
    const context = this.#ctx;
    context.save();
    context.translate(
      this.#canvas.width / devicePixelRatio / 2,
      this.#canvas.height / devicePixelRatio / 2,
    );
    // context.scale(focus, focus);

    for (const page of project.pages) {
      context.save();
      context.translate(-page.artboard.width / 2, -page.artboard.height / 2);
      const { width, height } = page.artboard;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, page.artboard.width, page.artboard.height);
      context.strokeStyle = "#000";
      const lineWidth = 1;
      context.lineWidth = lineWidth;
      context.strokeRect(
        -lineWidth,
        -lineWidth,
        width + lineWidth * 2,
        height + lineWidth * 2,
      );
      context.restore();

      context.translate(width, 0);
    }

    context.restore();
  }
}
