import { compareVersions, majorVersion } from "./versions.mjs";

/**
 * Choosing what versions.yml should hold next.
 *
 * Both functions are pure: they take the lists that versions.yml holds today
 * and the releases an upstream API reports, and they return the new list plus
 * what changed. Fetching and writing happen in scripts/update-versions.mjs.
 */

function isStable(version) {
  return !version.includes("-");
}

/**
 * The newest release of each Node.js major, keyed by major.
 *
 * The LTS flag is read from the newest release of a major, because a major
 * carries `lts: false` on the releases it made before it entered LTS.
 */
function newestNodeReleasePerMajor(releases) {
  const newest = new Map();

  for (const release of releases) {
    const version = release.version.replace(/^v/, "");

    if (!isStable(version)) {
      continue;
    }

    const major = majorVersion(version);
    const known = newest.get(major);

    if (!known || compareVersions(version, known.version) > 0) {
      newest.set(major, { version, lts: release.lts });
    }
  }

  return newest;
}

/**
 * The Node.js list versions.yml should hold, given the releases Node.js
 * publishes.
 *
 * A tracked major keeps its place in the list and is replaced by its newest
 * release, so the file holds one entry per major. A major above every tracked
 * one is appended only once Node.js marks it LTS. Lower majors are never added
 * back, which keeps an end-of-life major out of the list after you remove it.
 *
 * @returns {{
 *   versions: string[],
 *   bumped: {major: string, from: string, to: string}[],
 *   added: string[],
 * }}
 */
export function selectNodeUpdates(current, releases) {
  const newest = newestNodeReleasePerMajor(releases);
  const highest = Math.max(...current.map((version) => Number(majorVersion(version))));

  const bumped = [];

  const tracked = current.map((version) => {
    const candidate = newest.get(majorVersion(version));

    if (!candidate || compareVersions(candidate.version, version) <= 0) {
      return version;
    }

    bumped.push({
      major: majorVersion(version),
      from: version,
      to: candidate.version,
    });

    return candidate.version;
  });

  const added = [...newest.values()]
    .filter((candidate) => candidate.lts !== false)
    .filter((candidate) => Number(majorVersion(candidate.version)) > highest)
    .map((candidate) => candidate.version)
    .sort(compareVersions);

  return {
    versions: [...tracked, ...added],
    bumped,
    added,
  };
}

/**
 * The pnpm list versions.yml should hold, given the releases the npm registry
 * reports.
 *
 * Only releases newer than the newest tracked one are added. A gap lower in the
 * list is left alone on purpose: filling it would publish a large set of images
 * nobody asked for.
 *
 * @returns {{versions: string[], added: string[]}}
 */
export function selectPnpmUpdates(current, releases) {
  const newest = [...current].sort(compareVersions).at(-1);

  const added = releases
    .filter(isStable)
    .filter((version) => compareVersions(version, newest) > 0)
    .sort(compareVersions);

  return {
    versions: [...current, ...added],
    added,
  };
}

/**
 * The publish runs an update needs.
 *
 * A Node.js patch or minor release keeps every tag name, because a tag names
 * the Node.js major only, so the images of that major are rebuilt with
 * FORCE_REBUILD. A new pnpm version and a new Node.js major produce tags that
 * do not exist yet, so an ordinary run builds them.
 *
 * The two runs are split by Node.js major, which keeps them disjoint: no image
 * is built by both.
 *
 * @returns {{
 *   changed: boolean,
 *   rebuildMajors: string[],
 *   build: boolean,
 *   buildMajors: string[],
 * }}
 */
export function planPublish(node, pnpm) {
  const rebuildMajors = node.bumped.map((bump) => bump.major);
  const build = node.added.length > 0 || pnpm.added.length > 0;

  // An empty list of majors means every major, so the majors are named only
  // when a forced run already covers some of them.
  const buildMajors =
    build && rebuildMajors.length > 0
      ? node.versions
          .map(majorVersion)
          .filter((major) => !rebuildMajors.includes(major))
      : [];

  return {
    changed: rebuildMajors.length > 0 || build,
    rebuildMajors,
    build,
    buildMajors,
  };
}

/**
 * The pull request title and body for an update.
 *
 * @returns {{title: string, body: string}}
 */
export function describeUpdate(node, pnpm) {
  const segments = [];

  if (node.bumped.length > 0) {
    segments.push(
      `update Node.js ${node.bumped.map((bump) => bump.major).join(", ")}`,
    );
  }

  if (node.added.length > 0) {
    segments.push(`add Node.js ${node.added.map(majorVersion).join(", ")}`);
  }

  if (pnpm.added.length > 2) {
    segments.push(`add ${pnpm.added.length} pnpm versions`);
  } else if (pnpm.added.length > 0) {
    segments.push(`add pnpm ${pnpm.added.join(", ")}`);
  }

  const sections = ["The Update versions workflow made this change."];

  if (node.bumped.length > 0 || node.added.length > 0) {
    const lines = [
      ...node.bumped.map(
        (bump) => `- Node.js ${bump.major} moves from ${bump.from} to ${bump.to}`,
      ),
      ...node.added.map(
        (version) => `- Node.js ${majorVersion(version)} is new, at ${version}`,
      ),
    ];

    sections.push(`Node.js:\n\n${lines.join("\n")}`);
  }

  if (pnpm.added.length > 0) {
    sections.push(
      `pnpm:\n\n${pnpm.added.map((version) => `- ${version}`).join("\n")}`,
    );
  }

  return {
    title: `chore: ${segments.join(", ")}`,
    body: `${sections.join("\n\n")}\n`,
  };
}
