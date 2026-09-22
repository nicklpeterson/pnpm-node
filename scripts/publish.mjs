import { spawnSync } from "node:child_process";
import {
  latestInMajor,
  latestInMinor,
  loadVersions,
} from "./versions.mjs";

const pnpmVersion = process.env.PNPM_VERSION;
const variant = process.env.VARIANT;

const githubOwner = process.env.GITHUB_REPOSITORY_OWNER;
const githubRepository = process.env.GITHUB_REPOSITORY;

const imageName = process.env.IMAGE_NAME ?? "pnpm-node";

if (!pnpmVersion) {
  throw new Error("PNPM_VERSION is required");
}

if (!variant) {
  throw new Error("VARIANT is required");
}

if (!githubOwner) {
  throw new Error("GITHUB_REPOSITORY_OWNER is required");
}

const versions = loadVersions();

const pnpmMajor = pnpmVersion.split(".")[0];
const pnpmMinor = pnpmVersion.split(".").slice(0, 2).join(".");

const latestMinorVersion = latestInMinor(pnpmVersion, versions.pnpm);
const latestMajorVersion = latestInMajor(pnpmVersion, versions.pnpm);

const ghcrImage = `ghcr.io/${githubOwner.toLowerCase()}/${imageName}`;

for (const nodeVersion of versions.node) {
  const nodeMajor = nodeVersion.split(".")[0];

  const tags = [
    // Fully pinned
    `${nodeVersion}-${pnpmVersion}-${variant}`,

    // Node major + exact pnpm
    `${nodeMajor}-${pnpmVersion}-${variant}`,
  ];

  // Example: 26-12.5-alpine
  if (pnpmVersion === latestMinorVersion) {
    tags.push(`${nodeMajor}-${pnpmMinor}-${variant}`);
  }

  // Example: 26-12-alpine
  if (pnpmVersion === latestMajorVersion) {
    tags.push(`${nodeMajor}-${pnpmMajor}-${variant}`);
  }

  const tagArguments = tags.flatMap((tag) => [
    "--tag",
    `${ghcrImage}:${tag}`,
  ]);

  console.info();
  console.info(`Node:    ${nodeVersion}`);
  console.info(`pnpm:    ${pnpmVersion}`);
  console.info(`Variant: ${variant}`);
  console.info("Tags:");

  for (const tag of tags) {
    console.info(`  ${ghcrImage}:${tag}`);
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