ARG NODE_VERSION
ARG PNPM_VERSION
ARG VARIANT

FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-${VARIANT}

RUN npm install -g --allow-scripts=pnpm "pnpm@${PNPM_VERSION}"