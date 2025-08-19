import { Renderer } from "../renderer/Renderer.js";
import { expect } from "../utils/assert.js";
import { store as appStore } from "./App.js";

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

    this.setCanvasListeners();
  }

  setCanvasListeners() {
    // resizeobserver
    const resizeObserver = new ResizeObserver(() => {
      this.#setCanvasSize();
    });
    resizeObserver.observe(this.#canvas);

    this.#canvas.addEventListener("mousedown", (e) => {
      console.log("mousedown", e);
    });
    this.#canvas.addEventListener("mouseup", (e) => {
      console.log("mouseup", e);
    });

    this.#canvas.addEventListener("mousemove", (e) => {
      console.log("mousemove", e);
    });

    this.#canvas.addEventListener("mouseleave", (e) => {
      console.log("mouseleave", e);
    });

    this.#canvas.addEventListener("mouseenter", (e) => {
      console.log("mouseenter", e);
    });

    this.#canvas.addEventListener("mouseover", (e) => {
      console.log("mouseover", e);
    });

    this.#canvas.addEventListener("mouseout", (e) => {
      console.log("mouseout", e);
    });

    this.#canvas.addEventListener("mousewheel", (e) => {
      console.log("mousewheel", e);
    });

    this.#canvas.addEventListener("wheel", (e) => {
      console.log("wheel", e);
    });

    this.#canvas.addEventListener("contextmenu", (e) => {
      console.log("contextmenu", e);
    });
  }

  #setCanvasSize() {
    const { width, height } =
      this.#canvas.parentElement!.getBoundingClientRect();
    this.#canvas.width = width * devicePixelRatio;
    this.#canvas.height = height * devicePixelRatio;
    this.#ctx.scale(devicePixelRatio, devicePixelRatio);

    this.#renderer.render(
      expect(appStore.getState().project, "Project not found"),
    );
  }

  #renderQueued = false;
  render() {
    if (this.#renderQueued) return;
    this.#renderQueued = true;
    requestAnimationFrame(() => {
      this.#renderQueued = false;
      this.#renderer.render(
        expect(appStore.getState().project, "Project not found"),
      );
    });
  }
}
