import { test, expect } from "@playwright/test";

test("complete table flow, rules search, recovery, history and rematch", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Set up the table" }).click();
  await page
    .getByRole("textbox", { name: "Name for Player 1", exact: true })
    .fill("Ada");
  await page
    .getByRole("spinbutton", { name: "Ada: Civilian points", exact: true })
    .fill("20");
  await page
    .getByRole("spinbutton", { name: "Ada: Treasury coins", exact: true })
    .fill("8");
  await page
    .getByRole("spinbutton", { name: "Ada: compass", exact: true })
    .fill("1");
  await page
    .getByRole("spinbutton", { name: "Ada: tablet", exact: true })
    .fill("1");
  await page
    .getByRole("spinbutton", { name: "Ada: wildcards", exact: true })
    .fill("1");
  await expect(page.locator(".science-points").first()).toHaveText("10 points");
  await expect(page.locator(".total-row td").first()).toHaveText("32");
  await page.getByRole("button", { name: "Rules", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search the rules" })
    .fill("wildcard");
  await expect(
    page.getByRole("heading", { name: "Science", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("nosuchrulexyz");
  await expect(
    page.getByRole("heading", { name: "No matching rules" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Scoreboard", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Name for Ada" })).toHaveValue(
    "Ada",
  );
  await expect(page.locator(".total-row td").first()).toHaveText("32");
  await page.getByRole("button", { name: "Finish game" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".winning")).toContainText("Ada");
  await expect(page.locator(".result-total").first()).toContainText("32");
  await page.reload();
  await page.getByRole("button", { name: /History/ }).click();
  await expect(page.locator(".winning")).toContainText("Ada");
  await page.screenshot({
    path: "/tmp/seven-wonders-history.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Play again with this table" })
    .click();
  await expect(page.getByRole("textbox", { name: "Name for Ada" })).toHaveValue(
    "Ada",
  );
  await expect(page.locator(".total-row td").first()).toHaveText("0");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".score-table")).toBeVisible();
  expect(errors).toEqual([]);
});

test("seven players, numeric validation and narrow screen layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("button", { name: "Set up the table" }).click();
  await expect(page.locator(".player-heading")).toHaveCount(7);
  const coins = page.getByRole("spinbutton", {
    name: "Player 1: Treasury coins",
    exact: true,
  });
  await coins.fill("-4");
  await expect(coins).toHaveAttribute("aria-invalid", "true");
  await coins.blur();
  await expect(coins).toHaveValue("0");
  await page
    .getByRole("spinbutton", { name: "Player 1: Military points", exact: true })
    .fill("-6");
  await expect(page.locator(".total-row td").first()).toHaveText("-6");
  await page.screenshot({
    path: "/tmp/seven-wonders-scoreboard.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/seven-wonders-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Rules", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("keyboard access, focus containment and shared victory", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up the table" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".score-table")).toBeVisible();
  await page.getByRole("button", { name: "Finish game" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Finish game" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".winning")).toHaveCount(3);
});

test("unavailable browser saving displays a notice without blocking scoring", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(
    "Browser saving is unavailable",
  );
  await page.getByRole("button", { name: "Set up the table" }).click();
  await expect(page.locator(".player-heading")).toHaveCount(3);
});
