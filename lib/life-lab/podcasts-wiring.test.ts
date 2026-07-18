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
    assert.match(home, /No podcast episodes have been processed yet/);
    assert.match(show, /hidden md:block/);
    assert.match(show, /md:hidden/);
    assert.match(show, /episode\.noteHref \? \(/);
    assert.match(show, /StatusBadge/);
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
    assert.match(episode, /Open original episode/);
    assert.match(episode, /Source notes/);
    assert.doesNotMatch(episode, />\{sourceUrl\}</);
  });
});
