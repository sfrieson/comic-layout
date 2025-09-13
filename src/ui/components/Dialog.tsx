import { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function openDialog(
  dialog: React.ReactNode | ((close: () => void) => React.ReactNode),
  opts?: DialogOpts,
) {
  const customEvent = new CustomEvent("dialog:open", {
    detail: {
      dialog,
      opts,
    },
  });
  document.dispatchEvent(customEvent);
}

interface DialogOpts {
  autoDismissable?: boolean;
}

interface DialogOpenDetail {
  dialog: React.ReactNode | ((close: () => void) => React.ReactNode);
  opts: DialogOpts | undefined;
}

interface DialogConfig {
  node: React.ReactNode;
  opts: DialogOpts;
}

export function GlobalDialogTarget() {
  const [dialogs, setDialogs] = useState<DialogConfig[]>([]);
  const closeDialog = (dialog: DialogConfig) => {
    setDialogs((prev) => prev.filter((item) => item !== dialog));
  };
  useHotkeys("esc", () => {
    const topMostDialog = dialogs.at(-1);
    if (!topMostDialog?.opts.autoDismissable) {
      return;
    }

    closeDialog(topMostDialog);
  });

  useEffect(() => {
    const onDialogOpen = (e: CustomEvent<DialogOpenDetail>) => {
      const config: DialogConfig = {
        node:
          typeof e.detail.dialog === "function"
            ? e.detail.dialog(() => {
                closeDialog(config);
              })
            : e.detail.dialog,
        opts: e.detail.opts ?? { autoDismissable: true },
      };

      setDialogs((prev) => [...prev, config]);
    };
    document.addEventListener("dialog:open", onDialogOpen as EventListener);
    return () => {
      document.removeEventListener(
        "dialog:open",
        onDialogOpen as EventListener,
      );
    };
  }, []);

  return (
    <>
      {dialogs.map((dialog, index) => (
        <dialog
          key={index}
          open={true}
          popover="auto"
          onClick={(e) => {
            e.stopPropagation();
            e.target === e.currentTarget && closeDialog(dialog);
          }}
          className="fixed inset-0 size-auto flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          {dialog.node}
        </dialog>
      ))}
    </>
  );
}
