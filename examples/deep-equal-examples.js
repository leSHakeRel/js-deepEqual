// Launch: node examples/deep-equal-examples.js

const assert = require("node:assert/strict");
const { DeepEqualEngine, Comparator } = require("../src/deep-equal");

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
    new Map([
      ["a", 1],
      ["b", { ok: true }],
    ]),
    new Map([
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

const cyclicA = { name: "node" };
cyclicA.self = cyclicA;
const cyclicB = { name: "node" };
cyclicB.self = cyclicB;
assert.equal(engine.deepEqual(cyclicA, cyclicB), true);

const left = { name: "a" };
const right = { name: "b" };
left.other = right;
right.other = left;
const left2 = { name: "a" };
const right2 = { name: "b" };
left2.other = right2;
right2.other = left2;
assert.equal(engine.deepEqual(left, left2), true);
assert.equal(engine.deepEqual(cyclicA, cyclicB), true);

class UrlComparator extends Comparator {
  canHandle(value) {
    return value instanceof URL;
  }

  compare(a, b) {
    return b instanceof URL && a.href === b.href;
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
  constructor(value) {
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
