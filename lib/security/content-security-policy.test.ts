import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildContentSecurityPolicyHeader } from "@/lib/security/content-security-policy";

function directiveValue(header: string, directiveName: string): string {
  const directive = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${directiveName} `));

  assert.ok(directive, `Missing ${directiveName} directive`);

  return directive.slice(directiveName.length + 1);
}

describe("content security policy", () => {
  it("allows only the expected image sources", () => {
    const header = buildContentSecurityPolicyHeader("production");
    const imgSrc = directiveValue(header, "img-src");

    assert.equal(
      imgSrc,
      "'self' blob: data: https://*.googleusercontent.com https://i.ytimg.com https://img.youtube.com",
    );
    const tokens = imgSrc.split(/\s+/);

    assert.equal(tokens.includes("https:"), false);
    assert.equal(tokens.includes("*"), false);
  });

  it("allows blob playback for narration media sources", () => {
    const header = buildContentSecurityPolicyHeader("production");
    const mediaSrc = directiveValue(header, "media-src");

    assert.equal(mediaSrc, "'self' blob:");
    assert.equal(mediaSrc.includes("*"), false);
  });
});
