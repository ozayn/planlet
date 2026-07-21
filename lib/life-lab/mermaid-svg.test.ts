import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  clearPreferredDiagramAssetCache,
  diagramExportFilename,
  diagramSourceBlob,
  diagramSvgBlob,
  fetchPreferredDiagramAsset,
  resolvePngExportDimensions,
} from "@/lib/life-lab/diagram-export";
import {
  buildMermaidDiagramAssetBindings,
  diagramAssetNameFromSource,
} from "@/lib/life-lab/diagram-assets";
import {
  fixMermaidHtmlLabelStyles,
  prepareMermaidSvg,
  sanitizeGeneratedMermaidSvg,
} from "@/lib/life-lab/mermaid-svg";

const root = join(import.meta.dirname, "../..");

describe("life lab mermaid svg", () => {
  it("removes nowrap and max-width clipping from html label styles", () => {
    const svg = `<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 180px; text-align: center;"><span class="nodeLabel">Heuristics and subconscious processing</span></div></foreignObject></svg>`;

    const fixed = fixMermaidHtmlLabelStyles(svg);

    assert.match(fixed, /white-space:normal/i);
    assert.match(fixed, /max-width:none/i);
    assert.doesNotMatch(fixed, /nowrap/i);
    assert.doesNotMatch(fixed, /ellipsis/i);
  });

  it("normalizes label styles while expanding undersized svg dimensions", () => {
    const prepared = prepareMermaidSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 640 120"><foreignObject><div style="white-space: nowrap; max-width: 180px;">Label</div></foreignObject></svg>',
    );

    assert.match(prepared.html, /viewBox=["']0 0 640 120["']/);
    assert.match(prepared.html, /width=["']640["']/);
    assert.match(prepared.html, /height=["']120["']/);
    assert.match(prepared.html, /white-space:normal/i);
    assert.match(prepared.html, /max-width:none/i);
    assert.equal(prepared.minWidth, 640);
  });

  it("rejects scripts and strips active attributes from generated SVG assets", () => {
    assert.equal(
      sanitizeGeneratedMermaidSvg("<svg><script>alert(1)</script></svg>"),
      null,
    );
    const sanitized = sanitizeGeneratedMermaidSvg(
      '<svg onclick="alert(1)"><a href="javascript:alert(1)">Node</a></svg>',
    );
    assert.doesNotMatch(sanitized ?? "", /onclick|javascript:/i);
    assert.match(sanitized ?? "", /<svg/);
  });

  it("builds reusable vector, PNG, and Mermaid source exports", async () => {
    const source = "flowchart LR\n  A --> B";
    const svg = '<svg viewBox="0 0 400 200"><path d="M0 0"/></svg>';

    assert.equal(await diagramSourceBlob(source).text(), `${source}\n`);
    assert.equal(await diagramSvgBlob(svg).text(), svg);
    assert.equal(
      diagramExportFilename("Learning Map: Attention", "mmd"),
      "learning-map-attention.mmd",
    );
    assert.deepEqual(
      resolvePngExportDimensions({ width: 1200, height: 800 }),
      { width: 3600, height: 2400, scale: 3 },
    );
    const capped = resolvePngExportDimensions({
      width: 12_000,
      height: 10_000,
    });
    assert.ok(capped.width <= 8192);
    assert.ok(capped.height <= 8192);
    assert.ok(capped.width * capped.height <= 48_000_000);
  });

  it("assigns canonical IDs without inventing saved assets", () => {
    assert.deepEqual(
      buildMermaidDiagramAssetBindings(
        "## Learning map\n\n```mermaid\nflowchart LR\nA --> B\n```",
      ),
      [
        {
          source: "flowchart LR\nA --> B",
          diagramId: "learning-map",
          assetName: "learning-map",
          savedAssetName: null,
        },
      ],
    );
    assert.deepEqual(
      buildMermaidDiagramAssetBindings(
        "```mermaid\nA --> B\n```\n\n```mermaid\nB --> C\n```",
      ).map((binding) => binding.diagramId),
      ["diagram-1", "diagram-2"],
    );
    assert.deepEqual(
      buildMermaidDiagramAssetBindings(
        "## Process map\n\n```mermaid\n%% asset: saved-process\nA --> B\n```",
      )[0],
      {
        source: "%% asset: saved-process\nA --> B",
        diagramId: "process-map",
        assetName: "saved-process",
        savedAssetName: "saved-process",
      },
    );
    assert.equal(
      diagramAssetNameFromSource("%% asset: attention-map\nflowchart LR"),
      "attention-map",
    );
  });

  it("caches missing saved assets for the browser session", async () => {
    clearPreferredDiagramAssetCache();
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
      requests += 1;
      return new Response(
        JSON.stringify({
          error: "diagram_asset_not_found",
          fallback: "client_export",
        }),
        { status: 404 },
      );
    };

    try {
      const url = "/api/life-lab/diagram-asset?name=missing&format=svg";
      assert.equal(await fetchPreferredDiagramAsset(url), null);
      assert.equal(await fetchPreferredDiagramAsset(url), null);
      assert.equal(requests, 1);
    } finally {
      globalThis.fetch = originalFetch;
      clearPreferredDiagramAssetCache();
    }
  });

  it("wires fullscreen, downloads, source copy, assets, and responsive actions", () => {
    const block = readFileSync(
      join(root, "components/life-lab/mermaid-block.tsx"),
      "utf8",
    );
    const toolbar = readFileSync(
      join(root, "components/life-lab/diagram-asset-toolbar.tsx"),
      "utf8",
    );
    const dialog = readFileSync(
      join(root, "components/life-lab/diagram-expand-dialog.tsx"),
      "utf8",
    );
    const assetRoute = readFileSync(
      join(root, "app/api/life-lab/diagram-asset/route.ts"),
      "utf8",
    );
    const assets = readFileSync(
      join(root, "components/life-lab/life-lab-diagram-assets.tsx"),
      "utf8",
    );
    const exporter = readFileSync(
      join(root, "lib/life-lab/diagram-export.ts"),
      "utf8",
    );
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");

    assert.match(block, /<DiagramAssetToolbar/);
    assert.match(block, /<MermaidDiagramDialog/);
    assert.match(toolbar, /Download \$\{format\.toUpperCase\(\)\}/);
    assert.match(toolbar, /Download \$\{sourceLabel\} source/);
    assert.match(toolbar, /Copy \$\{sourceLabel\} source/);
    assert.match(dialog, /fitToScreen/);
    assert.match(dialog, /onPointerMove=\{movePan\}/);
    assert.match(dialog, /Zoom in/);
    assert.match(dialog, /Zoom out/);
    assert.match(assetRoute, /getLifeLabDiagramAsset/);
    assert.match(assetRoute, /new Set\(\["png", "svg", "mmd"\]\)/);
    assert.match(assetRoute, /diagram_asset_not_found/);
    assert.match(assetRoute, /fallback: "client_export"/);
    assert.doesNotMatch(assetRoute, /get\("name"\) \?\? "diagram"/);
    assert.match(assets, /savedAssetName/);
    assert.match(assets, /exportSource: "browser"/);
    assert.doesNotMatch(assets, /fallbackAssetName = "diagram"/);
    assert.match(exporter, /diagramSvgBlob\(input\.svg\)/);
    assert.match(exporter, /pngBlobFromSvg\(input\.svg\)/);
    assert.match(exporter, /diagramSourceBlob\(input\.source\)/);
    assert.match(
      styles,
      /@media \(max-width: 767px\)[\s\S]*?\.ui-diagram-toolbar[\s\S]*?position: static/,
    );
    assert.match(
      styles,
      /\.ui-mermaid:hover \.ui-diagram-toolbar[\s\S]*?opacity: 1/,
    );
  });
});
