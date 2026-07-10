const runtimeKeys = ["file.reading"];

function assertSortedUnique(keys) {
  const sorted = [...keys].sort();
  if (JSON.stringify(keys) !== JSON.stringify(sorted)) {
    throw new Error("Runtime translation key registry must be sorted");
  }
  if (new Set(keys).size !== keys.length) {
    throw new Error("Runtime translation key registry must not contain duplicates");
  }
}

assertSortedUnique(runtimeKeys);

export const RUNTIME_KEYS = Object.freeze([...runtimeKeys]);

export function isRuntimeKey(key) {
  return RUNTIME_KEYS.includes(key);
}
