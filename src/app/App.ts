import { createStore } from "zustand";
import { combine } from "zustand/middleware";

import { Viewport } from "./Viewport.js";
import { expect } from "../utils/assert.js";
import type { Project } from "../project/Project.js";
import { loadProjectFile, serializeProject } from "../project/serialization.js";
import { useSyncExternalStore } from "react";
import { subscribeToChanges } from "./projectActions.js";
import { Renderer } from "../renderer/Renderer.js";

export const store = createStore(
  combine(
    {
      fileHandle: null as FileSystemFileHandle | null,
      project: null as Project | null,
      canvas: null as HTMLCanvasElement | null,
      viewport: null as Viewport | null,
      selection: null as Selection | null,
    },
    (set, get) => {
      let writesArePending = false;

      async function saveProject() {
        writesArePending = true;
        const { project, fileHandle } = get();
        if (!project || !fileHandle) return;
        const data = new Blob([JSON.stringify(serializeProject(project))], {
          type: "application/json",
        });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
      }

      function createProject(json?: string) {
        set({ project: loadProjectFile(json) });
      }

      return {
        registerCanvas: (canvas: HTMLCanvasElement) => {
          set({
            canvas,
            viewport: new Viewport(canvas),
          });
        },
        unregisterCanvas: (canvas: HTMLCanvasElement) => {
          set((state) =>
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
          set({ fileHandle });
          const project = createProject();
          return project;
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

          const { promise, resolve, reject } = Promise.withResolvers<void>();

          const file = await fileHandle.getFile();

          const reader = new FileReader();
          reader.onload = (e) => {
            const string = e.target?.result as string;
            set({ fileHandle });
            createProject(string);
            resolve();
          };

          reader.onerror = (e) => {
            set({ fileHandle: null });
            reject(e);
          };
          reader.readAsText(file);

          return promise;
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
    },
  ),
);

let cachedChange = { ["-1"]: null } as Record<number, Project | null>;

export function useProject() {
  const project = useSyncExternalStore(subscribeToChanges, () => {
    const project = expect(store.getState().project, "Project not found");

    const cached = cachedChange[project.meta._changes];
    if (cached) return cached;

    const newProject = { ...project };

    cachedChange = { [project.meta._changes]: newProject };
    return newProject;
  });

  return project;
}
