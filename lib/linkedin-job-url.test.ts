import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalizeLinkedInJobUrl,
  extractLinkedInJobId,
  extractLinkedInSlugDetails,
  isLinkedInJobUrl,
  linkedInSlugToJobFields,
} from "@/lib/linkedin-job-url";
import {
  normalizeJobUrl,
  normalizeJobUrlForStorage,
} from "@/lib/job-url-normalization";

describe("extractLinkedInJobId", () => {
  it("extracts numeric job id and ignores trackingId query param", () => {
    const url =
      "https://www.linkedin.com/jobs/view/4431464867/?trackingId=JvphFfOHRqqyn9dByjMyyw%3D%3D";

    assert.equal(extractLinkedInJobId(url), "4431464867");
  });

  it("extracts job id from slug URLs", () => {
    const url =
      "https://www.linkedin.com/jobs/view/data-scientist-at-thomson-reuters-4426156029?trackingId=abc";

    assert.equal(extractLinkedInJobId(url), "4426156029");
  });
});

describe("canonicalizeLinkedInJobUrl", () => {
  it("returns canonical URL without query params", () => {
    const url =
      "https://www.linkedin.com/jobs/view/4431464867/?trackingId=JvphFfOHRqqyn9dByjMyyw%3D%3D";

    assert.equal(
      canonicalizeLinkedInJobUrl(url),
      "https://www.linkedin.com/jobs/view/4431464867",
    );
  });

  it("canonicalizes slug URLs to numeric view URL", () => {
    const url =
      "https://www.linkedin.com/jobs/view/data-scientist-at-thomson-reuters-4426156029?trackingId=abc";

    assert.equal(
      canonicalizeLinkedInJobUrl(url),
      "https://www.linkedin.com/jobs/view/4426156029",
    );
  });

  it("supports linkedin.com without www and mobile host", () => {
    assert.equal(
      canonicalizeLinkedInJobUrl("https://linkedin.com/jobs/view/4431464867"),
      "https://www.linkedin.com/jobs/view/4431464867",
    );
    assert.equal(
      canonicalizeLinkedInJobUrl("https://m.linkedin.com/jobs/view/4431464867/"),
      "https://www.linkedin.com/jobs/view/4431464867",
    );
  });
});

describe("extractLinkedInSlugDetails", () => {
  it("does not invent title or company for id-only URLs", () => {
    const details = extractLinkedInSlugDetails(
      "https://www.linkedin.com/jobs/view/4431464867/?trackingId=abc",
    );

    assert.deepEqual(details, {
      jobId: "4431464867",
      slug: null,
      possibleTitle: null,
      possibleCompany: null,
    });
  });

  it("extracts title and company from slug URLs", () => {
    const details = extractLinkedInSlugDetails(
      "https://www.linkedin.com/jobs/view/data-scientist-at-thomson-reuters-4426156029?trackingId=abc",
    );

    assert.equal(details?.jobId, "4426156029");
    assert.equal(details?.slug, "data-scientist-at-thomson-reuters");
    assert.equal(details?.possibleTitle, "Data Scientist");
    assert.equal(details?.possibleCompany, "Thomson Reuters");
  });

  it("title-cases multi-word slug segments", () => {
    const details = extractLinkedInSlugDetails(
      "https://www.linkedin.com/jobs/view/senior-machine-learning-engineer-at-acme-ai-1234567890",
    );

    assert.equal(details?.possibleTitle, "Senior Machine Learning Engineer");
    assert.equal(details?.possibleCompany, "Acme Ai");
  });
});

describe("linkedInSlugToJobFields", () => {
  it("returns only populated slug fields", () => {
    assert.deepEqual(
      linkedInSlugToJobFields({
        jobId: "4431464867",
        slug: null,
        possibleTitle: null,
        possibleCompany: null,
      }),
      {},
    );

    assert.deepEqual(
      linkedInSlugToJobFields({
        jobId: "4426156029",
        slug: "data-scientist-at-thomson-reuters",
        possibleTitle: "Data Scientist",
        possibleCompany: "Thomson Reuters",
      }),
      {
        title: "Data Scientist",
        company: "Thomson Reuters",
      },
    );
  });
});

describe("non-LinkedIn URLs", () => {
  it("leaves non-LinkedIn URLs unchanged for storage when no tracking params", () => {
    const url = "https://jobs.lever.co/acme/abc123";

    assert.equal(isLinkedInJobUrl(url), false);
    assert.equal(canonicalizeLinkedInJobUrl(url), null);
    assert.equal(normalizeJobUrlForStorage(url), url);
    assert.equal(normalizeJobUrl(url), url);
  });
});
