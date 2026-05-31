import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("A picks a square and marks it by scanning B's payload", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");

    await a.locator(".bg-cell").nth(0).click(); // select first prompt

    await b.locator(".mesh-qrx-payload summary").click();
    const payload = (await b.locator(".mesh-qrx-payload code").textContent()) ?? "";
    await a.getByPlaceholder("or paste a payload (URL or mesh://)").fill(payload);
    await a.getByRole("button", { name: "use", exact: true }).click();

    await expect(a.locator(".bg-cell").nth(0)).toContainText("bob");
  } finally {
    await cleanup();
  }
});

// Cross-peer (load-bearing): the previous test reads the mark on the SAME peer
// that performed it, so it would pass even if the mark never left local state.
// This drives the mark on A and reads alice's progress on B's ROOM SCOREBOARD —
// proving boards.setMy() actually propagates through the shared Yjs map to the
// OTHER peer. Alice's score is 2/25 (one scanned square + the free center).
test("a square A marks shows up on B's room scoreboard (mesh sync)", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");

    // A selects a square, then scans B's payload to mark it.
    await a.locator(".bg-cell").nth(0).click();
    await b.locator(".mesh-qrx-payload summary").click();
    const bPayload = (await b.locator(".mesh-qrx-payload code").textContent()) ?? "";
    await a.getByPlaceholder("or paste a payload (URL or mesh://)").fill(bPayload);
    await a.getByRole("button", { name: "use", exact: true }).click();

    // B's scoreboard must surface alice with 2/25 — the mark crossed the mesh.
    const aliceRow = b.locator(".bg-scoreboard .mesh-leaderboard-row", { hasText: "alice" });
    await expect(aliceRow).toContainText("2/25");
  } finally {
    await cleanup();
  }
});
