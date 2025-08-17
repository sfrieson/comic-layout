import { createStore, useStore } from "zustand";

import { createProjectStore, loadProjectFile } from "../project/Project.js";
import type { Project } from "../project/types.js";
import { Viewport } from "./Viewport.js";
import { expect } from "../utils/assert.js";

interface AppState {
  fileHandle: FileSystemFileHandle | null;
  project: ReturnType<typeof createProjectStore> | null;
  canvas: HTMLCanvasElement | null;
  viewport: Viewport | null;
  selection: Selection | null;
  registerCanvas: (canvas: HTMLCanvasElement) => void;
  unregisterCanvas: (canvas: HTMLCanvasElement) => void;
  openFile: () => Promise<void>;
  newFile: () => Promise<void>;
  saveProject: () => void;
}

export const store = createStore<AppState>(() => {
  const onProjectStateChange = () => {
    store.getState().saveProject();
  };

  let unsubscriptToProject: () => void;

  let writesArePending = false;

  async function saveProject() {
    console.log("saveProject");
    writesArePending = true;
    const project = store.getState().project;
    const fileHandle = store.getState().fileHandle;
    if (!project || !fileHandle) return;
    const data = new Blob([project.actions.toJSON()], {
      type: "application/json",
    });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  function createProject(json?: string) {
    let projectData;
    if (json) projectData = loadProjectFile(json);
    console.log({ projectData, json });
    const project = createProjectStore(projectData);

    unsubscriptToProject?.();
    store.setState({ project });
    unsubscriptToProject = project.store.subscribe(onProjectStateChange);
  }

  const appState: AppState = {
    fileHandle: null,
    project: null,
    canvas: null,
    viewport: null,
    selection: null,
    registerCanvas: (canvas: HTMLCanvasElement) => {
      store.setState({ canvas, viewport: new Viewport(canvas) });
    },
    unregisterCanvas: (canvas: HTMLCanvasElement) => {
      store.setState((state) =>
        state.canvas === canvas ? { canvas: null, viewport: null } : state,
      );
    },
    async newFile() {
      const fileHandle = await window.showSaveFilePicker({
        types: [
          {
            description: "Comic Layout File",
            accept: { "application/json": [".json"] },
          },
        ],
        suggestedName: "NewComic.json",
        startIn: "desktop",
      });
      createProject();
      store.setState({ fileHandle });
    },

    async openFile() {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Comic Layout File",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();

      const reader = new FileReader();
      reader.onload = (e) => {
        const string = e.target?.result as string;
        store.setState({ fileHandle });
        createProject(string);
      };

      reader.onerror = (e) => {
        store.setState({ fileHandle: null });
        console.error(e);
      };
      reader.readAsText(file);
    },

    saveProject() {
      // throttled
      if (writesArePending) return;
      writesArePending = true;
      const saveNow = () => {
        clearTimeout(timeout);
        window.removeEventListener("beforeunload", saveNow);

        saveProject();
      };

      const timeout = setTimeout(() => {
        writesArePending = false;
        saveProject();
      }, 10_000);
      window.addEventListener("beforeunload", saveNow);
    },
  };

  return appState;
});

export function useAppStore<T>(selector: (state: AppState) => T) {
  return useStore(store, selector);
}

export function useProject() {
  const project = expect(
    useAppStore((s) => s.project),
    "Project not found",
  );

  return project;
}

export function useProjectStore<T>(selector: (state: Project) => T) {
  const project = useProject();

  return useStore(project.store, selector);
}
