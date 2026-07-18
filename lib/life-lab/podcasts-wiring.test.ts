import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("podcasts Life Lab wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("registers podcasts and mounts the dedicated section renderer", () => {
    const constants = readFileSync(
      join(root, "lib/life-lab/constants.ts"),
      "utf8",
    );
    const browser = readFileSync(
      join(root, "components/life-lab/life-lab-section-browser.tsx"),
      "utf8",
    );

    assert.match(constants, /podcasts:\s*\{\s*label: "Podcasts"/);
    assert.match(browser, /sectionId === "podcasts"/);
    assert.match(browser, /<PodcastsPageContent/);
  });

  it("renders series cards, responsive episode lists, and no fake links", () => {
    const home = readFileSync(
      join(root, "components/life-lab/podcasts-page-content.tsx"),
      "utf8",
    );
    const show = readFileSync(
      join(root, "components/life-lab/life-lab-podcast-show.tsx"),
      "utf8",
    );

    assert.match(home, /data-podcasts-layout="series-v1"/);
    assert.match(home, /role="progressbar"/);
    assert.match(home, /No podcast show indexes were found/);
    assert.match(home, /No podcast series match these filters/);
    assert.match(show, /hidden overflow-x-auto md:block/);
    assert.match(show, /md:hidden/);
    assert.match(show, /episode\.noteHref \? \(/);
    assert.match(show, /StatusBadge/);
    assert.match(show, /Open note/);
  });

  it("uses podcast-specific show and episode detail renderers", () => {
    const detailPage = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );
    const episode = readFileSync(
      join(root, "components/life-lab/life-lab-podcast-episode.tsx"),
      "utf8",
    );

    assert.match(detailPage, /<LifeLabPodcastShow/);
    assert.match(detailPage, /<LifeLabPodcastEpisode/);
    assert.match(episode, /LIFE_LAB_UI_LABELS\.openOriginalEpisode/);
    assert.match(episode, /<LifeLabNoteListen/);
    assert.match(episode, /LIFE_LAB_UI_LABELS\.showFullTimeline/);
    assert.match(episode, /<LifeLabTimeline content=\{content\}/);
    assert.match(episode, /aria-expanded=\{expanded\}/);
    assert.doesNotMatch(episode, /LIFE_LAB_UI_LABELS\.sourceNotes/);
    assert.doesNotMatch(episode, />\{sourceUrl\}</);
    assert.match(detailPage, /showDevTools &&/);
    assert.match(detailPage, /developerMode=\{showDevTools\}/);
    assert.match(detailPage, /resolveLifeLabImagePlacement/);
    assert.match(detailPage, /image=\{imagePlacement\.leadImage!\}/);
    assert.match(detailPage, /artwork=\{imagePlacement\.headerImage\}/);
    assert.match(episode, /flex-col[\s\S]*?sm:flex-row/);
    assert.match(episode, /size-24 sm:size-40 lg:size-44/);
  });

  it("uses an image failure fallback and responsive Mermaid wrapper", () => {
    const artwork = readFileSync(
      join(root, "components/life-lab/life-lab-podcast-artwork.tsx"),
      "utf8",
    );
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");
    const noteImage = readFileSync(
      join(root, "components/life-lab/life-lab-note-image.tsx"),
      "utf8",
    );

    assert.match(artwork, /onError=\{\(\) => setFailedUrl\(image\.url\)\}/);
    assert.match(artwork, /Podcast artwork placeholder/);
    assert.match(artwork, /object-cover/);
    assert.match(styles, /\.ui-mermaid-svg[\s\S]*?max-width: 100%/);
    assert.match(styles, /\.ui-mermaid-scroll[\s\S]*?overflow-x: auto/);
    assert.match(styles, /\.ui-diagram-toolbar[\s\S]*?display: flex/);
    assert.doesNotMatch(noteImage, /<figcaption/);
    assert.match(
      styles,
      /\.ui-timeline-time-column[\s\S]*?width: 5\.5rem/,
    );
    assert.match(
      styles,
      /\.ui-timeline-time[\s\S]*?font-variant-numeric: tabular-nums[\s\S]*?white-space: nowrap/,
    );
    assert.match(
      styles,
      /@media \(max-width: 520px\)[\s\S]*?\.ui-timeline-table tr[\s\S]*?display: grid/,
    );
    assert.match(
      styles,
      /@media print[\s\S]*?\.ui-timeline-table[\s\S]*?display: table/,
    );
  });
});
