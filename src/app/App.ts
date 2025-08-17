import { createStore } from "zustand";

import { Project } from "../project/Project.js";

export class App {
  store = createStore<{
    fileHandle: FileSystemFileHandle | null;
    setFileHandle: (fileHandle: FileSystemFileHandle) => void;
    project: Project | null;
    setProject: (nextProject: Project) => void;
  }>((set) => ({
    fileHandle: null as FileSystemFileHandle | null,
    setFileHandle: (fileHandle: FileSystemFileHandle) => set({ fileHandle }),

    project: null as Project | null,
    setProject: (nextProject: Project) => set({ project: nextProject }),
  }));

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
    const data = new Blob([JSON.stringify(this.store.getState().project)], {
      type: "application/json",
    });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    this.store.setState({ fileHandle });
  }

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
      const json = JSON.parse(e.target?.result as string);
      this.store.setState({ fileHandle });
      console.log(json);
    };

    reader.onerror = (e) => {
      this.store.setState({ fileHandle: null });
      console.error(e);
    };
    reader.readAsText(file);
  }

  createProject() {
    this.store.getState().setProject(new Project("New Project", []));
  }
}
