import { useEffect, useRef } from "react";
import { App } from "../app/App.js";
import { useAppHotkeys } from "../app/hooks.js";

import { SplitPane } from "@rexxars/react-split-pane";
import { useStore } from "zustand";

export function Root() {
  const appRef = useRef(new App());
  useAppHotkeys(appRef.current);
  const project = useStore(appRef.current.store, (state) => state.project);

  useSplitPaneStyles();

  if (!project) {
    return <h1>Comic Layout!!</h1>;
  }

  return (
    <SplitPane
      split="vertical"
      minSize={100}
      defaultSize={window.innerWidth - 250}
    >
      <canvas style={{ width: "100%", height: "100%" }} />
      <div>settings</div>
    </SplitPane>
  );
  return (
    <SplitPane
      split="vertical"
      minSize={100}
      defaultSize={window.innerWidth - 250}
    >
      <canvas style={{ width: "100%", height: "100%" }} />
      <div>settings</div>
    </SplitPane>
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
