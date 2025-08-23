import { describe, it, expect } from "vitest";
import { createHistory, actionSet } from "./history.js";

describe("History", () => {
  describe("basic undo/redo", () => {
    it("should execute a single action", () => {
      const history = createHistory();
      let value = 0;

      const action = actionSet(
        () => {
          value = 1;
        },
        () => {
          value = 0;
        },
      );

      history.add(action);
      expect(value).toBe(1);
    });
    it("should execute and undo a single action", () => {
      const history = createHistory();
      let value = 0;

      const action = actionSet(
        () => {
          value = 1;
        },
        () => {
          value = 0;
        },
      );

      history.add(action);
      expect(value).toBe(1);

      history.undo();
      expect(value).toBe(0);
    });

    it("should execute and redo a single action", () => {
      const history = createHistory();
      let value = 0;

      const action = actionSet(
        () => {
          value = 1;
        },
        () => {
          value = 0;
        },
      );

      history.add(action);
      history.undo();
      expect(value).toBe(0);

      history.redo();
      expect(value).toBe(1);
    });

    it("should handle multiple actions in sequence", () => {
      const history = createHistory();
      let value = 0;

      const action1 = actionSet(
        () => {
          value += 1;
        },
        () => {
          value -= 1;
        },
      );

      const action2 = actionSet(
        () => {
          value *= 2;
        },
        () => {
          value /= 2;
        },
      );

      history.add(action1);
      expect(value).toBe(1);

      history.add(action2);
      expect(value).toBe(2);

      history.undo();
      expect(value).toBe(1);

      history.undo();
      expect(value).toBe(0);

      history.redo();
      expect(value).toBe(1);

      history.redo();
      expect(value).toBe(2);
    });

    it("should deduplicate actions with the same key", () => {
      const history = createHistory();
      let value = 0;

      const key = "test";
      history.add(
        actionSet(
          () => {
            value += 1;
          },
          () => {
            value -= 1;
          },
          { key },
        ),
      );
      expect(value).toBe(1);

      history.add(
        actionSet(
          () => {
            value += 1;
          },
          () => {
            value -= 1;
          },
          { key },
        ),
      );
      expect(value).toBe(2);

      history.undo();
      expect(value).toBe(0);
    });
  });

  describe("transactions", () => {
    it("should handle successful transactions", () => {
      const history = createHistory();
      let value = 0;

      history.transaction(() => {
        const action1 = actionSet(
          () => {
            value += 1;
          },
          () => {
            value -= 1;
          },
        );
        const action2 = actionSet(
          () => {
            value *= 2;
          },
          () => {
            value /= 2;
          },
        );

        history.add(action1);
        history.add(action2);
      });

      expect(value).toBe(2);

      history.undo();
      expect(value).toBe(0);

      history.redo();
      expect(value).toBe(2);
    });
  });

  describe("action lists", () => {
    it("should handle nested action lists", () => {
      const history = createHistory();
      let value = 0;

      const actionList = [
        actionSet(
          () => {
            value += 1;
          },
          () => {
            value -= 1;
          },
        ),
        [
          actionSet(
            () => {
              value *= 2;
            },
            () => {
              value /= 2;
            },
          ),
          actionSet(
            () => {
              value += 3;
            },
            () => {
              value -= 3;
            },
          ),
        ],
      ];

      history.add(actionList);
      expect(value).toBe(5); // (0 + 1) * 2 + 3

      history.undo();
      expect(value).toBe(0);

      history.redo();
      expect(value).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("should not undo when history is empty", () => {
      const history = createHistory();
      let value = 0;

      const action = actionSet(
        () => {
          value = 1;
        },
        () => {
          value = 0;
        },
      );

      history.undo(); // Should do nothing
      expect(value).toBe(0);

      history.add(action);
      history.undo();
      history.undo(); // Should do nothing
      expect(value).toBe(0);
    });

    it("should not redo when at the end of history", () => {
      const history = createHistory();
      let value = 0;

      const action = actionSet(
        () => {
          value = 1;
        },
        () => {
          value = 0;
        },
      );

      history.redo(); // Should do nothing
      expect(value).toBe(0);

      history.add(action);
      history.redo(); // Should do nothing
      expect(value).toBe(1);
    });

    it("should clear future actions when adding new action after undo", () => {
      const history = createHistory();
      let value = 0;

      const action1 = actionSet(
        () => {
          value = 1;
        },
        () => {
          value = 0;
        },
      );

      const action2 = actionSet(
        () => {
          value = 2;
        },
        () => {
          value = 1;
        },
      );

      const action3 = actionSet(
        () => {
          value = 3;
        },
        () => {
          value = 2;
        },
      );

      history.add(action1);
      history.add(action2);
      history.undo();
      history.add(action3);

      expect(value).toBe(3);
      history.redo(); // Should do nothing since future actions were cleared
      expect(value).toBe(3);
    });

    it("should work with complex nested transactions + duplicates", () => {
      const history = createHistory();
      let value = 2;

      const mult = (multiplier: number) => {
        history.add(
          actionSet(
            () => {
              value *= multiplier;
            },
            () => {
              value /= multiplier;
            },
            { key: `mult-${multiplier}` },
          ),
        );
      };
      const add = (addend: number) => {
        history.add(
          actionSet(
            () => {
              value += addend;
            },
            () => {
              value -= addend;
            },
          ),
        );
      };

      const pow = (exponent: number) => {
        return history.transaction(() => {
          const v = value;
          for (let i = 1; i < exponent; i++) {
            mult(v);
          }
        });
      };

      history.transaction(() => {
        mult(2);
        mult(2);
        pow(2);
        add(3);
        mult(3);
      });
      expect(value).toBe(201);
      history.undo();
      expect(value).toBe(2);
    });
  });
});
