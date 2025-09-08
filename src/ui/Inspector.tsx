import { useStore } from "zustand";
import { store } from "../app/App.js";
import {
  addCellToPage,
  addNodeFill,
  addPage,
  removeNodeFromParent,
  removeNodeFillAtIndex,
  removePage,
  saveImageToProject,
  setName,
  setNodeFillAt,
  setNodeFillToType,
  setNodeOpacityAtIndex,
  setPageDimensions,
  translateNode,
  exportProject,
  addRectangle,
  addPathAlignedText,
  setNodeTranslation,
  setNodeLines,
  setNodeFontInfo,
  sendNodeBackward,
  bringNodeForward,
  duplicateNode,
} from "../app/projectActions.js";
import { requirePageDimensions } from "../app/projectSelectors.js";

import { projectAssets, useRecentFiles } from "../app/hooks.js";
import { assert, expect } from "../utils/assert.js";
import {
  Cell,
  Fill,
  Node,
  PathAlignedText,
  Rectangle,
} from "../project/Project.js";
import { useHotkeys } from "react-hotkeys-hook";
import { useProject } from "./ProjectContext.js";
import { useEffect, useMemo, useState } from "react";
import { useLatestRef } from "../utils/hooks.js";
import { SplitPane, Pane } from "./components/SplitPane.js";

export function Inspector() {
  const project = useStore(store, (s) => s.project);
  const selection = useStore(store, (s) => s.ui.selection);
  const ui = useStore(store, (s) => s.ui);

  return (
    <div className="p-2">
      {project ? (
        <SplitPane
          className="p-0"
          split="horizontal"
          minSize={150}
          defaultSize={300}
          primary="second"
        >
          <Pane>
            {(() => {
              if (!selection.size) {
                if (ui.activePage) return <PageInspector />;
                return <LoadedProjectInspector />;
              }
              if (selection.size > 1) {
                return <div>Multi-Selection</div>;
              }

              const node = selection.values().next().value!;
              return <NodeInspector node={node} />;
            })()}
          </Pane>
          <Pane>
            <NodeTree />
          </Pane>
        </SplitPane>
      ) : (
        <IdleInspector />
      )}
    </div>
  );
}

function InspectorTemplate(props: {
  name: string;
  node: Node;
  tools?: Array<"rectangle" | "text" | "cell">;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p>{props.name}</p>
      <hr />
      {props.tools && (
        <>
          <div className="flex gap-2">
            {props.tools?.map((tool) => (
              <InspectorTool key={tool} node={props.node} tool={tool} />
            ))}
          </div>
          <hr />
        </>
      )}
      {props.children}
    </div>
  );
}

function InspectorTool(props: {
  node: Node;
  tool: "rectangle" | "text" | "cell";
}) {
  switch (props.tool) {
    case "rectangle":
      return (
        <Button onClick={() => addRectangle(props.node.id)} hotkeys="r">
          Rect
        </Button>
      );
    case "text":
      return (
        <Button onClick={() => addPathAlignedText(props.node.id)} hotkeys="t">
          Text
        </Button>
      );
    case "cell":
      return <Button onClick={() => addCellToPage(props.node.id)}>Cell</Button>;
  }
  return null;
}

function Button({
  children,
  onClick,
  hotkeys = [],
  ...props
}: {
  hotkeys?: string | string[];
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  useHotkeys(hotkeys, onClick, {
    enabled: !!hotkeys && onClick && !props.disabled,
  });
  return (
    <button onClick={onClick} title={hotkeys?.toString()}>
      {children}
    </button>
  );
}

function NodeInspector({ node }: { node: Node }) {
  useHotkeys("backspace", () => removeNodeFromParent(node));
  useHotkeys("meta+d", () => duplicateNode(node.id), { preventDefault: true });
  useHotkeys("[", () => bringNodeForward(node.id), { useKey: true });
  useHotkeys("]", () => sendNodeBackward(node.id), { useKey: true });

  switch (node.type) {
    case "cell":
      return <CellInspector node={node} />;
    case "rectangle":
      return <RectangleInspector node={node} />;
    case "text_path-aligned":
      return <PathAlignedTextInspector node={node} />;
    default:
      return <div>{node.type}</div>;
  }
}

function CellInspector({ node }: { node: Cell }) {
  return (
    <InspectorTemplate name="Cell" node={node} tools={["rectangle", "text"]}>
      <NodeTranslationEditor nodeId={node.id} />
      <NodeFillsEditor nodeId={node.id} />
    </InspectorTemplate>
  );
}

function RectangleInspector({ node }: { node: Rectangle }) {
  return (
    <InspectorTemplate
      name="Rectangle"
      node={node}
      tools={["text", "rectangle"]}
    >
      <NodeTranslationEditor nodeId={node.id} />
      <NodeFillsEditor nodeId={node.id} />
    </InspectorTemplate>
  );
}

function PathAlignedTextInspector({ node }: { node: PathAlignedText }) {
  const setLines = (lines: string[]) => setNodeLines(node.id, lines);
  return (
    <InspectorTemplate name="Text (Path Aligned)" node={node}>
      <NodeTranslationEditor nodeId={node.id} />
      <NodeFillsEditor nodeId={node.id} />
      <FontEditor nodeId={node.id} />
      <textarea
        className="whitespace-pre"
        rows={5}
        value={node.lines.join("\n")}
        onChange={(e) => {
          setLines(e.target.value.split("\n"));
        }}
      />
    </InspectorTemplate>
  );
}

function IdleInspector() {
  const { recentFiles, addRecentFile } = useRecentFiles();
  const newFile = useStore(store, (s) => s.newFile);
  const openFile = useStore(store, (s) => s.openFile);

  return (
    <div>
      <button
        onClick={async () => {
          const handle = await newFile();
          addRecentFile(handle);
        }}
      >
        New Project
      </button>
      <button
        onClick={async () => {
          const handle = await openFile();
          addRecentFile(handle);
        }}
      >
        Open Project
      </button>
      <div>
        {recentFiles?.map((file) => (
          <button key={file.name} onClick={() => openFile(file)}>
            {file.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadedProjectInspector() {
  const project = useProject((p) => p);
  const name = project.meta.name;
  const { width: pageWidth, height: pageHeight } = requirePageDimensions();

  return (
    <div className="p-2">
      <Button onClick={() => exportProject()}>Export</Button>
      <hr />
      <label>
        Name
        <input
          type="text"
          name="projectName"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <p>Page dimensions</p>
      <div className="flex gap-2">
        <label className="flex gap-2 items-center">
          <span>W:</span>
          <NumberInput
            name="pageWidth"
            className="w-full"
            value={pageWidth}
            onChange={(value) => setPageDimensions(value, pageHeight)}
          />
        </label>

        <label className="flex gap-2 items-center">
          <span>H:</span>
          <NumberInput
            name="pageHeight"
            className="w-full"
            value={pageHeight}
            onChange={(value) => setPageDimensions(pageWidth, value)}
          />
        </label>
      </div>

      <Button onClick={() => addPage()} hotkeys="p">
        Add Page
      </Button>
    </div>
  );
}

function PageInspector() {
  const page = useStore(store, (s) => {
    const activePage = expect(s.ui.activePage, "No active page");
    const node = expect(s.project?.nodeMap.get(activePage), "No page node");
    assert(node.type === "page", "Node is not a page");
    return node;
  });

  return (
    <InspectorTemplate
      name="Page"
      node={page}
      tools={["cell", "rectangle", "text"]}
    >
      <button onClick={() => removePage(page.id)}>Remove Page</button>
      <NodeFillsEditor nodeId={page.id} />
    </InspectorTemplate>
  );
}

function NodeTranslationEditor({ nodeId }: { nodeId: string }) {
  const node = expect(
    useStore(store, (s) => s.project?.nodeMap.get(nodeId)),
    "Node not found",
  );
  useHotkeys(
    [
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "shift+arrowup",
      "shift+arrowdown",
      "shift+arrowleft",
      "shift+arrowright",
    ],
    (e: KeyboardEvent) => {
      const dist = 1 * (e.shiftKey ? 10 : 1);
      const delta = {
        x: e.key === "ArrowRight" ? dist : e.key === "ArrowLeft" ? -dist : 0,
        y: e.key === "ArrowDown" ? dist : e.key === "ArrowUp" ? -dist : 0,
      };
      translateNode(node.id, delta);
    },
  );
  return (
    <div>
      <div className="flex gap-2">
        <label className="flex gap-2">
          <span>X:</span>
          <NumberInput
            name="x"
            value={node.translation.x}
            onChange={(value) =>
              setNodeTranslation(nodeId, {
                x: value,
                y: node.translation.y,
              })
            }
          />
        </label>
        <label className="flex gap-2">
          <span>Y:</span>
          <NumberInput
            name="y"
            value={node.translation.y}
            onChange={(value) =>
              setNodeTranslation(nodeId, {
                x: node.translation.x,
                y: value,
              })
            }
          />
        </label>
      </div>
    </div>
  );
}

function FontEditor({ nodeId }: { nodeId: string }) {
  const info: { fontSize: number; lineHeight: number } = useStore(
    store,
    (s) => {
      const node = s.project?.nodeMap.get(nodeId);
      assert(node?.type === "text_path-aligned", "Note a text node");
      return node;
    },
  );

  function handleChange(partial: Partial<typeof info>) {
    setNodeFontInfo(nodeId, { ...info, ...partial });
  }

  return (
    <div>
      <p>Font</p>
      <div className="flex gap-2">
        <label className="flex gap-2">
          <NumberInput
            name="fontSize"
            value={info.fontSize}
            onChange={(fontSize) => handleChange({ fontSize })}
          />
        </label>
        <label className="flex gap-2">
          <NumberInput
            name="lineHeight"
            value={info.lineHeight}
            step={0.1}
            min={0}
            onChange={(lineHeight) => handleChange({ lineHeight })}
          />
        </label>
      </div>
    </div>
  );
}

function NodeFillsEditor({ nodeId }: { nodeId: string }) {
  const fills = useStore(store, (s) => s.project?.nodeMap.get(nodeId)?.fills);
  assert(fills, "Node has no fills");

  return (
    <div>
      <div className="flex gap-2 justify-between">
        <p>Fills</p>
        <button onClick={() => addNodeFill(nodeId)}>Add Fill</button>
      </div>
      <div>
        {fills.reverseMap((fill, i) => (
          <FillEditor
            // I don't have a better id for each fill, so when one is removed, it needs to re-evaluate all the keys
            key={`node-${nodeId}-fill-${i}/${fills.length}-${fill.type}`}
            {...fill}
            nodeId={nodeId}
            i={i}
          />
        ))}
      </div>
    </div>
  );
}

function FillEditor({
  type,
  value,
  opacity,
  nodeId,
  i,
}: Fill & { i: number; nodeId: string }) {
  if (type === "color") {
    return (
      <CommonFillEditor nodeId={nodeId} i={i} opacity={opacity}>
        <ColorFillEditor value={value} nodeId={nodeId} i={i} />
      </CommonFillEditor>
    );
  }
  if (type === "image") {
    return (
      <CommonFillEditor nodeId={nodeId} i={i} opacity={opacity}>
        <ImageFillEditor value={value} nodeId={nodeId} i={i} />
      </CommonFillEditor>
    );
  }
  return null;
}

function CommonFillEditor({
  children,
  nodeId,
  opacity,
  i,
}: {
  children: React.ReactNode;
  nodeId: string;
  opacity: number;
  i: number;
}) {
  const type = useStore(
    store,
    (s) => s.project?.nodeMap.get(nodeId)?.fills.at(i)?.type,
  );
  const [isEditing, setIsEditing] = useState(false);

  function updateType(e: React.ChangeEvent<HTMLSelectElement>) {
    setNodeFillToType(nodeId, i, e.target.value as Fill["type"]);
  }

  return (
    <div className="flex gap-2 h-8">
      {children}
      <div className="h-full">
        <NumberInput
          className="h-full"
          style={{ width: "5ch" }}
          name="opacity"
          scale={100}
          value={opacity}
          min={0}
          max={1}
          step={0.01}
          inputMode="numeric"
          onChange={(value) => {
            setNodeOpacityAtIndex(nodeId, i, value);
          }}
        />
      </div>
      <button onClick={() => removeNodeFillAtIndex(nodeId, i)}>–</button>
      <button onClick={() => setIsEditing(!isEditing)}>⚙︎</button>
      {isEditing && (
        <Popover className="absolute inset-0 bg-gray-100">
          <h4>Fill Editor</h4>
          <div>
            <label>
              Type
              <select
                name="type"
                defaultValue={type ?? "color"}
                onChange={updateType}
              >
                <option value="color">Color</option>
                <option value="image">Image</option>
              </select>
            </label>
          </div>
        </Popover>
      )}
    </div>
  );
}

function ColorFillEditor({
  value,
  nodeId,
  i,
}: {
  value: string;
  nodeId: string;
  i: number;
}) {
  const onColorchange = (
    e: React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
  ) => {
    setNodeFillAt(
      nodeId,
      i,
      (fill) => (
        assert(fill.type === "color", "Fill is not a color fill"),
        {
          ...fill,
          value: e.target.value,
        }
      ),
    );
  };

  return (
    <div className="flex gap-2 h-8">
      <div className="h-full aspect-square">
        <input
          type="color"
          className="h-full w-full p-0"
          name="color"
          value={value}
          onChange={onColorchange}
        />
      </div>
      <div className="flex gap-2 h-full">
        <div className="h-full w-full">
          <input
            type="text"
            className="h-full w-full p-0"
            name="color"
            defaultValue={value}
            onBlur={onColorchange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ImageFillEditor({
  value,
  nodeId,
  i,
}: {
  value: number | null;
  nodeId: string;
  i: number;
}) {
  const { save } = projectAssets.useSaveAsset();
  const { asset } = projectAssets.useGetAsset(value);
  async function saveFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    save({
      asset: file,
      onSuccess: (assetId) => {
        if (typeof assetId !== "number") return;
        saveImageToProject(assetId);
        setNodeFillAt(
          nodeId,
          i,
          (fill) => (
            assert(fill.type === "image", "Fill is not an image fill"),
            {
              ...fill,
              value: assetId,
            }
          ),
        );
      },
    });
  }
  const dataUrl = useMemo(() => {
    if (!asset) return null;
    return URL.createObjectURL(asset);
  }, [asset]);
  return (
    <div className="flex gap-2 h-8 w-full">
      <div className="h-full flex gap-2">
        {dataUrl && <img src={dataUrl} alt="Asset" />}
        <input type="file" accept="image/*" onChange={saveFile} />
      </div>
    </div>
  );
}

declare global {
  interface HTMLElementEventMap {
    toggle: ToggleEvent;
  }
}

function Popover({
  children,
  onClose,
}: {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const latestOnClose = useLatestRef(onClose);
  useEffect(() => {
    if (!ref) return;
    ref.showPopover();
    const onToggle = (e: ToggleEvent) => {
      if (e.newState === "closed") {
        latestOnClose.current?.();
      }
    };
    ref.addEventListener("toggle", onToggle);
    return () => {
      ref.removeEventListener("toggle", onToggle);
    };
  }, [ref]);

  return (
    <div
      ref={setRef}
      popover="auto"
      className={
        "p-2 bg-gray-100 border border-gray-300 popover:bg-gray-800 m-auto"
      }
    >
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  scale = 1,
  inputMode = "decimal",
  ...props
}: {
  value: number;
  onChange?: (value: number) => void;
  scale?: number;
  step?: number;
  inputMode?: "decimal" | "numeric";
  min?: number;
  max?: number;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "type" | "inputMode" | "step" | "min" | "max"
>) {
  const clamp = (value: number) => {
    if (min != undefined && value < min) return min;
    if (max != undefined && value > max) return max;
    return value;
  };

  const handleValueChange = (nextValue: number) => {
    if (Number.isNaN(nextValue)) nextValue = value;
    nextValue = clamp(nextValue);
    onChange?.(nextValue);
  };

  const parseChangedInputValue = (nextValue: number) => {
    if (Number.isNaN(nextValue)) nextValue = value;
    nextValue /= scale;
    handleValueChange(nextValue);
  };

  return (
    <input
      {...props}
      type="text"
      value={value * scale}
      inputMode={inputMode}
      min={min}
      max={max}
      step={step}
      autoComplete="off"
      onKeyDown={(e) => {
        const multiplier = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowUp") {
          handleValueChange(value + step * multiplier);
        }
        if (e.key === "ArrowDown") {
          handleValueChange(value - step * multiplier);
        }
        props.onKeyDown?.(e);
      }}
      onChange={(e) => {
        parseChangedInputValue(parseFloat(e.target.value));
      }}
    />
  );
}

function NodeTree() {
  const page = useStore(store, (s) => {
    const activePage = s.ui.activePage;
    if (!activePage) return null;
    const node = expect(s.project?.nodeMap.get(activePage), "No page node");
    return node;
  });

  return (
    <div>
      <p>NodeTree</p>
      {!page && <div>No active page</div>}
      {page && (
        <TreeNode
          node={page}
          onSelect={(node) => store.getState().setSelectedNodes([node])}
        />
      )}
    </div>
  );
}

function TreeNode({
  node,
  onSelect,
}: {
  node: Node;
  onSelect?: ((node: Node) => void) | undefined;
}) {
  const selected = useStore(store, (s) => s.ui.selection.has(node));
  return (
    <div>
      <p onClick={() => node.type !== "page" && onSelect?.(node)}>
        {selected ? "• " : ""} {node.type}
      </p>
      <div className="pl-2">
        {node.children.toArray().map((child) => (
          <TreeNode key={child.id} node={child} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
