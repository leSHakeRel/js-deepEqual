// Tests for DeepEqualEngine (deep comparison via OOP comparators).
// Run: npm test

import {
  DeepEqualEngine,
  Comparator,
  NumberComparator,
  StringComparator,
  BooleanComparator,
  PrimitiveComparator,
  DateComparator,
  RegExpComparator,
  MapComparator,
  SetComparator,
  ArrayComparator,
  UnorderedArrayComparator,
  ObjectComparator,
} from "../src/deep-equal";

interface CyclicNode {
  name: string;
  self?: CyclicNode;
}

interface MutualNode {
  name: string;
  other?: MutualNode;
}

describe("DeepEqualEngine: primitives", () => {
  const engine = new DeepEqualEngine();

  test("NaN equals NaN (Object.is)", () => {
    expect(engine.deepEqual(NaN, NaN)).toBe(true);
  });

  test("+0 and -0 are not equal (Object.is)", () => {
    expect(engine.deepEqual(0, -0)).toBe(false);
  });

  test("null is not equal to {}", () => {
    expect(engine.deepEqual(null, {})).toBe(false);
  });

  test("null is not equal to undefined", () => {
    expect(engine.deepEqual(null, undefined)).toBe(false);
  });

  test("undefined equals undefined", () => {
    expect(engine.deepEqual(undefined, undefined)).toBe(true);
  });

  test("strings are compared case-sensitively by default", () => {
    expect(engine.deepEqual("abc", "ABC")).toBe(false);
    expect(engine.deepEqual("abc", "abc")).toBe(true);
  });

  test("number is not equal to string with the same value", () => {
    expect(engine.deepEqual(42, "42")).toBe(false);
  });

  test("symbols are compared by value", () => {
    expect(engine.deepEqual(Symbol("id"), Symbol("id"))).toBe(false);
    const sym = Symbol("id");
    expect(engine.deepEqual(sym, sym)).toBe(true);
  });
});

describe("DeepEqualEngine: basic types (numbers, strings, booleans)", () => {
  const engine = new DeepEqualEngine();

  test("numbers are compared by value", () => {
    expect(engine.deepEqual(42, 42)).toBe(true);
    expect(engine.deepEqual(42, 43)).toBe(false);
  });

  test("NaN equals NaN via NumberComparator", () => {
    expect(engine.deepEqual(NaN, NaN)).toBe(true);
  });

  test("+0 and -0 are not equal via NumberComparator", () => {
    expect(engine.deepEqual(0, -0)).toBe(false);
  });

  test("Infinity equals Infinity", () => {
    expect(engine.deepEqual(Infinity, Infinity)).toBe(true);
    expect(engine.deepEqual(Infinity, -Infinity)).toBe(false);
  });

  test("strings are compared by value", () => {
    expect(engine.deepEqual("hello", "hello")).toBe(true);
    expect(engine.deepEqual("hello", "world")).toBe(false);
  });

  test("strings are case-sensitive by default", () => {
    expect(engine.deepEqual("Hello", "hello")).toBe(false);
  });

  test("caseSensitive: false ignores string case", () => {
    const loose = new DeepEqualEngine({ caseSensitive: false });
    expect(loose.deepEqual("Hello", "hello")).toBe(true);
  });

  test("booleans are compared by value", () => {
    expect(engine.deepEqual(true, true)).toBe(true);
    expect(engine.deepEqual(false, false)).toBe(true);
    expect(engine.deepEqual(true, false)).toBe(false);
  });

  test("boolean is not equal to number 1/0", () => {
    expect(engine.deepEqual(true, 1)).toBe(false);
    expect(engine.deepEqual(false, 0)).toBe(false);
  });

  test("number is not equal to string with the same value", () => {
    expect(engine.deepEqual(42, "42")).toBe(false);
  });
});

describe("DeepEqualEngine: arrays", () => {
  const engine = new DeepEqualEngine();

  test("nested arrays are equal", () => {
    expect(engine.deepEqual([1, [2, [3]]], [1, [2, [3]]])).toBe(true);
  });

  test("arrays with different order are not equal by default", () => {
    expect(engine.deepEqual(["a", "b"], ["b", "a"])).toBe(false);
  });

  test("arrays of different lengths are not equal", () => {
    expect(engine.deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  test("array is not equal to object with numeric keys", () => {
    expect(engine.deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  test("array of objects is compared deeply", () => {
    expect(
      engine.deepEqual(
        [{ id: 1, tags: ["a", "b"] }],
        [{ id: 1, tags: ["a", "b"] }]
      )
    ).toBe(true);
  });
});

describe("DeepEqualEngine: nested objects", () => {
  const engine = new DeepEqualEngine();

  test("deeply nested objects are equal regardless of key order", () => {
    const a = { a: 1, b: [2, 3], c: { d: 4, e: { f: [5, { g: 6 }] } } };
    const b = { c: { e: { f: [5, { g: 6 }] }, d: 4 }, b: [2, 3], a: 1 };
    expect(engine.deepEqual(a, b)).toBe(true);
  });

  test("objects with different number of keys are not equal", () => {
    expect(engine.deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });

  test("objects with different values are not equal", () => {
    expect(engine.deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test("object with undefined value is not equal to object without the key", () => {
    expect(engine.deepEqual({ a: undefined }, {})).toBe(false);
  });

  test("object with null prototype is compared as a plain object", () => {
    const a = Object.create(null);
    a.x = 1;
    const b = Object.create(null);
    b.x = 1;
    expect(engine.deepEqual(a, b)).toBe(true);
  });
});

describe("DeepEqualEngine: circular references", () => {
  const engine = new DeepEqualEngine();

  test("self-referencing object equals an analogous one", () => {
    const cyclicA: CyclicNode = { name: "node" };
    cyclicA.self = cyclicA;
    const cyclicB: CyclicNode = { name: "node" };
    cyclicB.self = cyclicB;
    expect(engine.deepEqual(cyclicA, cyclicB)).toBe(true);
  });

  test("mutual references between two objects", () => {
    const left: MutualNode = { name: "a" };
    const right: MutualNode = { name: "b" };
    left.other = right;
    right.other = left;
    const left2: MutualNode = { name: "a" };
    const right2: MutualNode = { name: "b" };
    left2.other = right2;
    right2.other = left2;
    expect(engine.deepEqual(left, left2)).toBe(true);
  });

  test("cyclic objects with different values are not equal", () => {
    const a: CyclicNode = { name: "a" };
    a.self = a;
    const b: CyclicNode = { name: "b" };
    b.self = b;
    expect(engine.deepEqual(a, b)).toBe(false);
  });

  test("cycle in an array", () => {
    const a: unknown[] = [1];
    a.push(a);
    const b: unknown[] = [1];
    b.push(b);
    expect(engine.deepEqual(a, b)).toBe(true);
  });

  test("cycle in a Map", () => {
    const a = new Map();
    a.set("self", a);
    const b = new Map();
    b.set("self", b);
    expect(engine.deepEqual(a, b)).toBe(true);
  });
});

describe("DeepEqualEngine: different data types", () => {
  const engine = new DeepEqualEngine();

  test("Date equals Date with the same time", () => {
    expect(
      engine.deepEqual(new Date("2024-01-02"), new Date("2024-01-02"))
    ).toBe(true);
  });

  test("Date is not equal to object with getTime method", () => {
    expect(engine.deepEqual(new Date("2024-01-02"), { getTime() {} })).toBe(
      false
    );
  });

  test("Dates with different times are not equal", () => {
    expect(
      engine.deepEqual(new Date("2024-01-02"), new Date("2024-01-03"))
    ).toBe(false);
  });

  test("RegExp is compared by source and flags", () => {
    expect(engine.deepEqual(/test/gi, /test/gi)).toBe(true);
    expect(engine.deepEqual(/test/gi, /test/g)).toBe(false);
    expect(engine.deepEqual(/test/gi, /other/gi)).toBe(false);
  });

  test("Map is compared by keys and values", () => {
    const a = new Map<string, unknown>([
      ["a", 1],
      ["b", { ok: true }],
    ]);
    const b = new Map<string, unknown>([
      ["b", { ok: true }],
      ["a", 1],
    ]);
    expect(engine.deepEqual(a, b)).toBe(true);
  });

  test("Maps with different values are not equal", () => {
    const a = new Map([["a", 1]]);
    const b = new Map([["a", 2]]);
    expect(engine.deepEqual(a, b)).toBe(false);
  });

  test("Set is compared by elements regardless of order", () => {
    expect(engine.deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(
      true
    );
    expect(engine.deepEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
  });

  test("Set of objects is compared deeply", () => {
    const a = new Set([{ id: 1 }, { id: 2 }]);
    const b = new Set([{ id: 2 }, { id: 1 }]);
    expect(engine.deepEqual(a, b)).toBe(true);
  });

  test("object is not equal to array", () => {
    expect(engine.deepEqual({ 0: 1, length: 1 }, [1])).toBe(false);
  });

  test("functions are compared by reference", () => {
    const fn = () => {};
    expect(engine.deepEqual(fn, fn)).toBe(true);
    expect(engine.deepEqual(() => {}, () => {})).toBe(false);
  });
});

describe("DeepEqualEngine: options", () => {
  test("ignoreArrayOrder: true ignores element order", () => {
    const loose = new DeepEqualEngine({ ignoreArrayOrder: true });
    expect(loose.deepEqual([1, 2, 3], [3, 2, 1])).toBe(true);
    expect(loose.deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  test("caseSensitive: false ignores string case", () => {
    const loose = new DeepEqualEngine({ caseSensitive: false });
    expect(loose.deepEqual("Hello", "hello")).toBe(true);
    expect(loose.deepEqual("Hello", "world")).toBe(false);
  });

  test("combination of options: unordered + case-insensitive", () => {
    const loose = new DeepEqualEngine({
      ignoreArrayOrder: true,
      caseSensitive: false,
    });
    expect(
      loose.deepEqual(
        [{ sku: "A", title: "Лампа" }, { sku: "B" }],
        [{ sku: "B" }, { sku: "A", title: "лампа" }]
      )
    ).toBe(true);
  });

  test("array order matters by default", () => {
    const engine = new DeepEqualEngine();
    expect(engine.deepEqual(["a", "b"], ["b", "a"])).toBe(false);
  });
});

describe("DeepEqualEngine: extension via inheritance", () => {
  test("adding a custom comparator for URL", () => {
    class UrlComparator extends Comparator {
      canHandle(value: unknown): boolean {
        return value instanceof URL;
      }

      compare(a: unknown, b: unknown): boolean {
        return a instanceof URL && b instanceof URL && a.href === b.href;
      }
    }

    const engine = new DeepEqualEngine();
    engine.addComparator(new UrlComparator());
    expect(
      engine.deepEqual(
        new URL("https://otus.ru/lessons"),
        new URL("https://otus.ru/lessons")
      )
    ).toBe(true);
    expect(
      engine.deepEqual(
        new URL("https://otus.ru/lessons"),
        new URL("https://otus.ru/courses")
      )
    ).toBe(false);
  });

  test("addComparator rejects an object that does not inherit Comparator", () => {
    const engine = new DeepEqualEngine();
    expect(() => engine.addComparator({} as Comparator)).toThrow(TypeError);
    expect(() => engine.addComparator({} as Comparator)).toThrow(/Comparator/);
  });

  test("custom comparator takes priority over built-in ones", () => {
    class AlwaysTrueComparator extends Comparator {
      canHandle(): boolean {
        return true;
      }

      compare(): boolean {
        return true;
      }
    }

    const engine = new DeepEqualEngine();
    engine.addComparator(new AlwaysTrueComparator());
    expect(engine.deepEqual({ a: 1 }, { b: 2 })).toBe(true);
  });
});

describe("DeepEqualEngine: class hierarchy", () => {
  test("UnorderedArrayComparator inherits ArrayComparator", () => {
    expect(UnorderedArrayComparator.prototype instanceof ArrayComparator).toBe(
      true
    );
  });

  test("all comparators inherit Comparator", () => {
    const comparators = [
      NumberComparator,
      StringComparator,
      BooleanComparator,
      PrimitiveComparator,
      DateComparator,
      RegExpComparator,
      MapComparator,
      SetComparator,
      ArrayComparator,
      UnorderedArrayComparator,
      ObjectComparator,
    ];
    for (const Ctor of comparators) {
      expect(Ctor.prototype instanceof Comparator).toBe(true);
    }
  });

  test("engine finds comparator via canHandle", () => {
    const engine = new DeepEqualEngine();
    expect(engine.findComparator(1)).toBeInstanceOf(NumberComparator);
    expect(engine.findComparator("x")).toBeInstanceOf(StringComparator);
    expect(engine.findComparator(true)).toBeInstanceOf(BooleanComparator);
    expect(engine.findComparator(null)).toBeInstanceOf(PrimitiveComparator);
    expect(engine.findComparator(undefined)).toBeInstanceOf(
      PrimitiveComparator
    );
    expect(engine.findComparator(new Date())).toBeInstanceOf(DateComparator);
    expect(engine.findComparator(/x/)).toBeInstanceOf(RegExpComparator);
    expect(engine.findComparator(new Map())).toBeInstanceOf(MapComparator);
    expect(engine.findComparator(new Set())).toBeInstanceOf(SetComparator);
    expect(engine.findComparator([])).toBeInstanceOf(ArrayComparator);
    expect(engine.findComparator({})).toBeInstanceOf(ObjectComparator);
  });
});
