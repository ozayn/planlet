import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeJobUrl,
  normalizeJobUrlForStorage,
} from "@/lib/job-url-normalization";

describe("normalizeJobUrl", () => {
  it("canonicalizes LinkedIn job URLs and removes tracking params", () => {
    assert.equal(
      normalizeJobUrl(
        "https://www.linkedin.com/jobs/view/4431464867/?trackingId=JvphFfOHRqqyn9dByjMyyw%3D%3D",
      ),
      "https://www.linkedin.com/jobs/view/4431464867",
    );
  });

  it("extracts LinkedIn job id from slug URLs and drops query params", () => {
    assert.equal(
      normalizeJobUrl(
        "https://www.linkedin.com/jobs/view/data-scientist-at-thomson-reuters-4426156029?trackingId=abc&refId=1",
      ),
      "https://www.linkedin.com/jobs/view/4426156029",
    );
  });

  it("removes Greenhouse tracking params", () => {
    assert.equal(
      normalizeJobUrl("https://boards.greenhouse.io/acme/jobs/123?gh_jid=123&gh_src=foo"),
      "https://boards.greenhouse.io/acme/jobs/123",
    );
  });

  it("removes Lever source params", () => {
    assert.equal(
      normalizeJobUrl("https://jobs.lever.co/acme/abc123?lever-source=newsletter&utm_source=email"),
      "https://jobs.lever.co/acme/abc123",
    );
  });

  it("removes Indeed-style tracking params while keeping path", () => {
    assert.equal(
      normalizeJobUrl("https://www.indeed.com/viewjob?jk=abc123&from=share&utm_campaign=test"),
      "https://www.indeed.com/viewjob?jk=abc123&from=share",
    );
  });

  it("lowercases hostname, removes fragments, and trailing slashes", () => {
    assert.equal(
      normalizeJobUrl("HTTPS://Jobs.Example.COM/path/#section"),
      "https://jobs.example.com/path",
    );
  });

  it("leaves unknown sites with meaningful query params", () => {
    assert.equal(
      normalizeJobUrl("https://example.com/jobs/42?team=platform&role=eng"),
      "https://example.com/jobs/42?team=platform&role=eng",
    );
  });
});

describe("normalizeJobUrlForStorage", () => {
  it("matches normalizeJobUrl", () => {
    const url = "https://linkedin.com/jobs/view/4431464867/?trackingId=abc";
    assert.equal(normalizeJobUrlForStorage(url), normalizeJobUrl(url));
  });
});
