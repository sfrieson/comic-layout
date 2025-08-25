import { useEffect, useRef, useState } from "react";

export function useDrag(
  onDrag: (
    delta: { x: number; y: number },
    modifiers: { meta: boolean; alt: boolean; shift: boolean; ctrl: boolean },
  ) => void,
) {
  const cbRef = useRef(onDrag);
  cbRef.current = onDrag;
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!dragging) return;
    const mouseMove = (e: MouseEvent) => {
      const start = startRef.current;
      if (!start) return;
      const delta = { x: e.clientX - start.x, y: e.clientY - start.y };
      if (delta.x === 0 && delta.y === 0) return;
      cbRef.current(delta, {
        meta: e.metaKey,
        alt: e.altKey,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
      });
      startRef.current = { x: e.clientX, y: e.clientY };
    };
    const mouseUp = () => {
      setDragging(false);
      startRef.current = null;
    };
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [dragging]);
  function onMouseDown(e: React.MouseEvent<SVGRectElement>) {
    // avoid canvas selection
    e.stopPropagation();
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY };
  }
  return { onMouseDown };
}
