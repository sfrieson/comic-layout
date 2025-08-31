import { useCallback, useEffect, useState } from "react";
import { store } from "../app/App.js";
import { useEditingHotKeys, useEmptyStateHotkeys } from "../app/hooks.js";

import { SplitPane } from "@rexxars/react-split-pane";
import { Inspector } from "./Inspector.js";
import { useStore } from "zustand";
import { subscribeToChanges } from "../app/projectActions.js";
import { ProjectContext, useProjectContextValue } from "./ProjectContext.js";
import { Project } from "../project/Project.js";
import { useHotkeys } from "react-hotkeys-hook";

export function Root() {
  const project = useStore(store, (state) => state.project);

  useSplitPaneStyles();
  const projectContextValue = useProjectContextValue();

  return (
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
        </ProjectContext.Provider>
      </div>
    </SplitPane>
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

function useSplitPaneStyles() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
    .Resizer {
      background: #000;
      opacity: 0.2;
      z-index: 1;
      -moz-box-sizing: border-box;
      -webkit-box-sizing: border-box;
      box-sizing: border-box;
      -moz-background-clip: padding;
      -webkit-background-clip: padding;
      background-clip: padding-box;
    }

    .Resizer:hover {
      -webkit-transition: all 2s ease;
      transition: all 2s ease;
    }

    .Resizer.horizontal {
      height: 11px;
      margin: -5px 0;
      border-top: 5px solid rgba(255, 255, 255, 0);
      border-bottom: 5px solid rgba(255, 255, 255, 0);
      cursor: row-resize;
      width: 100%;
    }

    .Resizer.horizontal:hover {
      border-top: 5px solid rgba(0, 0, 0, 0.5);
      border-bottom: 5px solid rgba(0, 0, 0, 0.5);
    }

    .Resizer.vertical {
      width: 11px;
      margin: 0 -5px;
      border-left: 5px solid rgba(255, 255, 255, 0);
      border-right: 5px solid rgba(255, 255, 255, 0);
      cursor: col-resize;
    }

    .Resizer.vertical:hover {
      border-left: 5px solid rgba(0, 0, 0, 0.5);
      border-right: 5px solid rgba(0, 0, 0, 0.5);
    }
    .Resizer.disabled {
      cursor: not-allowed;
    }
    .Resizer.disabled:hover {
      border-color: transparent;
    }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
}
