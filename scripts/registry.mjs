import { Buffer } from "node:buffer";

function imageName() {
  return (process.env.IMAGE_NAME ?? "pnpm-node").toLowerCase();
}

/**
 * The registries this project publishes to.
 *
 * A registry is a target only when its repository is known, so a run without
 * DOCKERHUB_USERNAME publishes to GHCR only.
 */

const registries = [
  {
    key: "ghcr",
    label: "GHCR",
    host: "ghcr.io",
    api: "https://ghcr.io",
    tokenUrl: "https://ghcr.io/token",
    tokenService: "ghcr.io",

    repository() {
      const owner = process.env.GITHUB_REPOSITORY_OWNER;

      if (!owner) {
        return undefined;
      }

      return `${owner.toLowerCase()}/${imageName()}`;
    },

    credentials() {
      const token = process.env.GITHUB_TOKEN;

      if (!token) {
        return undefined;
      }

      return {
        username: process.env.GITHUB_ACTOR ?? "x-access-token",
        password: token,
      };
    },
  },
  {
    key: "dockerhub",
    label: "Docker Hub",
    host: "docker.io",
    api: "https://registry-1.docker.io",
    tokenUrl: "https://auth.docker.io/token",
    tokenService: "registry.docker.io",

    repository() {
      const username = process.env.DOCKERHUB_USERNAME;

      if (!username) {
        return undefined;
      }

      return `${username.toLowerCase()}/${imageName()}`;
    },

    credentials() {
      const username = process.env.DOCKERHUB_USERNAME;
      const password = process.env.DOCKERHUB_TOKEN;

      if (!username || !password) {
        return undefined;
      }

      return { username, password };
    },
  },
];

export function forceRebuild() {
  return process.env.FORCE_REBUILD === "true";
}

async function fetchPullToken(registry, repository) {
  const url = new URL(registry.tokenUrl);

  url.searchParams.set("service", registry.tokenService);
  url.searchParams.set("scope", `repository:${repository}:pull`);

  const headers = {};
  const credentials = registry.credentials();

  if (credentials) {
    const basic = Buffer.from(
      `${credentials.username}:${credentials.password}`,
    ).toString("base64");

    headers.authorization = `Basic ${basic}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Could not get a pull token for ${registry.host}/${repository}: ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();

  return body.token;
}

function nextPageUrl(registry, header) {
  if (!header) {
    return undefined;
  }

  const match = /<([^>]+)>\s*;\s*rel="?next"?/i.exec(header);

  if (!match) {
    return undefined;
  }

  return new URL(match[1], registry.api).toString();
}

/**
 * Every tag that already exists in one registry.
 *
 * A repository that has never been published answers 404 on GHCR and 401 on
 * Docker Hub, which means no tags exist yet rather than an error.
 */
async function fetchPublishedTags(registry, repository) {
  const token = await fetchPullToken(registry, repository);
  const tags = new Set();

  let url = `${registry.api}/v2/${repository}/tags/list?n=1000`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404 || response.status === 401) {
      console.error(
        `${registry.host}/${repository} has no tags yet (${response.status})`,
      );

      return tags;
    }

    if (!response.ok) {
      throw new Error(
        `Could not list tags for ${registry.host}/${repository}: ${response.status} ${response.statusText}`,
      );
    }

    const body = await response.json();

    for (const tag of body.tags ?? []) {
      tags.add(tag);
    }

    url = nextPageUrl(registry, response.headers.get("link"));
  }

  return tags;
}

/**
 * Every registry to publish to, with the tags it already holds.
 *
 * Each registry is checked on its own, so a tag that exists in one registry and
 * not in the other is still built for the registry that is missing it.
 */
export async function loadPublishTargets() {
  const rebuild = forceRebuild();

  if (rebuild) {
    console.error("FORCE_REBUILD is set, so every image is rebuilt");
  }

  const targets = [];

  for (const registry of registries) {
    const repository = registry.repository();

    if (!repository) {
      continue;
    }

    targets.push({
      key: registry.key,
      label: registry.label,
      image: `${registry.host}/${repository}`,
      published: rebuild
        ? new Set()
        : await fetchPublishedTags(registry, repository),
    });
  }

  if (targets.length === 0) {
    throw new Error(
      "No registry is configured: set GITHUB_REPOSITORY_OWNER, DOCKERHUB_USERNAME, or both",
    );
  }

  console.error(
    `Registries: ${targets.map((target) => target.image).join(", ")}`,
  );

  for (const registry of registries) {
    if (!targets.some((target) => target.key === registry.key)) {
      console.error(
        `${registry.label} is not configured, so nothing is published there`,
      );
    }
  }

  return targets;
}
