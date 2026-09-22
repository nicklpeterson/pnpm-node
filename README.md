# pnpm-node

Up-to-date Docker images with **Node.js + pnpm preinstalled**.

`pnpm-node` provides a predictable set of images covering supported Node.js releases and pnpm 11+, with Alpine and Debian Bookworm variants.

## Why?

The official Node.js Docker images don't include pnpm, and pnpm doesn't currently provide a complete set of Docker images containing both Node.js and pnpm.

`pnpm-node` fills that gap with:

* Multiple supported Node.js versions
* pnpm 11+
* Every published pnpm version tracked by this project
* Alpine and Debian Bookworm variants
* `linux/amd64` and `linux/arm64`
* Exact and floating version tags

## Quick start

```dockerfile
FROM nicklpeterson/pnpm-node:26-12-alpine 

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "start"]
```

Or pull an image directly:


```bash
# Docker Hub
docker pull nicklpeterson/pnpm-node:26-12-alpine

# Github Container Repository
docker pull ghcr.io/nicklpeterson/pnpm-node:26-12-alpine
```

## Available variants

### Alpine

Small images based on the official Node.js Alpine images.

```text
26-12-alpine
24-12-alpine
22-11-alpine
```

### Bookworm

Images based on the official Node.js Debian Bookworm images.

```text
26-12-bookworm
24-12-bookworm
22-11-bookworm
```

## Version tags

Images are tagged at several levels of specificity.

For example, an image containing:

* Node.js `26.9.0`
* pnpm `12.5.1`
* Alpine

may be available as:

```text
26-12-alpine
26-12.5-alpine
26-12.5.1-alpine
26.9.0-12.5.1-alpine
```

### Major versions

```text
26-12-alpine
```

Uses the latest Node.js 26 release and latest pnpm 12 release tracked by this project.

This is the simplest option if you want updates within both major release lines.

```dockerfile
FROM ghcr.io/<owner>/pnpm-node:26-12-alpine
```

### pnpm minor version

```text
26-12.5-alpine
```

Uses the latest Node.js 26 release and latest pnpm `12.5.x` release.

Use this when you want pnpm patch updates without automatically moving to a new pnpm minor release.

```dockerfile
FROM ghcr.io/<owner>/pnpm-node:26-12.5-alpine
```

### Exact pnpm version

```text
26-12.5.1-alpine
```

Uses the latest Node.js 26 release tracked by the project with exactly pnpm `12.5.1`.

```dockerfile
FROM ghcr.io/<owner>/pnpm-node:26-12.5.1-alpine
```

### Exact Node.js and pnpm versions

```text
26.9.0-12.5.1-alpine
```

Pins both Node.js and pnpm.

Use this form when reproducibility is most important.

```dockerfile
FROM ghcr.io/<owner>/pnpm-node:26.9.0-12.5.1-alpine
```

The same tagging scheme is available for Bookworm:

```text
26-12-bookworm
26-12.5-bookworm
26-12.5.1-bookworm
26.9.0-12.5.1-bookworm
```

## Tag format

```text
<node>-<pnpm>-<variant>
```

Examples:

```text
22-11-alpine
24-12-bookworm
26-12.5-alpine
26-12.5.1-bookworm
26.9.0-12.5.1-alpine
```

## Supported architectures

Images are published as multi-platform images for:

```text
linux/amd64
linux/arm64
```

Docker will automatically select the appropriate architecture when pulling an image.

## What's in the image?

The images intentionally stay close to the official Node.js Docker images.

```dockerfile
ARG NODE_VERSION
ARG PNPM_VERSION
ARG VARIANT

FROM node:${NODE_VERSION}-${VARIANT}

RUN npm install -g --allow-scripts=pnpm "pnpm@${PNPM_VERSION}"
```

The underlying Node.js environment, entrypoint, and default command are inherited from the official Node.js image.

## Version matrix

The versions built by this project are defined in [`versions.yml`](./versions.yml).

For example:

```yaml
node:
  - 22.23.2
  - 24.21.0
  - 26.9.0

pnpm:
  - 11.0.0
  # ...
  - 11.27.1
  - 12.0.0
  # ...
  - 12.5.1

variant:
  - alpine
  - bookworm
```

The build system creates every configured:

```text
Node.js × pnpm × variant
```

combination.

Node.js versions in `versions.yml` represent the current release tracked for each supported Node.js major.

pnpm versions are retained so projects can use older pnpm releases when necessary.

## Updating versions

To add or update supported versions, edit:

```text
versions.yml
```

The GitHub Actions workflow generates the build matrix from that file and publishes the appropriate images and aliases.

### Existing images are not rebuilt

Before the workflow builds anything, it lists the tags that already exist in each registry. If the fully pinned tag for a combination is present, the workflow skips that build. A push that adds one pnpm version therefore builds only the new images.

Each registry is checked on its own. If a tag exists on GitHub Container Registry but not on Docker Hub, the workflow builds it and pushes it to Docker Hub only, and the other way round.

The check uses the fully pinned tag, for example `26.9.0-12.5.1-alpine`, because that tag names the exact build inputs. Floating tags such as `26-12-alpine` still move, because the build that owns them is a new build.

### Forcing a rebuild

The official `node:` base images receive security updates under the same tag. To pick those up, run the `Publish` workflow manually and set `force_rebuild` to `true`. The workflow then rebuilds and republishes every combination.

## Container registries

The same images and tags are published to GitHub Container Registry and to Docker Hub:

```text
ghcr.io/nicklpeterson/pnpm-node
docker.io/nicklpeterson/pnpm-node
```

For example:

```bash
docker pull ghcr.io/nicklpeterson/pnpm-node:26-12-bookworm
docker pull nicklpeterson/pnpm-node:26-12-bookworm
```

The workflow needs two repository secrets for the Docker Hub push: `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`. The token is a Docker Hub personal access token with read and write access.

## Contributing

Issues and pull requests are welcome.

If a Node.js or pnpm release is missing, feel free to open an issue or submit an update to `versions.yml`.
