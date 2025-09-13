import { type RenderInfo, renderNode } from "../renderer/Renderer.js";
import type { Project } from "../project/Project.js";
import { projectAssetsTable } from "./db.js";
import { WithCleanup } from "../utils/Composition.js";
import { downloadURL, loadImageFromURL } from "../utils/file.js";
import { requirePageDimensions } from "./projectSelectors.js";

if (import.meta.hot) {
  import.meta.hot.accept("../renderer/Renderer.ts", (e) => {
    _renderNode = e?.renderNode;
  });
}

let _renderNode = renderNode;
export async function exportPages(project: Project, name: string = "Comic") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to get context");
  const cleanup = new WithCleanup();

  const imageMap = new Map<number, HTMLImageElement>();
  for (const assetId of project.images) {
    const asset = await projectAssetsTable.getAsset(assetId);
    const urlObj = URL.createObjectURL(asset);
    cleanup.addCleanup(() => {
      URL.revokeObjectURL(urlObj);
    });
    const image = await loadImageFromURL(urlObj);
    image.src = urlObj;

    imageMap.set(assetId, image);
  }

  const renderInfo: RenderInfo = {
    context,
    project,
    imageMap,
  };
  let pageNumber = 0;
  const { width, height } = requirePageDimensions();
  canvas.width = width;
  canvas.height = height;
  for (const page of project.children.toArray()) {
    if (page.type !== "page") continue;
    pageNumber++;
    context.clearRect(0, 0, canvas.width, canvas.height);
    _renderNode(renderInfo, page);
    const url = canvas.toDataURL();
    downloadURL(url, `${name} - Page ${pageNumber}.png`);
  }
  cleanup.cleanup();
}
