import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
const source = await build({
  entryPoints: ["src/dev/board36Proposal.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const {
  proposedDistricts: groups,
  proposedOrder: order,
  proposedRemoved: removed,
} = await import(
  `data:text/javascript;base64,${Buffer.from(source.outputFiles[0].text).toString("base64")}`
);
const old = JSON.parse(await readFile("src/data/board.json", "utf8"));
const board = order.map((id) => old[id]);
test("approval proposal retains exactly 36 unique spaces, four corners and four Transit locations", () => {
  assert.equal(board.length, 36);
  assert.equal(new Set(order).size, 36);
  assert.deepEqual(
    board
      .map((b, i) =>
        ["start", "airport", "go_to_jail", "jail"].includes(b.kind) ? i : null,
      )
      .filter((i) => i !== null),
    [0, 9, 18, 27],
  );
  assert.equal(board.filter((b) => b.kind === "station").length, 4);
  assert.deepEqual(
    old.filter((b) => !order.includes(b.index)).map((b) => b.index),
    removed,
  );
});
test("approval proposal has six adjacent triples and two premium pairs on the final side", () => {
  assert.equal(groups.length, 8);
  assert.equal(new Set(groups.map((g) => g.color)).size, 8);
  assert.equal(groups.filter((g) => g.count === 3).length, 6);
  assert.equal(groups.filter((g) => g.count === 2).length, 2);
  assert.equal(board.filter((b) => b.kind === "property").length, 22);
  for (const g of groups) {
    const indices = board.flatMap((b, i) => (b.category === g.id ? [i] : []));
    assert.equal(indices.length, g.count);
    assert.equal(indices.at(-1) - indices[0], g.count - 1);
    assert.equal(Math.floor(indices.at(-1) / 9), Math.floor(indices[0] / 9));
    if (g.count === 2) assert.ok(indices.every((i) => i > 27));
  }
  for (let i = 1; i < groups.length; i++) {
    assert.ok(groups[i].price > groups[i - 1].price);
    assert.ok(groups[i].upgrade > groups[i - 1].upgrade);
    assert.ok(groups[i].ceiling > groups[i - 1].ceiling);
  }
});
