import { expect } from "../utils/assert.js";

export class Viewport {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = expect(
      canvas.getContext("2d"),
      "Canvas 2D context could not be created",
    );

    this.render();
  }

  setCanvasListeners() {
    this.#canvas.addEventListener("resize", this.renderThrottled);
  }

  #renderQueued = false;
  renderThrottled() {
    if (this.#renderQueued) return;
    this.#renderQueued = true;
    requestAnimationFrame(() => {
      this.#renderQueued = false;
      this.render();
    });
  }

  render() {
    this.#ctx.fillStyle = "#333";
    this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
  }
}
