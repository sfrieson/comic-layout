import { useHotkeys } from "react-hotkeys-hook";

export function App() {
  useGlobalHotkeys();

  return <h1>Comic Layout!!</h1>;
}

function useGlobalHotkeys() {
  useHotkeys("meta+n", (e: KeyboardEvent) => {
    e.preventDefault();
    console.log("New Project");
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = JSON.parse(e.target?.result as string);
        console.log(json);
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
