import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseVersionsDocument, readList, writeList } from "../scripts/versions-document.mjs";

const source = `# The versions this project builds.
node:
  - 22.23.2
  - 24.21.0

pnpm:
  # The oldest release we still publish.
  - 11.27.1
  - 12.5.1

variant:
  - alpine
`;

describe("readList", () => {
  it("reads a list as strings", () => {
    const document = parseVersionsDocument(source);

    assert.deepEqual(readList(document, "node"), ["22.23.2", "24.21.0"]);
  });
});

describe("writeList", () => {
  it("replaces a version in place", () => {
    const document = parseVersionsDocument(source);

    writeList(document, "node", ["22.23.2", "24.22.0"]);

    assert.match(document.toString(), /- 24\.22\.0/);
    assert.doesNotMatch(document.toString(), /- 24\.21\.0/);
  });

  it("appends a version the list does not hold yet", () => {
    const document = parseVersionsDocument(source);

    writeList(document, "pnpm", ["11.27.1", "12.5.1", "12.6.0"]);

    assert.deepEqual(readList(document, "pnpm"), ["11.27.1", "12.5.1", "12.6.0"]);
  });

  it("keeps comments and the lists it does not touch", () => {
    const document = parseVersionsDocument(source);

    writeList(document, "node", ["22.23.2", "24.22.0", "26.10.0"]);

    const result = document.toString();

    assert.match(result, /# The versions this project builds\./);
    assert.match(result, /# The oldest release we still publish\./);
    assert.match(result, /variant:\n {2}- alpine/);
  });

  it("writes versions as text, never as numbers", () => {
    const document = parseVersionsDocument(source);

    writeList(document, "variant", ["alpine", "12.0"]);

    assert.deepEqual(readList(document, "variant"), ["alpine", "12.0"]);
  });
});
