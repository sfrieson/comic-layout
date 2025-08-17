import { useHotkeys } from "react-hotkeys-hook";

import type { App } from "./App.js";

export function useAppHotkeys(app: App) {
  useHotkeys("meta+n", (e: KeyboardEvent) => {
    e.preventDefault();
    app.createProject();
  });

  useHotkeys("meta+o", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }
      // double-check filetype
      if (file.type !== "application/json") {
        return;
      }
      app.openFile(file);
    };
    input.click();
  });
}
