import { assert, expect } from "../utils/assert.js";

export interface ActionSet {
  /** A key to deduplicate repetitive actions in the history. */
  key: string | undefined;
  action: () => void;
  undo: () => void;
  type: "action";
}

interface DuplicateActions {
  type: "duplicates";
  key: string;
  actions: ActionSet[];
  add: (action: ActionSet) => void;
}

function createDuplicateActions(key: string): DuplicateActions {
  const actions = [] as Array<ActionSet>;
  return {
    type: "duplicates" as const,
    key,
    actions,
    add: (action: ActionSet) => actions.push(action),
  };
}

function createTransactionSet(
  actions: Array<ActionSet | DuplicateActions | Transaction>,
) {
  return {
    type: "transaction" as const,
    actions,
  };
}
type Transaction = {
  type: "transaction";
  actions: Array<ActionSet | DuplicateActions | Transaction>;
};

type Action = ActionSet | DuplicateActions | Transaction;

type NestedActionSetList = Array<Action | NestedActionSetList>;

export function actionSet(
  action: () => void,
  undo: () => void,
  { key }: { key?: string } = {},
): ActionSet {
  if (key) {
    key += `__${Math.floor(performance.now() / 1000)}`;
  }
  return { action, undo, key, type: "action" };
}

function createInternalHistory() {
  return {
    pointer: -1,
    history: [] as Array<Action | Action[]>,
  };
}

function createLayeredHistory() {
  const layers = [createInternalHistory()];
  const peek = () => expect(layers.at(-1), "No layers left in history");
  return {
    get pointer() {
      return peek().pointer;
    },
    set pointer(value: number) {
      peek().pointer = value;
    },
    get actions() {
      return peek().history;
    },
    addLayer() {
      layers.push(createInternalHistory());
    },
    removeLayer() {
      return layers.pop();
    },
  };
}
export function createHistory() {
  const state = createLayeredHistory();

  function addToHistory(
    action: ActionSet | Action[] | Transaction,
    {
      skipExecution,
    }: {
      /** Add to the history, but don't execute the action. Used in transactions when the history layer is completed.*/
      skipExecution: boolean;
    },
  ) {
    if (state.pointer !== state.actions.length - 1) {
      state.actions.splice(state.pointer + 1);
    }
    function _execute(action: Action | Action[]) {
      if (Array.isArray(action)) {
        for (const a of action) {
          _execute(a);
        }
      } else if (
        action.type === "duplicates" ||
        action.type === "transaction"
      ) {
        _execute(action.actions);
      } else {
        action.action();
      }
    }
    if (!skipExecution) {
      _execute(action);
    }

    if (!Array.isArray(action) && action.type === "action" && action.key) {
      const previousAction = state.actions.at(-1);
      let duplicates;
      if (
        previousAction &&
        !Array.isArray(previousAction) &&
        previousAction.type === "duplicates" &&
        previousAction.key === action.key
      ) {
        duplicates = previousAction;
      } else {
        duplicates = createDuplicateActions(action.key);
        state.actions.push(duplicates);
      }
      duplicates.add(action);
    } else {
      state.actions.push(action);
    }

    state.pointer = state.actions.length - 1;
  }

  const history = {
    add(action: ActionSet | NestedActionSetList) {
      addToHistory(Array.isArray(action) ? flatten(action) : action, {
        skipExecution: false,
      });
    },
    transaction(cb: () => void) {
      state.addLayer();
      cb();
      const removed = state.removeLayer();
      if (removed?.history?.length) {
        addToHistory(createTransactionSet(flatten(removed.history)), {
          skipExecution: true,
        });
      }
    },
    undo() {
      if (state.pointer === -1) {
        return;
      }
      function _undo(action?: Action | Action[]) {
        assert(action, "No action to undo");
        if (Array.isArray(action)) {
          // reverse the array to undo in the correct order
          const actions = Array.from(action).reverse();
          for (const action of actions) {
            _undo(action);
          }
        } else if (
          action.type === "duplicates" ||
          action.type === "transaction"
        ) {
          _undo(action.actions);
        } else {
          action.undo();
        }
      }
      _undo(state.actions[state.pointer]);
      state.pointer--;
    },
    redo() {
      const nextAction = state.actions[state.pointer + 1];
      if (!nextAction) {
        return;
      }
      function _redo(action: Action | Action[]) {
        if (Array.isArray(action)) {
          for (const a of action) {
            _redo(a);
          }
        } else if (
          action.type === "duplicates" ||
          action.type === "transaction"
        ) {
          _redo(action.actions);
        } else {
          action.action();
        }
      }
      _redo(nextAction);
      state.pointer++;
    },
    actionSet,
  };

  return history;
}
export type History = ReturnType<typeof createHistory>;

function flatten(action: NestedActionSetList): Action[] {
  const flat = action.flat(20);
  for (const a of flat) {
    if (Array.isArray(a)) {
      throw new Error("Nested too many levels");
    }
  }
  return flat as Action[];
}
