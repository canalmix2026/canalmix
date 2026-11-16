import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_RECENT_CHANNELS,
  normalizeLocalChannelLibrary,
  recordLocalChannelVisit,
  toggleLocalChannelFavorite,
} from "../../src/lib/local-channel-library";

test("normaliza favoritos e remove IDs duplicados do histórico", () => {
  assert.deepEqual(
    normalizeLocalChannelLibrary({
      favorites: ["channel-a", "channel-a", 42],
      history: ["channel-b", "channel-b", "channel-a"],
    }),
    { favorites: ["channel-a"], history: ["channel-b", "channel-a"] },
  );
});

test("reabrir um canal move o ID para o início e limita o histórico a 30", () => {
  const history = Array.from({ length: MAX_RECENT_CHANNELS }, (_, index) => `channel-${index}`);
  const reopened = recordLocalChannelVisit({ favorites: [], history }, "channel-20");
  assert.equal(reopened.history[0], "channel-20");
  assert.equal(reopened.history.length, MAX_RECENT_CHANNELS);
  assert.equal(reopened.history.filter((id) => id === "channel-20").length, 1);

  const newVisit = recordLocalChannelVisit(reopened, "channel-new");
  assert.equal(newVisit.history[0], "channel-new");
  assert.equal(newVisit.history.length, MAX_RECENT_CHANNELS);
  assert.equal(newVisit.history.includes("channel-29"), false);
});

test("favorito alterna entre adicionar e remover pelo ID", () => {
  const empty = { favorites: [] as string[], history: [] as string[] };
  const added = toggleLocalChannelFavorite(empty, "channel-a");
  assert.deepEqual(added.favorites, ["channel-a"]);
  assert.deepEqual(toggleLocalChannelFavorite(added, "channel-a").favorites, []);
});
