import { useSyncExternalStore, useRef, createContext, useContext } from "react";
import { Project } from "../project/Project.js";
import { expect } from "../utils/assert.js";
import { store } from "../app/App.js";
import { subscribeToChanges } from "../app/projectActions.js";

export const ProjectContext = createContext<Project | null>(null);

export function useProject<T>(selector: (project: Project) => T) {
  const project = expect(useContext(ProjectContext), "Project not found");

  return selector(project);
}

export function useProjectContextValue() {
  const projectRef = useRef<Project | null>(null);
  useSyncExternalStore(subscribeToChanges, () => {
    projectRef.current = store.getState().project;
    return projectRef.current?.meta._changes;
  });

  return projectRef.current;
}
