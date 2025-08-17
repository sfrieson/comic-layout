import { useHotkeys } from "react-hotkeys-hook";

import type { App } from "./App.js";

export function useAppHotkeys(app: App) {
  useHotkeys("meta+n", (e: KeyboardEvent) => {
    e.preventDefault();
    app.createProject();
  });

  useHotkeys("meta+o", (e: KeyboardEvent) => {
    e.preventDefault();
    app.openFile();
  });
  useHotkeys("meta+n", (e: KeyboardEvent) => {
    e.preventDefault();
    app.newFile();
  });
}
