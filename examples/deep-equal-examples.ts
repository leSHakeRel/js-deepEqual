// Launch: npm run build && npm run examples

import assert from "node:assert/strict";
import { DeepEqualEngine, Comparator } from "../src/deep-equal";

interface CyclicNode {
  name: string;
  self?: CyclicNode;
}

interface MutualNode {
  name: string;
  other?: MutualNode;
}

const engine = new DeepEqualEngine();

assert.equal(
  engine.deepEqual(
    { a: 1, b: [2, 3], c: { d: 4 } },
    { c: { d: 4 }, b: [2, 3], a: 1 }
  ),
  true
);
assert.equal(engine.deepEqual({ a: 1 }, { a: 1, b: undefined }), false);
assert.equal(engine.deepEqual(NaN, NaN), true);
assert.equal(engine.deepEqual(null, {}), false);
assert.equal(
  engine.deepEqual(new Date("2024-01-02"), new Date("2024-01-02")),
  true
);
assert.equal(engine.deepEqual(new Date("2024-01-02"), { getTime() {} }), false);
assert.equal(engine.deepEqual(/test/gi, /test/gi), true);
assert.equal(engine.deepEqual(/test/gi, /test/g), false);
assert.equal(
  engine.deepEqual(
    new Map<string, unknown>([
      ["a", 1],
      ["b", { ok: true }],
    ]),
    new Map<string, unknown>([
      ["b", { ok: true }],
      ["a", 1],
    ])
  ),
  true
);
assert.equal(
  engine.deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1])),
  true
);
assert.equal(engine.deepEqual(new Set([1, 2]), new Set([1, 2, 3])), false);

const cyclicA: CyclicNode = { name: "node" };
cyclicA.self = cyclicA;
const cyclicB: CyclicNode = { name: "node" };
cyclicB.self = cyclicB;
assert.equal(engine.deepEqual(cyclicA, cyclicB), true);

const left: MutualNode = { name: "a" };
const right: MutualNode = { name: "b" };
left.other = right;
right.other = left;
const left2: MutualNode = { name: "a" };
const right2: MutualNode = { name: "b" };
left2.other = right2;
right2.other = left2;
assert.equal(engine.deepEqual(left, left2), true);
assert.equal(engine.deepEqual(cyclicA, cyclicB), true);

class UrlComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return value instanceof URL;
  }

  compare(a: unknown, b: unknown): boolean {
    return a instanceof URL && b instanceof URL && a.href === b.href;
  }
}

engine.addComparator(new UrlComparator());
assert.equal(
  engine.deepEqual(
    new URL("https://otus.ru/lessons"),
    new URL("https://otus.ru/lessons")
  ),
  true
);
class CustomBox {
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}
assert.throws(
  () => engine.deepEqual(new CustomBox(1), new CustomBox(1)),
  /CustomBox/
);

const loose = new DeepEqualEngine({
  ignoreArrayOrder: true,
  caseSensitive: false,
});
assert.equal(
  loose.deepEqual(
    [{ sku: "A", title: "Лампа" }, { sku: "B" }],
    [{ sku: "B" }, { sku: "A", title: "лампа" }]
  ),
  true
);
assert.equal(engine.deepEqual(["a", "b"], ["b", "a"]), false);

console.log("deepEqual");
console.log("nested objects, dates, maps, sets, cycles, URL: ok");
console.log("unordered + case-insensitive strategy: ok");
