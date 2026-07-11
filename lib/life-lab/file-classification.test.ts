import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyLifeLabFile,
  isLifeLabPlaylistIndex,
} from "@/lib/life-lab/file-classification";

const YOUTUBE = "youtube-learning" as const;

describe("life lab file classification", () => {
  const artifactPaths = [
    "playlists/assets/death-with-shelly-kagan/playlist-learning-map.md",
    "playlists/assets/death-with-shelly-kagan/playlist-summary.md",
    "playlists/assets/death-with-shelly-kagan/concept-frequencies.md",
    "playlists/assets/death-with-shelly-kagan/people-index.md",
    "playlists/assets/death-with-shelly-kagan/topic-graph.md",
    "playlists/assets/death-with-shelly-kagan/playlist-timeline.md",
    "playlists/assets/death-with-shelly-kagan/playlist-people-map.md",
    "playlists/assets/death-with-shelly-kagan/playlist-concept-map.md",
  ];

  for (const relativePath of artifactPaths) {
    it(`classifies ${relativePath} as playlistArtifact`, () => {
      assert.equal(
        classifyLifeLabFile({
          sectionId: YOUTUBE,
          relativePath,
        }),
        "playlistArtifact",
      );
      assert.equal(
        isLifeLabPlaylistIndex({
          sectionId: YOUTUBE,
          relativePath,
        }),
        false,
      );
    });
  }

  it("does not classify README as a playlist", () => {
    assert.equal(
      classifyLifeLabFile({
        sectionId: YOUTUBE,
        relativePath: "README.md",
      }),
      "about",
    );
    assert.equal(
      isLifeLabPlaylistIndex({
        sectionId: YOUTUBE,
        relativePath: "README.md",
      }),
      false,
    );
  });

  it("classifies a valid top-level playlist index as playlist", () => {
    const relativePath = "playlists/death-with-shelly-kagan-index.md";

    assert.equal(
      classifyLifeLabFile({
        sectionId: YOUTUBE,
        relativePath,
        metadata: {
          type: "playlist-index",
          playlist: "Death with Shelly Kagan",
        },
      }),
      "playlist",
    );
    assert.equal(
      isLifeLabPlaylistIndex({
        sectionId: YOUTUBE,
        relativePath,
        metadata: {
          type: "playlist-index",
          playlist: "Death with Shelly Kagan",
        },
      }),
      true,
    );
  });

  it("classifies reference metadata files as reference", () => {
    for (const relativePath of ["sources.md", "concepts.md", "questions.md"]) {
      assert.equal(
        classifyLifeLabFile({
          sectionId: YOUTUBE,
          relativePath,
        }),
        "reference",
      );
    }
  });

  it("classifies standalone videos under videos/", () => {
    assert.equal(
      classifyLifeLabFile({
        sectionId: YOUTUBE,
        relativePath: "videos/intro-to-philosophy.md",
        subfolderLabel: "videos",
        metadata: { source: "youtube" },
        title: "Intro to Philosophy",
      }),
      "standaloneVideo",
    );
  });

  it("does not classify playlist videos as playlist indexes", () => {
    assert.equal(
      classifyLifeLabFile({
        sectionId: YOUTUBE,
        relativePath: "videos/2026-07-04-part-one.md",
        subfolderLabel: "videos",
        metadata: {
          playlist: "Death with Shelly Kagan",
          source: "youtube",
        },
        title: "Arguments for the Soul, Part I",
      }),
      "playlistVideo",
    );
    assert.equal(
      isLifeLabPlaylistIndex({
        sectionId: YOUTUBE,
        relativePath: "videos/2026-07-04-part-one.md",
        subfolderLabel: "videos",
        metadata: {
          playlist: "Death with Shelly Kagan",
          source: "youtube",
        },
      }),
      false,
    );
  });
});
