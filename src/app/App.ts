import { createStore } from "zustand";

import { Project } from "../project/Project.js";

const id = Math.random().toString(36).substring(2, 15);

export class App {
  store = createStore<{
    file: File | null;
    setFile: (file: File) => void;
    project: Project | null;
    setProject: (nextProject: Project) => void;
  }>((set) => ({
    file: null as File | null,
    setFile: (file: File) => set({ file }),

    project: null as Project | null,
    setProject: (nextProject: Project) => set({ project: nextProject }),
  }));

  constructor() {
    console.log("App", id);
  }

  openFile(file?: File) {
    if (!file) {
      this.store.setState({ file: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = JSON.parse(e.target?.result as string);
      this.store.setState({ file });
      console.log(json);
    };

    reader.onerror = (e) => {
      this.store.setState({ file: null });
      console.error(e);
    };
    reader.readAsText(file);
  }

  createProject() {
    this.store.getState().setProject(new Project("New Project", []));
  }
}
