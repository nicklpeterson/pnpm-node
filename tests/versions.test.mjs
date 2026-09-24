import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { loadVersions } from "../scripts/versions.mjs";

afterEach(() => {
  delete process.env.NODE_MAJORS;
});

describe("loadVersions", () => {
  it("reads every Node.js version when no major is named", () => {
    assert.ok(loadVersions().node.length > 1);
  });

  it("keeps only the majors NODE_MAJORS names", () => {
    const every = loadVersions().node;

    process.env.NODE_MAJORS = "24";

    assert.deepEqual(
      loadVersions().node,
      every.filter((version) => version.startsWith("24.")),
    );
  });

  it("accepts a list with spaces", () => {
    process.env.NODE_MAJORS = " 22 , 24 ";

    assert.equal(loadVersions().node.length, 2);
  });

  it("reads every version when NODE_MAJORS is empty", () => {
    process.env.NODE_MAJORS = "";

    assert.ok(loadVersions().node.length > 1);
  });

  it("fails when NODE_MAJORS names a major versions.yml does not hold", () => {
    process.env.NODE_MAJORS = "21";

    assert.throws(() => loadVersions(), /21/);
  });

  it("does not touch the pnpm list", () => {
    const every = loadVersions().pnpm;

    process.env.NODE_MAJORS = "24";

    assert.deepEqual(loadVersions().pnpm, every);
  });
});
