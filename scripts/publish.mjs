import { spawnSync } from "node:child_process";
import { loadPublishTargets } from "./registry.mjs";
import {
  latestInMajor,
  latestInMinor,
  loadVersions,
  majorVersion,
  pinnedTag,
} from "./versions.mjs";

const pnpmVersion = process.env.PNPM_VERSION;
const variant = process.env.VARIANT;

const githubRepository = process.env.GITHUB_REPOSITORY;

if (!pnpmVersion) {
  throw new Error("PNPM_VERSION is required");
}

if (!variant) {
  throw new Error("VARIANT is required");
}

const versions = loadVersions();
const targets = await loadPublishTargets();

const pnpmMajor = majorVersion(pnpmVersion);
const pnpmMinor = pnpmVersion.split(".").slice(0, 2).join(".");

const latestMinorVersion = latestInMinor(pnpmVersion, versions.pnpm);
const latestMajorVersion = latestInMajor(pnpmVersion, versions.pnpm);

for (const nodeVersion of versions.node) {
  const nodeMajor = majorVersion(nodeVersion);

  // Node.js is tagged by major only. The exact Node.js version still decides
  // what is built, so a Node.js patch release needs a forced rebuild to move
  // these tags.
  const tags = [
    // Node major + exact pnpm, for example 26-12.5.1-alpine
    pinnedTag(nodeVersion, pnpmVersion, variant),
  ];

  // Example: 26-12.5-alpine
  if (pnpmVersion === latestMinorVersion) {
    tags.push(`${nodeMajor}-${pnpmMinor}-${variant}`);
  }

  // Example: 26-12-alpine
  if (pnpmVersion === latestMajorVersion) {
    tags.push(`${nodeMajor}-${pnpmMajor}-${variant}`);
  }

  // Each registry is decided on its own, so a tag that is missing from one
  // registry is published there even when the other registry already has it.
  const missing = targets.filter((target) => !target.published.has(tags[0]));
  const skipped = targets.filter((target) => target.published.has(tags[0]));

  for (const target of skipped) {
    console.info();
    console.info(
      `Skipping ${target.image}:${tags[0]}, it is already published`,
    );
  }

  if (missing.length === 0) {
    continue;
  }

  const tagArguments = missing.flatMap((target) =>
    tags.flatMap((tag) => ["--tag", `${target.image}:${tag}`]),
  );

  console.info();
  console.info(`Node:    ${nodeVersion}`);
  console.info(`pnpm:    ${pnpmVersion}`);
  console.info(`Variant: ${variant}`);
  console.info("Tags:");

  for (const target of missing) {
    for (const tag of tags) {
      console.info(`  ${target.image}:${tag}`);
    }
  }

  const args = [
    "buildx",
    "build",

    "--pull",

    "--platform",
    "linux/amd64,linux/arm64",

    "--build-arg",
    `NODE_VERSION=${nodeVersion}`,

    "--build-arg",
    `PNPM_VERSION=${pnpmVersion}`,

    "--build-arg",
    `VARIANT=${variant}`,

    "--label",
    `org.opencontainers.image.source=https://github.com/${githubRepository}`,

    "--label",
    "org.opencontainers.image.description=Node.js + pnpm Docker images",

    ...tagArguments,

    "--push",
    ".",
  ];

  const result = spawnSync("docker", args, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
