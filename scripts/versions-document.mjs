import fs from "node:fs";
import YAML from "yaml";

/**
 * Reading and editing versions.yml as a document.
 *
 * scripts/versions.mjs parses versions.yml for the build, where only the values
 * matter. The update job writes the file back, so it works on the document
 * instead: the comments, the blank lines, and the lists it does not touch stay
 * as they are.
 */

const VERSIONS_FILE = "versions.yml";

export function parseVersionsDocument(source) {
  return YAML.parseDocument(source);
}

export function loadVersionsDocument(file = VERSIONS_FILE) {
  return parseVersionsDocument(fs.readFileSync(file, "utf8"));
}

export function saveVersionsDocument(document, file = VERSIONS_FILE) {
  fs.writeFileSync(file, document.toString());
}

function sequence(document, key) {
  const node = document.get(key, true);

  if (!YAML.isSeq(node)) {
    throw new Error(`versions.yml has no ${key} list`);
  }

  return node;
}

export function readList(document, key) {
  return sequence(document, key).items.map((item) => String(item.value));
}

/**
 * Write a list back.
 *
 * Each value becomes a new node, because a version such as 12.0 must stay text
 * and only a new node is typed again. The comments that sit on the item at the
 * same position move to the new node.
 */
export function writeList(document, key, values) {
  const node = sequence(document, key);

  node.items = values.map((value, index) => {
    const item = document.createNode(value);
    const previous = node.items[index];

    if (previous) {
      item.comment = previous.comment;
      item.commentBefore = previous.commentBefore;
      item.spaceBefore = previous.spaceBefore;
    }

    return item;
  });
}
