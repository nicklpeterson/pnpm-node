import { loadPublishedTags } from "./registry.mjs";
import { loadVersions, pinnedTag } from "./versions.mjs";

const versions = loadVersions();
const published = await loadPublishedTags();

const pairs = versions.pnpm.flatMap((pnpm) =>
  versions.variant.map((variant) => ({
    pnpm,
    variant,
  })),
);

// A pair is built when at least one Node.js version is still missing. The
// publish script skips the Node.js versions that already exist.
const include = pairs.filter(({ pnpm, variant }) =>
  versions.node.some(
    (node) => !published.has(pinnedTag(node, pnpm, variant)),
  ),
);

const skipped = pairs.length - include.length;

console.error(`Matrix: ${include.length} to build, ${skipped} already published`);

process.stdout.write(
  JSON.stringify({
    include,
  }),
);
