import { Project } from "../project/Project.js";
import { expect } from "../utils/assert.js";

type UI = {
  zoom: number;
  pan: { x: number; y: number };
};
export class Renderer {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = expect(canvas.getContext("2d"), "Canvas context not created");
  }

  render(project: Project, ui: UI) {
    const context = this.#ctx;
    context.fillStyle = "#333";
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    const width = this.#canvas.width / devicePixelRatio;
    const height = this.#canvas.height / devicePixelRatio;
    const screen = (n: number) => n / devicePixelRatio / ui.zoom;
    // const focus = 0;
    context.save();
    context.translate(width / 2 + ui.pan.x, height / 2 + ui.pan.y);
    context.scale(ui.zoom, ui.zoom);

    for (const page of project.pages) {
      const lineWidth = screen(1);
      context.save();
      context.translate(-page.artboard.width / 2, -page.artboard.height / 2);
      const { width, height } = page.artboard;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, page.artboard.width, page.artboard.height);
      context.strokeStyle = "#000";
      context.lineWidth = lineWidth;
      context.strokeRect(0, 0, width, height);
      context.restore();

      context.translate(width + lineWidth, 0); // overlapping lines
    }

    context.restore();
  }
}
