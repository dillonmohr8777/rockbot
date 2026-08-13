import { expect, test } from "@playwright/test";

test.describe("Rockbot command center", () => {
  test("keeps the full desktop shell inside the viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop geometry assertion.");
    const runtimeResponse = page.waitForResponse((response) => response.url().endsWith("/api/runtime") && response.status() === 200);
    await page.goto("/");
    await runtimeResponse;

    await expect(page.getByRole("heading", { name: "What should the operating team move?" })).toBeVisible();
    await expect(page.getByTestId("composer-input")).toBeVisible();
    await expect(page.getByTestId("model-trigger")).toBeVisible();

    const geometry = await page.evaluate(() => {
      const footer = document.querySelector(".sidebar__footer")!.getBoundingClientRect();
      const composer = document.querySelector(".composer-zone")!.getBoundingClientRect();
      return {
        innerWidth,
        innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        footerBottom: footer.bottom,
        composerBottom: composer.bottom,
      };
    });
    expect(geometry.scrollWidth).toBe(geometry.innerWidth);
    expect(geometry.scrollHeight).toBe(geometry.innerHeight);
    expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.innerHeight + 1);
    expect(geometry.composerBottom).toBeLessThanOrEqual(geometry.innerHeight + 1);
  });

  test("switches to the deterministic model and completes an evidence-backed run", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop interaction path.");
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto("/");
    await page.getByTestId("model-trigger").click();
    const modelDialog = page.getByRole("dialog", { name: "Choose a model runtime" });
    const closeModelDialog = modelDialog.getByRole("button", { name: "Close model picker" });
    await expect(closeModelDialog).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(modelDialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(closeModelDialog).toBeFocused();
    await page.locator(".provider-option__button", { hasText: "Simulation" }).click();
    await closeModelDialog.click();
    await expect(page.getByTestId("model-trigger")).toBeFocused();
    await expect(page.getByTestId("model-trigger")).toContainText("Simulation");

    await page.getByTestId("composer-input").fill("Run the synthetic Protocol 54 canary and return its evidence.");
    await page.getByTestId("send-button").click();
    await expect(page.getByTestId("run-exchange")).toBeVisible();
    await expect(page.getByText("external action: none", { exact: false })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".receipt-outcome")).toContainText("complete");
    await expect(page.getByRole("status").filter({ has: page.locator(".receipt-outcome") })).toContainText("delivery: not attempted");
    await expect(page.getByRole("status").filter({ has: page.locator(".receipt-outcome") })).toContainText("redacted");
    await page.reload();
    await expect(page.getByTestId("model-trigger")).toContainText("Codex");
    expect(consoleErrors).toEqual([]);
  });

  test("keeps collapsed navigation reversible and reports approval-gated work as partial", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop interaction path.");
    await page.goto("/");

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    const expand = page.getByRole("button", { name: "Expand sidebar" });
    await expect(expand).toBeVisible();
    await expand.click();
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();

    await page.getByTestId("model-trigger").click();
    await page.locator(".provider-option__button", { hasText: "Simulation" }).click();
    await page.getByRole("button", { name: "Close model picker" }).click();
    await page.getByTestId("composer-input").fill("Draft and send a client update.");
    await page.getByTestId("send-button").click();

    const receipt = page.getByRole("status").filter({ has: page.locator(".receipt-outcome") });
    await expect(receipt).toContainText("partial", { timeout: 20_000 });
    await expect(receipt).toContainText("artifact: drafted");
    await expect(receipt).toContainText("delivery: not attempted");
    await expect(receipt).toContainText("Approval required.");
  });

  test("supports keyboard command focus and inspector settings", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop interaction path.");
    await page.goto("/");
    await page.getByRole("heading", { name: "What should the operating team move?" }).click();
    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("composer-input")).toBeFocused();

    await page.getByRole("button", { name: "Observe", exact: true }).click();
    const inspector = page.getByRole("dialog", { name: "System inspector" });
    await expect(inspector).toHaveAttribute("aria-hidden", "false");
    await expect(inspector.getByRole("button", { name: "Close inspector" })).toBeFocused();
    await page.getByRole("button", { name: "Workspace", exact: true }).click();
    await expect(page.getByText("Provider may edit only inside the exact allowlisted workspace.", { exact: false })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".inspector")).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("button", { name: "Workspace", exact: true })).toBeFocused();
  });

  test("persists a blocked, unverified receipt when preflight evidence cannot run", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One production API assertion is sufficient.");
    const response = await page.request.post("/api/execute", {
      data: {
        prompt: "Run a bounded local evidence check.",
        provider: "demo",
        model: "protocol-54-fixture",
        agentId: "delivery-evidence-auditor",
        workingDirectory: "C:\\Windows",
        permissionMode: "observe",
        teamMode: false,
      },
    });
    expect(response.ok()).toBe(true);
    const events = (await response.text()).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    expect(events.some((event) => event.type === "run_blocked")).toBe(true);
    const receipt = events.find((event) => event.type === "receipt")?.detail;
    expect(receipt).toMatchObject({
      schemaVersion: 2,
      outcome: "blocked",
      artifactState: "none",
      deliveryState: "not_attempted",
      verificationState: "unverified",
      externalActionAttempted: false,
    });
  });
});

test.describe("Rockbot responsive and motion behavior", () => {
  test("uses an off-canvas operating team on mobile without page overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile geometry assertion.");
    await page.goto("/");
    await expect(page.getByTestId("composer-input")).toBeVisible();
    const launcher = page.getByRole("button", { name: "Open operating team" });
    await launcher.click();
    const operatingTeam = page.getByRole("dialog", { name: "Rockbot operating team" });
    await expect(operatingTeam).toBeVisible();
    await expect(operatingTeam.getByRole("button", { name: "Close sidebar" })).toBeFocused();
    await expect(page.getByTestId("model-trigger")).toBeVisible();

    const targetSizes = await operatingTeam.locator("button:visible").evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { name: button.getAttribute("aria-label") ?? button.textContent?.trim(), width: box.width, height: box.height };
    }));
    expect(targetSizes.every((target) => target.width >= 44 && target.height >= 44)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(launcher).toBeFocused();

    const geometry = await page.evaluate(() => ({
      innerWidth,
      innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      composerBottom: document.querySelector(".composer-zone")!.getBoundingClientRect().bottom,
    }));
    expect(geometry.scrollWidth).toBe(geometry.innerWidth);
    expect(geometry.scrollHeight).toBe(geometry.innerHeight);
    expect(geometry.composerBottom).toBeLessThanOrEqual(geometry.innerHeight + 1);
  });

  test("honors reduced motion", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One reduced-motion confirmation is sufficient.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const duration = await page.locator(".welcome").evaluate((element) => getComputedStyle(element).animationDuration);
    const durationSeconds = duration.endsWith("ms") ? Number.parseFloat(duration) / 1_000 : Number.parseFloat(duration);
    expect(durationSeconds).toBeLessThanOrEqual(0.000001);
  });
});
