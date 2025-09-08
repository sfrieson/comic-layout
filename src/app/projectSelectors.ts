import { assert, expect } from "../utils/assert.js";
import { store } from "./App.js";

export const requirePageDimensions = () => {
  for (const page of requireProject().children.toArray()) {
    if (page.type !== "page") continue;
    return { width: page.width, height: page.height };
  }
  throw new Error("No page found");
};
export const requireProject = () =>
  expect(store.getState().project, "Project not found");
export const requirePage = (pageId: string) => {
  const project = requireProject();
  const page = expect(project.nodeMap.get(pageId), "Page node not found");
  assert(page.type === "page", "Node is not a page");
  return page;
};
const requireCell = (cellId: string) => {
  const project = requireProject();
  const cell = expect(project.nodeMap.get(cellId), "Cell node not found");
  assert(cell.type === "cell", "Node is not a cell");
  return cell;
};
