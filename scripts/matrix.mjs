import { loadVersions } from "./versions.mjs";

const versions = loadVersions();

const include = versions.pnpm.flatMap((pnpm) =>
  versions.variant.map((variant) => ({
    pnpm,
    variant,
  })),
);

process.stdout.write(
  JSON.stringify({
    include,
  }),
);