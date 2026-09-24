import fs from "node:fs";

import {
  describeUpdate,
  planPublish,
  selectNodeUpdates,
  selectPnpmUpdates,
} from "./updates.mjs";
import {
  loadVersionsDocument,
  readList,
  saveVersionsDocument,
  writeList,
} from "./versions-document.mjs";

/**
 * Bring versions.yml up to date with the newest Node.js and pnpm releases.
 *
 * The script writes the file and reports what changed. Opening the pull request
 * and starting the builds is the job of .github/workflows/update-versions.yml,
 * which reads the outputs this script writes.
 *
 * Environment:
 *   DRY_RUN=true     Report the update, do not write versions.yml.
 *   SUMMARY_FILE     Write the pull request body to this path.
 *   GITHUB_OUTPUT    Write the step outputs to this path. GitHub sets it.
 */

const NODE_INDEX_URL = "https://nodejs.org/dist/index.json";
const PNPM_PACKAGE_URL = "https://registry.npmjs.org/pnpm";

async function fetchJson(url, accept = "application/json") {
  const response = await fetch(url, { headers: { accept } });

  if (!response.ok) {
    throw new Error(
      `Could not read ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

function fetchNodeReleases() {
  return fetchJson(NODE_INDEX_URL);
}

async function fetchPnpmReleases() {
  // The abbreviated document holds the version list without the file details of
  // every release, which keeps the download small.
  const body = await fetchJson(
    PNPM_PACKAGE_URL,
    "application/vnd.npm.install-v1+json",
  );

  return Object.keys(body.versions ?? {});
}

function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;

  if (!file) {
    return;
  }

  fs.appendFileSync(file, `${name}=${value}\n`);
}

function report(node, pnpm, plan) {
  for (const bump of node.bumped) {
    console.info(`Node.js ${bump.major}: ${bump.from} to ${bump.to}`);
  }

  for (const version of node.added) {
    console.info(`Node.js ${version}: new LTS major`);
  }

  for (const version of pnpm.added) {
    console.info(`pnpm ${version}: new release`);
  }

  if (!plan.changed) {
    console.info("Everything is up to date");

    return;
  }

  if (plan.rebuildMajors.length > 0) {
    console.info(
      `Forced rebuild for Node.js ${plan.rebuildMajors.join(", ")}`,
    );
  }

  if (plan.build) {
    const majors =
      plan.buildMajors.length > 0 ? plan.buildMajors.join(", ") : "every major";

    console.info(`Build for Node.js ${majors}`);
  }
}

const document = loadVersionsDocument();

const node = selectNodeUpdates(readList(document, "node"), await fetchNodeReleases());
const pnpm = selectPnpmUpdates(readList(document, "pnpm"), await fetchPnpmReleases());

const plan = planPublish(node, pnpm);
const { title, body } = describeUpdate(node, pnpm);

report(node, pnpm, plan);

if (plan.changed && process.env.DRY_RUN !== "true") {
  writeList(document, "node", node.versions);
  writeList(document, "pnpm", pnpm.versions);

  saveVersionsDocument(document);
}

if (plan.changed && process.env.SUMMARY_FILE) {
  fs.writeFileSync(process.env.SUMMARY_FILE, body);
}

setOutput("changed", String(plan.changed));
setOutput("title", title);
setOutput("rebuild_majors", plan.rebuildMajors.join(","));
setOutput("build", String(plan.build));
setOutput("build_majors", plan.buildMajors.join(","));
