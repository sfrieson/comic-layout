import { Project } from "../project/Project.js";
import { expect } from "../utils/assert.js";

export class Renderer {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = expect(canvas.getContext("2d"), "Canvas context not created");
  }

  render(project: Project) {
    const context = this.#ctx;
    context.fillStyle = "#333";
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    const width = this.#canvas.width / devicePixelRatio;
    const height = this.#canvas.height / devicePixelRatio;
    // const focus = 0;
    context.save();
    context.translate(width / 2, height / 2);

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
