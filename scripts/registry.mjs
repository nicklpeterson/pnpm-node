import { Buffer } from "node:buffer";

const registry = "https://ghcr.io";

export function forceRebuild() {
  return process.env.FORCE_REBUILD === "true";
}

export function repositoryPath() {
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const imageName = process.env.IMAGE_NAME ?? "pnpm-node";

  if (!owner) {
    return undefined;
  }

  return `${owner.toLowerCase()}/${imageName.toLowerCase()}`;
}

async function fetchPullToken(repository) {
  const url = new URL(`${registry}/token`);

  url.searchParams.set("service", "ghcr.io");
  url.searchParams.set("scope", `repository:${repository}:pull`);

  const headers = {};
  const token = process.env.GITHUB_TOKEN;

  if (token) {
    const actor = process.env.GITHUB_ACTOR ?? "x-access-token";
    const basic = Buffer.from(`${actor}:${token}`).toString("base64");

    headers.authorization = `Basic ${basic}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Could not get a pull token for ${repository}: ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();

  return body.token;
}

function nextPageUrl(header) {
  if (!header) {
    return undefined;
  }

  const match = /<([^>]+)>\s*;\s*rel="?next"?/i.exec(header);

  if (!match) {
    return undefined;
  }

  return new URL(match[1], registry).toString();
}

/**
 * Every tag that already exists in the registry.
 *
 * A repository that has never been published returns 404, which means no tags
 * exist yet rather than an error.
 */
export async function fetchPublishedTags() {
  const repository = repositoryPath();

  if (!repository) {
    console.error(
      "GITHUB_REPOSITORY_OWNER is not set, so no published tags are known",
    );

    return new Set();
  }

  const token = await fetchPullToken(repository);
  const tags = new Set();

  let url = `${registry}/v2/${repository}/tags/list?n=1000`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return tags;
    }

    if (!response.ok) {
      throw new Error(
        `Could not list tags for ${repository}: ${response.status} ${response.statusText}`,
      );
    }

    const body = await response.json();

    for (const tag of body.tags ?? []) {
      tags.add(tag);
    }

    url = nextPageUrl(response.headers.get("link"));
  }

  return tags;
}

/**
 * The tags that already exist, or an empty set when a rebuild is forced.
 */
export async function loadPublishedTags() {
  if (forceRebuild()) {
    console.error("FORCE_REBUILD is set, so every image is rebuilt");

    return new Set();
  }

  return await fetchPublishedTags();
}
