import { useCallback, useEffect, useState } from "react";
import { store } from "../app/App.js";
import { useEditingHotKeys, useEmptyStateHotkeys } from "../app/hooks.js";

import { Inspector } from "./Inspector.js";
import { useStore } from "zustand";
import { subscribeToChanges } from "../app/projectActions.js";
import { requirePageDimensions } from "../app/projectSelectors.js";
import { ProjectContext, useProjectContextValue } from "./ProjectContext.js";
import { Project } from "../project/Project.js";
import { useHotkeys } from "react-hotkeys-hook";
import { SplitPane } from "./components/SplitPane.js";
import { GlobalDialogTarget } from "./components/Dialog.js";

export function Root() {
  const project = useStore(store, (state) => state.project);

  const projectContextValue = useProjectContextValue();

  return (
    <>
      <SplitPane
        split="vertical"
        minSize={150}
        defaultSize={300}
        primary="second"
      >
        {project ? <ProjectPane project={project} /> : <EmptyState />}
        <div>
          <ProjectContext.Provider value={projectContextValue}>
            <Inspector />
            <GlobalDialogTarget />
          </ProjectContext.Provider>
        </div>
      </SplitPane>
    </>
  );
}

function EmptyState() {
  useEmptyStateHotkeys();
  return (
    <div>
      <h1>Comic Layout!!!</h1>
    </div>
  );
}

export function ProjectPane({ project }: { project: Project }) {
  const viewport = useStore(store, (state) => state.viewport);
  useEditingHotKeys();
  const setZoom = useStore(store, (state) => state.setZoom);
  const saveProject = useStore(store, (state) => state.saveProject);

  useHotkeys("meta+1", (e: KeyboardEvent) => {
    e.preventDefault();
    setZoom(1);
  });
  useHotkeys("meta+2", (e: KeyboardEvent) => {
    e.preventDefault();
    setZoom(393 / 1280); // rougly the size of my iPhone
  });
  useHotkeys("meta+0", (e: KeyboardEvent) => {
    e.preventDefault();
    const { width, height } = viewport?.getCanvasSize() ?? {
      width: 0,
      height: 0,
    };
    if (width === 0 || height === 0) return;
    const page = requirePageDimensions();
    setZoom(
      Math.min(
        width / devicePixelRatio / page.width,
        height / devicePixelRatio / page.height,
      ),
    ); // fit to screen
  });

  const [viewportContainer, setViewportContainer] =
    useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!viewportContainer) return;
    store.getState().registerRoot(viewportContainer);

    return () => store.getState().unregisterRoot(viewportContainer);
  }, [viewportContainer]);

  const onProjectStateChange = useCallback(() => {
    viewport?.render();
    saveProject();
  }, [viewport, saveProject]);

  useEffect(() => {
    return subscribeToChanges(onProjectStateChange);
  }, [onProjectStateChange]);

  return (
    <div
      ref={setViewportContainer}
      id="viewport-container"
      className="w-full h-full relative"
    />
  );
}
