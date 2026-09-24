import fs from "node:fs";
import YAML from "yaml";

/**
 * The Node.js majors a run is limited to, from NODE_MAJORS.
 *
 * An empty list means every major in versions.yml. The update job sets this so
 * a forced rebuild moves the images of one major only, instead of every image
 * the project publishes.
 */
function selectedMajors() {
  return (process.env.NODE_MAJORS ?? "")
    .split(",")
    .map((major) => major.trim())
    .filter(Boolean);
}

function selectNodeVersions(versions) {
  const majors = selectedMajors();

  if (majors.length === 0) {
    return versions;
  }

  const selected = versions.filter((version) =>
    majors.includes(majorVersion(version)),
  );

  const missing = majors.filter(
    (major) => !versions.some((version) => majorVersion(version) === major),
  );

  if (missing.length > 0) {
    throw new Error(
      `NODE_MAJORS names ${missing.join(", ")}, which versions.yml does not hold`,
    );
  }

  console.error(`Node.js majors limited to ${majors.join(", ")}`);

  return selected;
}

export function loadVersions() {
  const contents = fs.readFileSync("versions.yml", "utf8");
  const config = YAML.parse(contents);

  return {
    node: selectNodeVersions(config.node.map(String)),
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

export function majorVersion(version) {
  return version.split(".")[0];
}

/**
 * The tag that names the Node.js major, the exact pnpm version, and the
 * variant.
 *
 * Images are tagged with the Node.js major only, so this is the most specific
 * tag a build produces. Its presence in the registry means the combination was
 * already built for the Node.js major, whatever Node.js patch release was
 * current at the time.
 */
export function pinnedTag(nodeVersion, pnpmVersion, variant) {
  return `${majorVersion(nodeVersion)}-${pnpmVersion}-${variant}`;
}
