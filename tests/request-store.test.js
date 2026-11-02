import assert from "node:assert/strict";
import test from "node:test";

import {
  RequestValidationError,
  STORAGE_KEY,
  appendRequest,
  createRequest,
  filterRequests,
  getRequestPriority,
  loadRequests,
  saveRequests,
} from "../src/request-store.js";

const validInput = {
  requester: "  Jordan Lee  ",
  department: "Operations",
  equipment: "  Laptop  ",
  neededBy: "2026-09-15",
  reason: "  Replace a failed field computer.  ",
};

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

test("createRequest trims input and adds system fields", () => {
  const request = createRequest(validInput, {
    id: "request-1",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  assert.deepEqual(request, {
    id: "request-1",
    requester: "Jordan Lee",
    department: "Operations",
    equipment: "Laptop",
    priority: "Normal",
    neededBy: "2026-09-15",
    reason: "Replace a failed field computer.",
    createdAt: "2026-08-17T12:00:00.000Z",
  });
});

test("createRequest reports missing required fields", () => {
  assert.throws(
    () => createRequest({ ...validInput, requester: "", equipment: " " }),
    (error) => {
      assert.ok(error instanceof RequestValidationError);
      assert.deepEqual(Object.keys(error.errors), ["requester", "equipment"]);
      return true;
    },
  );
});

test("appendRequest returns a new list with the newest request first", () => {
  const original = [{ id: "old" }];
  const result = appendRequest(original, { id: "new" });

  assert.deepEqual(result.map((request) => request.id), ["new", "old"]);
  assert.deepEqual(original.map((request) => request.id), ["old"]);
});

test("saveRequests and loadRequests round-trip valid records", () => {
  const storage = new MemoryStorage();
  const request = createRequest(validInput, {
    id: "request-2",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  saveRequests([request], storage);

  assert.deepEqual(loadRequests(storage), [request]);
});

test("loadRequests safely handles damaged stored data", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, "not-json");

  assert.deepEqual(loadRequests(storage), []);
});

test("new requests default to Normal priority", () => {
  assert.equal(createRequest(validInput).priority, "Normal");
});

test("each priority survives creation and storage", () => {
  for (const priority of ["Low", "Normal", "High"]) {
    const storage = new MemoryStorage();
    const request = createRequest({ ...validInput, priority });
    assert.equal(request.priority, priority);
    saveRequests([request], storage);
    assert.deepEqual(loadRequests(storage), [request]);
  }
});

test("createRequest rejects unsupported priority values", () => {
  for (const priority of ["Urgent", "", null]) {
    assert.throws(
      () => createRequest({ ...validInput, priority }),
      (error) => {
        assert.ok(error instanceof RequestValidationError);
        assert.deepEqual(Object.keys(error.errors), ["priority"]);
        return true;
      },
    );
  }
});

test("older stored requests behave as Normal without changing saved data", () => {
  const storage = new MemoryStorage();
  const request = createRequest(validInput);
  delete request.priority;
  saveRequests([request], storage);

  const loaded = loadRequests(storage);
  assert.deepEqual(loaded, [request]);
  assert.equal(getRequestPriority(loaded[0]), "Normal");
  assert.deepEqual(filterRequests(loaded, "Normal"), [request]);
  assert.equal(Object.hasOwn(loaded[0], "priority"), false);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), [request]);
});

function filterFixture() {
  return ["High", "Normal", "Low", "High"].map((priority, index) =>
    createRequest({ ...validInput, priority }, {
      id: ["H-new", "N-new", "L-old", "H-old"][index],
      now: new Date(Date.UTC(2026, 9, 18, 12 - index)),
    }),
  );
}

test("filtering each priority and All preserves the original order and records", () => {
  const requests = filterFixture();
  const before = JSON.stringify(requests);
  for (const request of requests) Object.freeze(request);
  Object.freeze(requests);
  const expected = {
    "All priorities": ["H-new", "N-new", "L-old", "H-old"],
    High: ["H-new", "H-old"],
    Normal: ["N-new"],
    Low: ["L-old"],
  };
  for (const [priority, ids] of Object.entries(expected)) {
    assert.deepEqual(filterRequests(requests, priority).map((r) => r.id), ids);
  }
  assert.equal(JSON.stringify(requests), before);
  assert.notEqual(filterRequests(requests), requests);
});

test("filtering empty and nonmatching collections returns no records", () => {
  for (const priority of ["All priorities", "Low", "Normal", "High"]) {
    assert.deepEqual(filterRequests([], priority), []);
  }
  assert.deepEqual(filterRequests(filterFixture().filter((r) => r.priority !== "High"), "High"), []);
});

test("older records remain unchanged through filtering, reload, and later creation", () => {
  const storage = new MemoryStorage();
  const legacy = createRequest(validInput, { id: "legacy" });
  delete legacy.priority;
  legacy.extra = "preserve this field";
  const original = [...filterFixture(), legacy];
  saveRequests(original, storage);
  const rawBefore = storage.getItem(STORAGE_KEY);
  const requests = loadRequests(storage);
  for (const [priority, count] of [["All priorities", 5], ["Normal", 2], ["Low", 1], ["High", 2]]) {
    assert.equal(filterRequests(requests, priority).length, count);
  }
  assert.equal(storage.getItem(STORAGE_KEY), rawBefore);
  const reloaded = loadRequests(storage);
  assert.deepEqual(reloaded, original);
  assert.equal(getRequestPriority(reloaded.at(-1)), "Normal");

  const next = createRequest({ ...validInput, priority: "Low" }, { id: "next" });
  saveRequests(appendRequest(reloaded, next), storage);
  assert.deepEqual(loadRequests(storage), [next, ...original]);
  assert.equal(Object.hasOwn(loadRequests(storage).at(-1), "priority"), false);
});
