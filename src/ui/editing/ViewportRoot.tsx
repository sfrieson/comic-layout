import cx from "classnames";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Cell, Page, Rectangle } from "../../project/Project.js";
import { aabbFromPoints } from "../../utils/viewportUtils.js";
import { useDrag } from "../hooks.js";
import type { scaleNode, translateNode } from "../../app/projectActions.js";
import { Vec2, vec2Div, vec2Mult } from "../../utils/vec2.js";

import styles from "./viewport.module.css";

export interface PageData {
  type: "page";
  node: Page;
  transform: DOMMatrix;
  active: boolean;
  width: number;
  height: number;
}

export interface CellData {
  type: "rect-like";
  node: Cell | Rectangle;
  transform: DOMMatrix;
  path: Path2D;
  selected: boolean;
}

export type Data = PageData | CellData;

export function RootSVG({
  data,
  onWheel,
  onMouseDown,
  width,
  height,
  scaleNode,
  translateCell,
}: {
  onWheel: (e: WheelEvent) => void;
  onMouseDown: (e: MouseEvent) => void;
  data: Data[];
  width: number;
  height: number;
} & Actions) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svg) return;
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svg, onWheel]);

  const actions = useMemo(
    () => ({
      scaleNode,
      translateCell,
    }),
    [scaleNode, translateCell],
  );

  return (
    <svg
      ref={setSvg}
      className="w-full h-full absolute top-0 left-0"
      onMouseDown={(e) => onMouseDown(e.nativeEvent)}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        overflow: "hidden",
      }}
    >
      <ActionContext.Provider value={actions}>
        {data.map((d) => {
          switch (d.type) {
            case "page":
              return <PageComponent key={d.node.id} {...d} />;
            case "rect-like":
              return <RectLikeComponent key={d.node.id} {...d} />;
          }
        })}
      </ActionContext.Provider>
    </svg>
  );
}

function PageComponent({ node, transform, active }: PageData) {
  // apply the transform to the page
  const x = transform.e;
  const y = transform.f;
  const width = node.width * transform.a;
  const height = node.height * transform.d;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      className={cx(styles.page, active && styles.page_active)}
    />
  );
}

function RectLikeComponent({ node, transform, selected }: CellData) {
  const points = node.path.points.map((p) => applyTransform(transform, p));
  const bb = aabbFromPoints(points);
  const { scaleNode: scaleCell, translateCell } = useContext(ActionContext);
  return (
    <Fragment>
      <path
        d={pathToSVG(points, node.path.closed)}
        className={cx(styles.shape, selected && styles.shape_selected)}
      />
      {selected && (
        <BoundingBox
          {...bb}
          onScale={(handle, delta) => {
            scaleCell(
              node.id,
              handle,
              vec2Div(delta, {
                x: transform.a,
                y: transform.d,
              }),
            );
          }}
          onTranslate={(delta) => {
            translateCell(
              node.id,
              vec2Div(delta, {
                x: transform.a,
                y: transform.d,
              }),
            );
          }}
        />
      )}
    </Fragment>
  );
}

function BoundingBox({
  x,
  y,
  width,
  height,
  onScale,
  onTranslate,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  onScale?: (scale: Vec2, translate: Vec2) => void;
  onTranslate?: (delta: Vec2) => void;
}) {
  const { onMouseDown } = useDrag((delta) => {
    onTranslate?.(vec2Mult(delta, devicePixelRatio));
  });
  const dimensions = { x: width, y: height };

  function handleMoveToScale(
    location: HandleLocation,
    delta: Vec2,
    mirrorDelta = false,
  ) {
    let left = 0;
    let top = 0;
    let right = width;
    let bottom = height;
    if (location === "nw" || location === "n" || location === "ne") {
      top += delta.y;
    }
    if (location === "nw" || location === "w" || location === "sw") {
      left += delta.x;
    }
    if (location === "se" || location === "s" || location === "sw") {
      bottom += delta.y;
    }
    if (location === "ne" || location === "e" || location === "se") {
      right += delta.x;
    }
    if (mirrorDelta) {
      location = handleComplement(location);
      delta = vec2Mult(delta, -1);
      if (location === "nw" || location === "n" || location === "ne") {
        top += delta.y;
      }
      if (location === "nw" || location === "w" || location === "sw") {
        left += delta.x;
      }
      if (location === "se" || location === "s" || location === "sw") {
        bottom += delta.y;
      }
      if (location === "ne" || location === "e" || location === "se") {
        right += delta.x;
      }
    }

    let newWidth = right - left;
    let newHeight = bottom - top;
    if (newWidth < 10) newWidth = 10;
    if (newHeight < 10) newHeight = 10;

    const scale = vec2Div(
      { x: newWidth, y: newHeight },
      { x: width, y: height },
    );

    onScale?.(scale, { x: left, y: top });
  }

  return (
    <g transform={`translate(${x}, ${y})`} className={styles.boundingBox_group}>
      {/* {(
        [
          [
            [0, 0],
            [0, 1],
          ],
          [
            [0, 1],
            [1, 1],
          ],
          [
            [1, 0],
            [1, 1],
          ],
          [
            [0, 0],
            [1, 0],
          ],
        ] as const
      ).map(([a, b]) => (
        <line
          key={a.join(",") + "," + b.join(",")}
          x1={a[0] * width}
          y1={a[1] * height}
          x2={b[0] * width}
          y2={b[1] * height}
          className={styles.boundingBox_boxLine}
        />
      ))} */}
      <rect
        width={width}
        height={height}
        className={styles.boundingBox_box}
        onMouseDown={onMouseDown}
      />
      {(["nw", "ne", "sw", "se", "n", "e", "s", "w"] as const).map(
        (location) => {
          const size = 20;
          const scale = handleScale(location);

          const h = vec2Mult(scale, dimensions);

          return (
            <Handle
              key={location}
              x={h.x - size / 2}
              y={h.y - size / 2}
              size={size}
              location={location}
              onMove={(delta, { meta }) =>
                handleMoveToScale(location, delta, meta)
              }
            />
          );
        },
      )}
    </g>
  );
}

function Handle({
  x,
  y,
  size,
  location,
  onMove: onMove,
}: {
  x: number;
  y: number;
  size: number;
  location: HandleLocation;
  onMove?: (
    delta: Vec2,
    mirror: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean },
  ) => void;
}) {
  const { onMouseDown } = useDrag((delta, modifiers) => {
    delta = vec2Mult(delta, devicePixelRatio);
    if (location === "e" || location === "w") {
      onMove?.({ x: delta.x, y: 0 }, modifiers);
    } else if (location === "n" || location === "s") {
      onMove?.({ x: 0, y: delta.y }, modifiers);
    } else {
      onMove?.({ x: delta.x, y: delta.y }, modifiers);
    }
  });
  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      onMouseDown={onMouseDown}
      className={styles.boundingBox_handle}
    />
  );
}
type HandleLocation = "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w";

function handleComplement(handle: HandleLocation) {
  if (handle === "nw") return "se";
  if (handle === "ne") return "sw";
  if (handle === "sw") return "ne";
  if (handle === "se") return "nw";
  if (handle === "n") return "s";
  if (handle === "e") return "w";
  if (handle === "s") return "n";
  if (handle === "w") return "e";
  throw new Error(`Invalid handle: ${handle}`);
}

function handleScale(handle: HandleLocation) {
  if (handle === "nw") return { x: 0, y: 0 };
  if (handle === "ne") return { x: 1, y: 0 };
  if (handle === "sw") return { x: 0, y: 1 };
  if (handle === "se") return { x: 1, y: 1 };
  if (handle === "n") return { x: 0.5, y: 0 };
  if (handle === "e") return { x: 1, y: 0.5 };
  if (handle === "s") return { x: 0.5, y: 1 };
  if (handle === "w") return { x: 0, y: 0.5 };
  throw new Error(`Invalid handle: ${handle}`);
}

function applyTransform(transform: DOMMatrix, point: Vec2) {
  const x = point.x * transform.a + transform.e;
  const y = point.y * transform.d + transform.f;
  return { x, y };
}

function pathToSVG(points: Vec2[], closed: boolean) {
  return `M ${points.map((p) => `${p.x},${p.y}`).join("L")} ${closed ? "Z" : ""}`;
}

interface Actions {
  scaleNode: typeof scaleNode;
  translateCell: typeof translateNode;
}

const ActionContext = createContext<Actions>({
  scaleNode: () => {},
  translateCell: () => {},
});
