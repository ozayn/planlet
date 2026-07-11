import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanPlaylistVideoDisplayTitle,
  cleanPlaylistVideoDisplayTitles,
  cleanYoutubePlaylistVideoTitle,
  detectRepeatedPlaylistSuffix,
} from "@/lib/life-lab/playlist-title-cleanup";

const GREAT_ART_TITLES = [
  "Mona Lisa (short version)i: Great Art Explained",
  "Picasso’s Guernica: Great Art Explained",
  "Michelangelo's David: Great Art Explained",
  "The Arnolfini Portrait by Jan Van Eyck: Great Art Explained",
];

describe("playlist title cleanup", () => {
  it("detects repeated colon suffixes across playlist videos", () => {
    assert.equal(
      detectRepeatedPlaylistSuffix(GREAT_ART_TITLES, {
        playlistTitle: "Great Art Explained",
      }),
      "Great Art Explained",
    );
  });

  it("removes repeated playlist suffixes from display titles", () => {
    const cleaned = cleanPlaylistVideoDisplayTitles(GREAT_ART_TITLES, {
      playlistTitle: "Great Art Explained",
    });

    assert.deepEqual(cleaned, [
      "Mona Lisa (short version)i",
      "Picasso’s Guernica",
      "Michelangelo's David",
      "The Arnolfini Portrait by Jan Van Eyck",
    ]);
  });

  it("does not strip suffixes that are not repeated across the playlist", () => {
    const titles = [
      "Episode One: Great Art Explained",
      "A different topic entirely",
    ];

    assert.equal(
      detectRepeatedPlaylistSuffix(titles, {
        playlistTitle: "Great Art Explained",
      }),
      null,
    );
    assert.equal(
      cleanPlaylistVideoDisplayTitle(titles[0]!, {
        playlistTitle: "Great Art Explained",
      }),
      "Episode One: Great Art Explained",
    );
  });

  it("cleans a single note title when playlist context is known", () => {
    assert.equal(
      cleanYoutubePlaylistVideoTitle(
        "Frida Kahlo's ‘The Two Fridas’: Great Art Explained",
        { playlistTitle: "Great Art Explained" },
      ),
      "Frida Kahlo's ‘The Two Fridas’",
    );
  });

  it("leaves titles unchanged when cleanup would remove too much", () => {
    assert.equal(
      cleanPlaylistVideoDisplayTitle("Great Art Explained", {
        playlistTitle: "Great Art Explained",
      }),
      "Great Art Explained",
    );
    assert.equal(
      cleanPlaylistVideoDisplayTitle("Picasso", {
        playlistTitle: "Great Art Explained",
      }),
      "Picasso",
    );
  });
});
