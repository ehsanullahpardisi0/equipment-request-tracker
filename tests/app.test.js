import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequest, STORAGE_KEY } from "../src/request-store.js";

// A small DOM test double exercises the real app module and event handlers.
// It does not replace browser checks for layout, keyboard focus, or native controls.
class Element {
  value = "";
  textContent = "";
  children = [];
  hidden = false;
  attributes = {};
  listeners = {};
  classList = { toggle() {} };
  addEventListener(type, listener) { this.listeners[type] = listener; }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() { this.focused = true; }
}

const valid = {
  requester: "Test request",
  department: "Operations",
  equipment: "Laptop",
  neededBy: "2027-01-01",
  reason: "Test equipment need",
};
const fixture = () => ["High", "Normal", "Low", "High"].map((priority, i) =>
  createRequest({ ...valid, requester: ["H-new", "N-new", "L-old", "H-old"][i], priority }, {
    id: ["H-new", "N-new", "L-old", "H-old"][i],
    now: new Date(Date.UTC(2026, 9, 18, 12 - i)),
  }),
);
let run = 0;

async function boot(records = [], existingStorage) {
  const nodes = Object.fromEntries([
    "request-form", "form-message", "needed-by", "request-count", "empty-state",
    "no-matches", "priority-filter", "request-table-wrapper", "request-table-body", "requester",
  ].map((id) => [id, new Element()]));
  const form = nodes["request-form"];
  form.elements = [];
  for (const name of ["requester", "department", "equipment", "neededBy", "priority", "reason"]) {
    const element = nodes[name === "neededBy" ? "needed-by" : name] ?? new Element();
    form.elements.push(element);
    form.elements[name] = element;
  }
  form.reset = () => {
    for (const name of ["requester", "department", "equipment", "neededBy", "priority", "reason"]) {
      form.elements[name].value = name === "priority" ? "Normal" : "";
    }
  };
  form.reset();
  let raw = JSON.stringify(records);
  const storage = existingStorage ?? {
    writes: 0,
    getItem(key) { assert.equal(key, STORAGE_KEY); return raw; },
    setItem(key, value) { assert.equal(key, STORAGE_KEY); this.writes++; raw = value; },
  };
  globalThis.localStorage = storage;
  globalThis.document = {
    querySelector(selector) {
      assert.ok(nodes[selector.slice(1)], "Unexpected selector: " + selector);
      return nodes[selector.slice(1)];
    },
    createElement() { return new Element(); },
  };
  globalThis.FormData = class {
    constructor(form) { this.form = form; }
    entries() {
      return ["requester", "department", "equipment", "neededBy", "priority", "reason"]
        .map((name) => [name, this.form.elements[name].value]);
    }
  };
  // Simulate a browser trying to restore a previous dropdown value on reload.
  nodes["priority-filter"].value = "High";
  await import("../src/app.js?test=" + run++);
  return {
    nodes, storage,
    names: () => nodes["request-table-body"].children.map((row) => row.children[0].textContent),
    priorities: () => nodes["request-table-body"].children.map((row) => row.children[3].textContent),
    count: () => nodes["request-count"].textContent,
    filter(priority) {
      nodes["priority-filter"].value = priority;
      nodes["priority-filter"].listeners.change();
    },
    submit(values) {
      for (const [name, value] of Object.entries(values)) form.elements[name].value = value;
      form.listeners.submit({ preventDefault() {} });
    },
  };
}

test("app event handlers and storage integration", async (t) => {
  const previous = Object.fromEntries(["localStorage", "document", "FormData"].map(
    (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)],
  ));
  try {
    await t.test("initial view, immediate filters, matching counts, ordering, and restore all", async () => {
      const app = await boot(fixture());
      assert.equal(app.nodes["priority-filter"].value, "All priorities");
      assert.deepEqual(app.names(), ["H-new", "N-new", "L-old", "H-old"]);
      assert.equal(app.count(), "4 requests");
      for (const [priority, names] of [
        ["High", ["H-new", "H-old"]], ["Normal", ["N-new"]], ["Low", ["L-old"]],
        ["All priorities", ["H-new", "N-new", "L-old", "H-old"]],
      ]) {
        app.filter(priority);
        assert.deepEqual(app.names(), names);
        assert.equal(app.count(), names.length + (names.length === 1 ? " request" : " requests"));
        assert.equal(app.nodes["no-matches"].hidden, true);
      }
      assert.equal(app.storage.writes, 0);
    });

    await t.test("zero matches and an empty saved collection use distinct empty states", async () => {
      const app = await boot(fixture().filter((r) => r.priority !== "High"));
      app.filter("High");
      assert.deepEqual(app.names(), []);
      assert.equal(app.count(), "0 requests");
      assert.equal(app.nodes["no-matches"].hidden, false);
      assert.equal(app.nodes["empty-state"].hidden, true);
      assert.equal(app.nodes["request-table-wrapper"].hidden, true);
      app.filter("All priorities");
      assert.equal(app.names().length, 2);
      const empty = await boot([]);
      assert.equal(empty.nodes["empty-state"].hidden, false);
      assert.equal(empty.nodes["no-matches"].hidden, true);
      for (const priority of ["Low", "Normal", "High"]) {
        empty.filter(priority);
        assert.equal(empty.count(), "0 requests");
        assert.equal(empty.nodes["empty-state"].hidden, true);
        assert.equal(empty.nodes["no-matches"].hidden, false);
      }
    });

    await t.test("legacy display, counts, refresh reset, and raw storage preservation", async () => {
      const legacy = createRequest(valid, { id: "legacy" });
      delete legacy.priority;
      const app = await boot([...fixture(), legacy]);
      const raw = app.storage.getItem(STORAGE_KEY);
      assert.equal(app.priorities().at(-1), "Normal");
      for (const [priority, count] of [["Normal", 2], ["All priorities", 5], ["Low", 1], ["High", 2]]) {
        app.filter(priority);
        assert.equal(app.names().length, count);
      }
      const refreshed = await boot([], app.storage);
      assert.equal(refreshed.nodes["priority-filter"].value, "All priorities");
      assert.equal(refreshed.count(), "5 requests");
      assert.equal(refreshed.priorities().at(-1), "Normal");
      refreshed.filter("Normal");
      assert.equal(refreshed.count(), "2 requests");
      assert.equal(refreshed.storage.getItem(STORAGE_KEY), raw);
      assert.equal(refreshed.storage.writes, 0);
    });

    await t.test("creating matching and nonmatching requests keeps the full collection", async () => {
      for (const priority of ["High", "Low"]) {
        const original = fixture();
        const app = await boot(original);
        app.filter("High");
        app.submit({ ...valid, requester: "Added", priority });
        assert.equal(app.nodes["priority-filter"].value, "High");
        assert.equal(app.count(), priority === "High" ? "3 requests" : "2 requests");
        assert.deepEqual(app.names(), priority === "High" ? ["Added", "H-new", "H-old"] : ["H-new", "H-old"]);
        const saved = JSON.parse(app.storage.getItem(STORAGE_KEY));
        assert.equal(saved.length, 5);
        assert.deepEqual(saved.slice(1), original);
        assert.equal(app.nodes["request-form"].elements.priority.value, "Normal");
        app.filter("All priorities");
        assert.equal(app.names()[0], "Added");
        const refreshed = await boot([], app.storage);
        assert.equal(refreshed.count(), "5 requests");
        assert.deepEqual(refreshed.names(), ["Added", "H-new", "N-new", "L-old", "H-old"]);
      }
    });

    await t.test("invalid creation leaves saved requests and matching count unchanged", async () => {
      const app = await boot(fixture());
      app.filter("High");
      const raw = app.storage.getItem(STORAGE_KEY);
      app.submit({ ...valid, requester: "", priority: "High" });
      assert.equal(app.nodes["form-message"].textContent, "Complete all required fields.");
      assert.equal(app.nodes["request-form"].elements.requester.attributes["aria-invalid"], "true");
      assert.equal(app.count(), "2 requests");
      assert.equal(app.storage.getItem(STORAGE_KEY), raw);
      assert.equal(app.storage.writes, 0);
    });
  } finally {
    for (const [name, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

test("HTML provides a labeled filter and the specified no-matches message", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<label for="priority-filter">Priority filter<\/label>/);
  const select = html.match(/<select id="priority-filter">([\s\S]*?)<\/select>/)[1];
  assert.deepEqual([...select.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]),
    ["All priorities", "Low", "Normal", "High"]);
  assert.match(select, /value="All priorities" selected/);
  assert.match(html, /<p>No requests match this priority<\/p>/);
});
