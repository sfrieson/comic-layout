import { assert, expect } from "../utils/assert.js";

export interface ActionSet {
  action: () => void;
  undo: () => void;
}

interface ActionList extends Array<ActionList | ActionSet> {}

export function actionSet(action: () => void, undo: () => void): ActionSet {
  return { action, undo };
}

function createInternalHistory() {
  return {
    pointer: -1,
    history: [] as ActionList,
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
  const history = {
    add(
      action: ActionSet | ActionList,
      { skipExecution }: { skipExecution?: boolean } = {},
    ) {
      if (state.pointer !== state.actions.length - 1) {
        state.actions.splice(state.pointer + 1);
      }
      function _add(action: ActionSet | ActionList) {
        if (Array.isArray(action)) {
          for (const a of action) {
            _add(a);
          }
        } else {
          action.action();
        }
      }
      if (!skipExecution) {
        _add(action);
      }
      state.actions.push(action);
      state.pointer = state.actions.length - 1;
    },
    transaction(cb: () => void) {
      state.addLayer();
      cb();
      const removed = state.removeLayer();
      if (removed?.history?.length) {
        history.add(removed.history, { skipExecution: true });
      }
    },
    undo() {
      if (state.pointer === -1) {
        return;
      }
      function _undo(action?: ActionSet | ActionList) {
        assert(action, "No action to undo");
        if (Array.isArray(action)) {
          // reverse the array to undo in the correct order
          const actions = Array.from(action).reverse();
          for (const action of actions) {
            _undo(action);
          }
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
      function _redo(action: ActionSet | ActionList) {
        if (Array.isArray(action)) {
          for (const a of action) {
            _redo(a);
          }
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
