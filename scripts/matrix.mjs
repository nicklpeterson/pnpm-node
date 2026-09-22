import { loadPublishTargets } from "./registry.mjs";
import { loadVersions, pinnedTag } from "./versions.mjs";

const versions = loadVersions();
const targets = await loadPublishTargets();

const pairs = versions.pnpm.flatMap((pnpm) =>
  versions.variant.map((variant) => ({
    pnpm,
    variant,
  })),
);

// A pair is built when at least one Node.js version is still missing from at
// least one registry. The publish script skips the Node.js versions and the
// registries that already have the image.
const include = pairs.filter(({ pnpm, variant }) =>
  versions.node.some((node) =>
    targets.some(
      (target) => !target.published.has(pinnedTag(node, pnpm, variant)),
    ),
  ),
);

const skipped = pairs.length - include.length;

console.error(`Matrix: ${include.length} to build, ${skipped} already published`);

process.stdout.write(
  JSON.stringify({
    include,
  }),
);
