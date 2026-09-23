ARG NODE_VERSION
ARG VARIANT

FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-${VARIANT}

# Arguments declared before FROM reach the FROM line only, so the build stage
# needs its own declaration.
ARG PNPM_VERSION

RUN npm install -g --allow-scripts=pnpm "pnpm@${PNPM_VERSION}" \
    && [ "$(pnpm --version)" = "${PNPM_VERSION}" ]
