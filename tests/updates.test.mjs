import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeUpdate,
  planPublish,
  selectNodeUpdates,
  selectPnpmUpdates,
} from "../scripts/updates.mjs";

/** A Node.js release as https://nodejs.org/dist/index.json lists it. */
function release(version, lts = false) {
  return { version: `v${version}`, lts };
}

const nodeIndex = [
  release("28.0.0", "Lithium"),
  release("27.2.0"),
  release("26.10.0", "Krypton"),
  release("26.9.0"),
  release("24.22.0", "Jasmine"),
  release("24.21.0", "Jasmine"),
  release("22.23.2", "Iron"),
  release("20.19.5", "Hydrogen"),
];

const currentNode = ["22.23.2", "24.21.0", "26.9.0"];

describe("selectNodeUpdates", () => {
  it("moves a tracked major to its newest release", () => {
    const result = selectNodeUpdates(currentNode, nodeIndex);

    assert.deepEqual(result.bumped, [
      { major: "24", from: "24.21.0", to: "24.22.0" },
      { major: "26", from: "26.9.0", to: "26.10.0" },
    ]);
  });

  it("keeps one entry per major, in place", () => {
    const result = selectNodeUpdates(currentNode, nodeIndex);

    assert.deepEqual(result.versions, [
      "22.23.2",
      "24.22.0",
      "26.10.0",
      "28.0.0",
    ]);
  });

  it("adds a higher major once Node.js marks it LTS", () => {
    const result = selectNodeUpdates(currentNode, nodeIndex);

    assert.deepEqual(result.added, ["28.0.0"]);
  });

  it("ignores a higher major that is not LTS", () => {
    const result = selectNodeUpdates(currentNode, [
      release("26.9.0"),
      release("27.2.0"),
    ]);

    assert.deepEqual(result.added, []);
  });

  it("ignores an LTS major below the ones already tracked", () => {
    const result = selectNodeUpdates(currentNode, nodeIndex);

    assert.ok(!result.versions.includes("20.19.5"));
  });

  it("reports no change when every major is current", () => {
    const result = selectNodeUpdates(["22.23.2"], [release("22.23.2", "Iron")]);

    assert.deepEqual(result, {
      versions: ["22.23.2"],
      bumped: [],
      added: [],
    });
  });

  it("never moves a major backwards", () => {
    const result = selectNodeUpdates(["24.21.0"], [release("24.20.0", "Jasmine")]);

    assert.deepEqual(result.versions, ["24.21.0"]);
    assert.deepEqual(result.bumped, []);
  });

  it("skips prerelease builds", () => {
    const result = selectNodeUpdates(["24.21.0"], [
      release("24.21.0", "Jasmine"),
      release("25.0.0-rc.1", "Jasmine"),
      release("28.0.0-rc.1", "Lithium"),
    ]);

    assert.deepEqual(result.versions, ["24.21.0"]);
  });
});

describe("selectPnpmUpdates", () => {
  const currentPnpm = ["11.27.1", "12.5.0", "12.5.1"];

  it("appends every stable release newer than the newest tracked one", () => {
    const result = selectPnpmUpdates(currentPnpm, [
      "12.5.1",
      "12.6.0",
      "12.5.2",
    ]);

    assert.deepEqual(result.added, ["12.5.2", "12.6.0"]);
    assert.deepEqual(result.versions, [
      "11.27.1",
      "12.5.0",
      "12.5.1",
      "12.5.2",
      "12.6.0",
    ]);
  });

  it("does not backfill a release older than the newest tracked one", () => {
    const result = selectPnpmUpdates(currentPnpm, ["11.28.0", "12.5.1"]);

    assert.deepEqual(result.added, []);
  });

  it("skips prereleases", () => {
    const result = selectPnpmUpdates(currentPnpm, ["12.6.0-beta.1", "13.0.0-rc.0"]);

    assert.deepEqual(result.added, []);
  });

  it("compares versions numerically, not as text", () => {
    const result = selectPnpmUpdates(["12.9.0"], ["12.10.0"]);

    assert.deepEqual(result.added, ["12.10.0"]);
  });
});

function nodeResult(overrides = {}) {
  return {
    versions: ["22.23.2", "24.22.0", "26.9.0"],
    bumped: [],
    added: [],
    ...overrides,
  };
}

function pnpmResult(added = []) {
  return { versions: ["12.5.1", ...added], added };
}

describe("planPublish", () => {
  it("reports no work when nothing moved", () => {
    const plan = planPublish(nodeResult(), pnpmResult());

    assert.equal(plan.changed, false);
    assert.equal(plan.build, false);
    assert.deepEqual(plan.rebuildMajors, []);
  });

  it("forces a rebuild of a bumped major only", () => {
    const plan = planPublish(
      nodeResult({ bumped: [{ major: "24", from: "24.21.0", to: "24.22.0" }] }),
      pnpmResult(),
    );

    assert.equal(plan.changed, true);
    assert.deepEqual(plan.rebuildMajors, ["24"]);
    assert.equal(plan.build, false);
  });

  it("builds every major without forcing when only pnpm moved", () => {
    const plan = planPublish(nodeResult(), pnpmResult(["12.6.0"]));

    assert.deepEqual(plan.rebuildMajors, []);
    assert.equal(plan.build, true);
    assert.deepEqual(plan.buildMajors, []);
  });

  it("splits the majors so no image is built twice", () => {
    const plan = planPublish(
      nodeResult({
        versions: ["22.23.2", "24.22.0", "26.9.0", "28.0.0"],
        bumped: [{ major: "24", from: "24.21.0", to: "24.22.0" }],
        added: ["28.0.0"],
      }),
      pnpmResult(["12.6.0"]),
    );

    assert.deepEqual(plan.rebuildMajors, ["24"]);
    assert.equal(plan.build, true);
    assert.deepEqual(plan.buildMajors, ["22", "26", "28"]);
  });

  it("builds a new major without forcing a rebuild", () => {
    const plan = planPublish(
      nodeResult({
        versions: ["22.23.2", "24.22.0", "26.9.0", "28.0.0"],
        added: ["28.0.0"],
      }),
      pnpmResult(),
    );

    assert.equal(plan.build, true);
    assert.deepEqual(plan.buildMajors, []);
  });
});

describe("describeUpdate", () => {
  it("names a bumped major and a new pnpm release", () => {
    const { title, body } = describeUpdate(
      nodeResult({ bumped: [{ major: "24", from: "24.21.0", to: "24.22.0" }] }),
      pnpmResult(["12.6.0"]),
    );

    assert.equal(title, "chore: update Node.js 24, add pnpm 12.6.0");
    assert.match(body, /24\.21\.0 to 24\.22\.0/);
    assert.match(body, /12\.6\.0/);
  });

  it("counts pnpm releases when there are many", () => {
    const added = ["12.6.0", "12.6.1", "12.7.0"];
    const { title } = describeUpdate(nodeResult(), pnpmResult(added));

    assert.equal(title, "chore: add 3 pnpm versions");
  });

  it("names a new Node.js major", () => {
    const { title } = describeUpdate(
      nodeResult({ added: ["28.0.0"] }),
      pnpmResult(),
    );

    assert.equal(title, "chore: add Node.js 28");
  });

  it("keeps the title on one line", () => {
    const { title } = describeUpdate(
      nodeResult({
        bumped: [
          { major: "24", from: "24.21.0", to: "24.22.0" },
          { major: "26", from: "26.9.0", to: "26.10.0" },
        ],
        added: ["28.0.0"],
      }),
      pnpmResult(["12.6.0"]),
    );

    assert.ok(!title.includes("\n"));
    assert.equal(
      title,
      "chore: update Node.js 24, 26, add Node.js 28, add pnpm 12.6.0",
    );
  });
});
