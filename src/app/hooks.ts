import { useHotkeys } from "react-hotkeys-hook";

import { store as app } from "./App.js";

export function useAppHotkeys() {
  useHotkeys("meta+o", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().openFile();
  });
  useHotkeys("meta+n", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().newFile();
  });
  useHotkeys("meta+z", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().history.undo();
  });
  useHotkeys("meta+shift+z", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().history.redo();
  });
}
