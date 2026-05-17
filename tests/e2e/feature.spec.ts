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
