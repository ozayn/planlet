import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("Life Lab note PDF export wiring", () => {
  const root = join(import.meta.dirname, "../..");
  const page = readFileSync(
    join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
    "utf8",
  );
  const moreMenu = readFileSync(
    join(root, "components/life-lab/life-lab-note-more-menu.tsx"),
    "utf8",
  );
  const header = readFileSync(
    join(root, "components/life-lab/life-lab-note-detail-header.tsx"),
    "utf8",
  );
  const briefHeader = readFileSync(
    join(root, "components/life-lab/life-lab-reading-brief-header.tsx"),
    "utf8",
  );
  const globals = readFileSync(join(root, "app/globals.css"), "utf8");
  const shell = readFileSync(
    join(root, "components/app-layout-shell.tsx"),
    "utf8",
  );
  const noteContent = readFileSync(
    join(root, "components/life-lab/life-lab-note-content.tsx"),
    "utf8",
  );
  const policy = readFileSync(
    join(root, "lib/life-lab/print-section-policy.ts"),
    "utf8",
  );

  it("opens Export PDF from More on mobile and a desktop icon", () => {
    assert.match(moreMenu, /LifeLabExportPdfMenuItem/);
    assert.match(header, /LifeLabExportPdfIconButton/);
    assert.match(header, /desktopOnly/);
    assert.match(briefHeader, /LifeLabExportPdfMenuItem/);
    assert.match(briefHeader, /LifeLabExportPdfIconButton/);
    assert.match(
      readFileSync(
        join(root, "components/life-lab/life-lab-export-pdf-menu-item.tsx"),
        "utf8",
      ),
      /exportLifeLabNotePdf/,
    );
  });

  it("uses browser print via ?view=print without a second content parser", () => {
    assert.match(page, /view === "print"/);
    assert.match(page, /LifeLabNotePrintDocument/);
    assert.match(page, /LifeLabPrintAutoTrigger/);
    assert.match(page, /variant="print"/);
    assert.match(noteContent, /variant === "print"/);
    assert.doesNotMatch(page, /puppeteer|playwright|pdfkit|jspdf/i);
  });

  it("centralizes include/exclude policy for print sections", () => {
    assert.match(policy, /resolveLifeLabPrintSectionDecision/);
    assert.match(policy, /questions\?\\s\+for\\s\+later/);
    assert.match(policy, /isFlashcardSectionTitle/);
    assert.match(policy, /isHiddenTechnicalHeading/);
  });

  it("hides app chrome and diagram toolbars when printing", () => {
    assert.match(shell, /print:hidden/);
    assert.match(globals, /ui-life-lab-print-document/);
    assert.match(globals, /ui-diagram-toolbar/);
    assert.match(globals, /break-inside:\s*avoid/);
    assert.match(globals, /\.ui-life-lab-flashcard/);
  });

  it("does not prepare print work on every normal note render", () => {
    assert.doesNotMatch(page, /showPrintView[\s\S]*getLifeLabFlashcardSummary/);
    assert.match(page, /showPrintView = view === "print"/);
    assert.doesNotMatch(
      readFileSync(
        join(root, "components/life-lab/life-lab-note-content.tsx"),
        "utf8",
      ).split("variant = \"reading\"")[0] ?? "",
      /window\.print/,
    );
  });
});
