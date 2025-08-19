import { store } from "./App.js";
import { expect } from "../utils/assert.js";
import { Page, Project } from "../project/Project.js";

const getProject = () => expect(store.getState().project, "Project not found");

const listeners = new Set<(project: Project) => void>();

function requestRender() {
  const project = getProject();
  project.meta._changes++;
  listeners.forEach((listener) => listener(project));
}

const uiUpdated = requestRender; // TODO: Only needs to update UI, not the renderer
const projectUpdated = requestRender;

export function subscribeToChanges(listener: (project: Project) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const setName = (name: string) => {
  const { history } = store.getState();
  const originalName = getProject().meta.name;
  history.add(
    history.actionSet(
      () => {
        getProject().meta.name = name;
        uiUpdated();
      },
      () => {
        getProject().meta.name = originalName;
        uiUpdated();
      },
    ),
  );
};

export const setPageDimensions = (width: number, height: number) => {
  const { history } = store.getState();
  const originalDimensions = Object.fromEntries(
    getProject().pages.map((page) => [
      page.id,
      {
        width: page.width,
        height: page.height,
      },
    ]),
  );
  history.add(
    history.actionSet(
      () => {
        getProject().pages.forEach((page) => {
          page.width = width;
          page.height = height;
        });
        projectUpdated();
      },
      () => {
        getProject().pages.forEach((page) => {
          const { width, height } = expect(
            originalDimensions[page.id],
            "Original dimensions not found",
          );
          page.width = width;
          page.height = height;
        });
        projectUpdated();
      },
    ),
  );
};

export const addPage = () => {
  getProject().pages.push(Page.create({ width: 100, height: 100 }));
  requestRender();
};
