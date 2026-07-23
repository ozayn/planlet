import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("app chrome breakpoints for flashcard focus", () => {
  const root = join(import.meta.dirname, "../..");
  const shell = readFileSync(
    join(root, "components/app-layout-shell.tsx"),
    "utf8",
  );
  const drawer = readFileSync(
    join(root, "components/app-nav/app-nav-drawer.tsx"),
    "utf8",
  );
  const sidebar = readFileSync(
    join(root, "components/app-nav/app-nav-sidebar.tsx"),
    "utf8",
  );
  const mobileBar = readFileSync(
    join(root, "components/mobile-app-bar.tsx"),
    "utf8",
  );
  const desktopNav = readFileSync(
    join(root, "components/desktop-nav.tsx"),
    "utf8",
  );
  const bottomNav = readFileSync(
    join(root, "components/bottom-nav.tsx"),
    "utf8",
  );
  const globals = readFileSync(join(root, "app/globals.css"), "utf8");

  it("defaults the overlay drawer closed and restores focus on close", () => {
    assert.match(drawer, /const \[open, setOpen\] = useState\(false\)/);
    assert.match(drawer, /aria-label="Open navigation menu"/);
    assert.match(drawer, /Escape/);
    assert.match(drawer, /ui-app-nav-drawer-backdrop/);
    assert.match(drawer, /menuButtonRef\.current\?\.focus/);
    assert.match(drawer, /wasOpen/);
  });

  it("treats viewports below lg as overlay-chrome rather than docked sidebar", () => {
    assert.match(sidebar, /lg:flex lg:flex-col/);
    assert.doesNotMatch(sidebar, /md:flex md:flex-col/);
    assert.match(drawer, /lg:hidden/);
    assert.match(mobileBar, /lg:hidden/);
    assert.match(desktopNav, /lg:block/);
    assert.match(bottomNav, /lg:hidden/);
  });

  it("does not reserve sidebar space on flashcard deck routes below desktop", () => {
    assert.match(shell, /data-flashcard-shell/);
    assert.match(globals, /\[data-flashcard-shell="focus"\] \.ui-app-nav-sidebar/);
    assert.match(globals, /display: none !important/);
    assert.match(shell, /ui-app-main-flashcard max-w-none/);
  });

  it("keeps sticky flashcard controls safe-area aware and full content width", () => {
    const explore = readFileSync(
      join(root, "components/life-lab/flashcard-explore.tsx"),
      "utf8",
    );
    assert.match(explore, /env\(safe-area-inset-bottom\)/);
    assert.match(explore, /max-w-none/);
    assert.match(explore, /data-flashcard-nav="sticky"/);
    assert.match(explore, /dir=\{direction\}/);
  });
});
