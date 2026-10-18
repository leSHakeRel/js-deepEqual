export interface DeepEqualOptions {
  ignoreArrayOrder?: boolean;
  caseSensitive?: boolean;
}

export abstract class Comparator {
  abstract canHandle(value: unknown): boolean;
  abstract compare(a: unknown, b: unknown, context: DeepEqualEngine): boolean;
}

export class NumberComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return typeof value === "number";
  }

  compare(a: unknown, b: unknown): boolean {
    return typeof a === "number" && typeof b === "number" && Object.is(a, b);
  }
}

export class StringComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return typeof value === "string";
  }

  compare(a: unknown, b: unknown, context: DeepEqualEngine): boolean {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (context.options.caseSensitive === false) {
      return a.toLocaleLowerCase() === b.toLocaleLowerCase();
    }
    return Object.is(a, b);
  }
}

export class BooleanComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return typeof value === "boolean";
  }

  compare(a: unknown, b: unknown): boolean {
    return typeof a === "boolean" && typeof b === "boolean" && Object.is(a, b);
  }
}

export class PrimitiveComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return value == null || typeof value !== "object";
  }

  compare(a: unknown, b: unknown): boolean {
    return Object.is(a, b);
  }
}

export class DateComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return value instanceof Date;
  }

  compare(a: unknown, b: unknown): boolean {
    return (
      a instanceof Date &&
      b instanceof Date &&
      Object.is(a.getTime(), b.getTime())
    );
  }
}

export class RegExpComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return value instanceof RegExp;
  }

  compare(a: unknown, b: unknown): boolean {
    return (
      a instanceof RegExp &&
      b instanceof RegExp &&
      a.source === b.source &&
      a.flags === b.flags
    );
  }
}

export class MapComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return value instanceof Map;
  }

  compare(a: unknown, b: unknown, context: DeepEqualEngine): boolean {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) {
      return false;
    }
    for (const [key, value] of a) {
      if (!b.has(key)) return false;
      if (!context.compareNested(value, b.get(key))) return false;
    }
    return true;
  }
}

export class SetComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return value instanceof Set;
  }

  compare(a: unknown, b: unknown, context: DeepEqualEngine): boolean {
    if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) {
      return false;
    }
    const used = new Set<unknown>();
    for (const item of a) {
      let found = false;
      for (const candidate of b) {
        if (!used.has(candidate) && context.compareNested(item, candidate)) {
          used.add(candidate);
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }
}

export class ArrayComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return Array.isArray(value);
  }

  compare(a: unknown, b: unknown, context: DeepEqualEngine): boolean {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => context.compareNested(item, b[index]));
  }
}

export class UnorderedArrayComparator extends ArrayComparator {
  compare(a: unknown, b: unknown, context: DeepEqualEngine): boolean {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    const used = new Set<number>();
    return a.every((item) => {
      const index = b.findIndex(
        (candidate, candidateIndex) =>
          !used.has(candidateIndex) && context.compareNested(item, candidate)
      );
      if (index === -1) return false;
      used.add(index);
      return true;
    });
  }
}

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export class ObjectComparator extends Comparator {
  canHandle(value: unknown): boolean {
    return isPlainObject(value);
  }

  compare(a: unknown, b: unknown, context: DeepEqualEngine): boolean {
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (key) => Object.hasOwn(b, key) && context.compareNested(a[key], b[key])
    );
  }
}

export class DeepEqualEngine {
  readonly options: Required<DeepEqualOptions>;
  readonly comparators: Comparator[];
  #seen = new WeakMap<object, WeakSet<object>>();

  constructor(options: DeepEqualOptions = {}) {
    this.options = {
      ignoreArrayOrder: false,
      caseSensitive: true,
      ...options,
    };
    this.comparators = [
      new NumberComparator(),
      new StringComparator(),
      new BooleanComparator(),
      new PrimitiveComparator(),
      new DateComparator(),
      new RegExpComparator(),
      new MapComparator(),
      new SetComparator(),
      this.options.ignoreArrayOrder
        ? new UnorderedArrayComparator()
        : new ArrayComparator(),
      new ObjectComparator(),
    ];
  }

  deepEqual(a: unknown, b: unknown): boolean {
    this.#seen = new WeakMap();
    return this.#compare(a, b);
  }

  compareNested(a: unknown, b: unknown): boolean {
    return this.#compare(a, b);
  }

  findComparator(value: unknown): Comparator | undefined {
    return this.comparators.find((comparator) => comparator.canHandle(value));
  }

  addComparator(comparator: Comparator): void {
    if (!(comparator instanceof Comparator)) {
      throw new TypeError("The comparator must inherit from Comparator");
    }
    this.comparators.unshift(comparator);
  }

  #compare(a: unknown, b: unknown): boolean {
    const aObj = isObject(a) ? a : null;
    const bObj = isObject(b) ? b : null;
    if (aObj && bObj) {
      let paired = this.#seen.get(aObj);
      if (paired?.has(bObj)) return true;
      if (!paired) {
        paired = new WeakSet<object>();
        this.#seen.set(aObj, paired);
      }
      paired.add(bObj);
    }

    try {
      const comparator = this.findComparator(a);
      if (!comparator) {
        throw new Error(`No comparator for ${describe(a)}`);
      }
      return comparator.compare(a, b, this);
    } finally {
      if (aObj && bObj) this.#seen.get(aObj)?.delete(bObj);
    }
  }
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function describe(value: unknown): string {
  if (value === null) return "null";
  const name = (value as { constructor?: { name?: string } }).constructor?.name;
  return name ?? typeof value;
}
