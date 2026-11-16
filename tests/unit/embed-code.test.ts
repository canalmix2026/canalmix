import assert from "node:assert/strict";
import test from "node:test";
import { extractEmbedIframeSrc } from "@/lib/embed-code";

test("keeps only the src from provider iframe code, including custom permissions", () => {
  const source =
    '<iframe src="https://player.example.test/embed" sandbox="allow-scripts allow-popups allow-top-navigation" allow="autoplay; popups" allowfullscreen></iframe>';

  assert.equal(
    extractEmbedIframeSrc(source),
    "https://player.example.test/embed",
  );
});
