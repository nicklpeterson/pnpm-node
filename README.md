<h1 align="center">pnpm-node</h1>

<div align="center">

Up-to-date Docker images with **Node.js + pnpm preinstalled**.

<a href=https://hub.docker.com/repository/docker/nicklpeterson/pnpm-node/tags/26-12-alpine><img alt="Docker Image Version (tag)" src="https://img.shields.io/docker/v/nicklpeterson/pnpm-node/26-12-alpine?style=for-the-badge&label=Docker%20Hub&logo=docker&color=1D63Ed"></a> <a href=https://ghcr.io/nicklpeterson/pnpm-node:26-12-alpine><img alt="Docker Image Version (tag)" src="https://img.shields.io/docker/v/nicklpeterson/pnpm-node/26-12-alpine?style=for-the-badge&label=GitHub%20Container%20Registry&logo=github&color=08872B"></a>


<a href=https://hub.docker.com/repository/docker/nicklpeterson/pnpm-node/tags/26-12-bookworm><img alt="Docker Image Version" src="https://img.shields.io/docker/v/nicklpeterson/pnpm-node/26-12-bookworm?style=for-the-badge&label=Docker%20Hub&logo=docker&color=1D63Ed"></a> <a href=https://ghcr.io/nicklpeterson/pnpm-node:26-12-bookworm><img alt="Docker Image Version" src="https://img.shields.io/docker/v/nicklpeterson/pnpm-node/26-12-bookworm?style=for-the-badge&label=GitHub%20Container%20Registry&logo=github&color=08872B"></a>

</div>

The official Node.js Docker images don't include pnpm, and pnpm doesn't currently provide a complete set of Docker images containing both Node.js and pnpm. 

`pnpm-node` has you covered:

* Node LTS 22, 24, 26 
* pnpm 11+
* Alpine and Debian Bookworm variants
* `linux/amd64` and `linux/arm64`
* Exact and floating version tags

## Latest Versions

```bash
# Docker Hub
docker pull nicklpeterson/pnpm-node:26-12-alpine
docker pull nicklpeterson/pnpm-node:26-12-bookworm


# Github Container Repository
docker pull ghcr.io/nicklpeterson/pnpm-node:26-12-alpine
docker pull ghcr.io/nicklpeterson/pnpm-node:26-12-bookworm
```

## Quick start

```dockerfile
FROM nicklpeterson/pnpm-node:26-12-alpine 

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "start"]
```

## Version Tags

You can specify major, minor or a full patch version of pnpm. 

```bash
26-12-alpine       # Node 26 + pnpm latest v12 + Alpine
24-11-alpine       # Node 24 + pnpm latest v11 + Alpine

24-11.5-alpine     # Node 24 + pnpm latest v11.5 + Alpine
22-12.2-bookworm   # Node 22 + pnpm latest v12.2 + Bookworm

26-11.27.0-alpine  # Node 26 + pnpm v11.27.0 + Alpine
26-12.5.1-bookworm # Node 26 + pnpm v12.5.1 + Bookworm
```

## What's in the image?

```dockerfile
ARG NODE_VERSION
ARG PNPM_VERSION
ARG VARIANT

FROM node:${NODE_VERSION}-${VARIANT}

RUN npm install -g --allow-scripts=pnpm "pnpm@${PNPM_VERSION}"
```

## Supported architectures

Images are published as multi-platform images for:

```text
linux/amd64
linux/arm64
```

Docker will automatically select the appropriate architecture when pulling an image.

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

### Automatic updates

A scheduled workflow looks for new releases every morning at 07:00 Central Standard Time:

* A new Node.js patch or minor release replaces the entry for that major, and the workflow rebuilds the images of that major.
* A new Node.js major joins the list once Node.js marks it LTS.
* A new pnpm release joins the end of the pnpm list.

The workflow opens a pull request with the change, merges it, and starts the builds the change needs.

## Contributing

Issues and pull requests are welcome.

If a Node.js or pnpm release is missing, feel free to open an issue or submit an update to `versions.yml`.
