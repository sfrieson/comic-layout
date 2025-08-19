import { store } from "./App.js";
import { expect } from "../utils/assert.js";
import { Page, Project } from "../project/Project.js";

const getProject = () => expect(store.getState().project, "Project not found");

const listeners = new Set<(project: Project) => void>();

export function requestRender() {
  const project = getProject();
  project.meta._changes++;
  listeners.forEach((listener) => listener(project));
}

export function subscribeToChanges(listener: (project: Project) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const setName = (name: string) => {
  getProject().meta.name = name;
  requestRender();
};

export const setPageDimensions = (width: number, height: number) => {
  getProject().pages.forEach((page) => {
    page.artboard.width = width;
    page.artboard.height = height;
  });
  requestRender();
};

export const addPage = () => {
  getProject().pages.push(Page.create({ width: 100, height: 100 }));
  requestRender();
};
