import { describe, expect, it } from "vitest";
import { loadProjectFile, serializeProject } from "./serialization.js";
import { Cell, Page, Path, Project } from "./Project.js";

describe("serialization", () => {
  it("should serialize and deserialize a project back to its original state", () => {
    const project = new Project();
    const page = Page.create({
      width: 1080,
      height: 1080,
      fills: [{ type: "color", value: "#c11a1a", opacity: 1 }],
    });
    project.addPage(page);
    const cell = Cell.create({
      translation: { x: 0, y: 0 },
      path: Path.create({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
      }),
    });
    project.addCell(page, cell);
    const serialized = serializeProject(project);
    const deserialized = loadProjectFile(JSON.stringify(serialized));
    expect(deserialized).toEqual(project);
  });
});
