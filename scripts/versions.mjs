import fs from "node:fs";
import YAML from "yaml";

export function loadVersions() {
  const contents = fs.readFileSync("versions.yml", "utf8");
  const config = YAML.parse(contents);

  return {
    node: config.node.map(String),
    pnpm: config.pnpm.map(String),
    variant: config.variant.map(String),
  };
}

export function compareVersions(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);

    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

export function latestInMinor(version, versions) {
  const [major, minor] = version.split(".");
  const prefix = `${major}.${minor}.`;

  return versions
    .filter((candidate) => candidate.startsWith(prefix))
    .sort(compareVersions)
    .at(-1);
}

export function latestInMajor(version, versions) {
  const [major] = version.split(".");
  const prefix = `${major}.`;

  return versions
    .filter((candidate) => candidate.startsWith(prefix))
    .sort(compareVersions)
    .at(-1);
}

/**
 * The tag that pins Node.js, pnpm, and the variant exactly.
 *
 * This tag maps one to one onto the build inputs, so its presence in the
 * registry means the image was already built.
 */
export function pinnedTag(nodeVersion, pnpmVersion, variant) {
  return `${nodeVersion}-${pnpmVersion}-${variant}`;
}
