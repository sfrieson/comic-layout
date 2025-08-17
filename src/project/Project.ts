import { createStore } from "zustand";
import { Project, projectSchema } from "./types.js";

export const createProjectStore = () => {
  const store = createStore<Project>(() => ({
    name: "New Project",
    pages: [],
  }));

  const projectActions = {
    toJSON() {
      return JSON.stringify(store.getState());
    },

    loadFile(json: string) {
      const data = JSON.parse(json);

      const parsed = projectSchema.parse(data);

      store.setState(parsed);
    },

    setName(name: string) {
      store.setState({ name });
    },
  };

  return {
    store,
    actions: projectActions,
  };
};
