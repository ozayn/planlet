import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatGoogleDriveErrorMessage,
  isPermissionDeniedReason,
  isRateLimitReason,
  parseGoogleApiErrorBody,
} from "@/lib/life-lab/google-drive-errors";

describe("parseGoogleApiErrorBody", () => {
  it("extracts insufficientPermissions from a Drive 403 body", () => {
    const parsed = parseGoogleApiErrorBody(
      403,
      JSON.stringify({
        error: {
          code: 403,
          message: "The user does not have sufficient permissions for this file.",
          status: "PERMISSION_DENIED",
          errors: [
            {
              domain: "global",
              reason: "insufficientPermissions",
              message: "The user does not have sufficient permissions for this file.",
            },
          ],
        },
      }),
    );

    assert.equal(parsed.httpStatus, 403);
    assert.equal(parsed.code, 403);
    assert.equal(parsed.reason, "insufficientPermissions");
    assert.equal(parsed.status, "PERMISSION_DENIED");
    assert.match(parsed.message ?? "", /sufficient permissions/i);
    assert.equal(isPermissionDeniedReason(parsed.reason), true);
  });

  it("extracts accessNotConfigured", () => {
    const parsed = parseGoogleApiErrorBody(
      403,
      JSON.stringify({
        error: {
          code: 403,
          message: "Google Drive API has not been used in project before or it is disabled.",
          status: "PERMISSION_DENIED",
          errors: [{ reason: "accessNotConfigured" }],
        },
      }),
    );

    assert.equal(parsed.reason, "accessNotConfigured");
    assert.equal(isPermissionDeniedReason(parsed.reason), true);
  });

  it("extracts rateLimitExceeded", () => {
    const parsed = parseGoogleApiErrorBody(
      403,
      JSON.stringify({
        error: {
          code: 403,
          message: "Rate Limit Exceeded",
          errors: [{ reason: "rateLimitExceeded" }],
        },
      }),
    );

    assert.equal(parsed.reason, "rateLimitExceeded");
    assert.equal(isRateLimitReason(parsed.reason), true);
    assert.equal(isPermissionDeniedReason(parsed.reason), false);
  });

  it("falls back when the body is not JSON", () => {
    const parsed = parseGoogleApiErrorBody(403, "forbidden");
    assert.equal(parsed.httpStatus, 403);
    assert.equal(parsed.reason, "forbidden");
    assert.equal(parsed.message, null);
  });
});

describe("formatGoogleDriveErrorMessage", () => {
  it("keeps admin messages concise and actionable", () => {
    const message = formatGoogleDriveErrorMessage({
      httpStatus: 403,
      code: 403,
      message: "The user does not have sufficient permissions for this file.",
      status: "PERMISSION_DENIED",
      reason: "insufficientPermissions",
      reasons: ["insufficientPermissions"],
    });

    assert.match(message, /Google Drive request failed \(403\)/);
    assert.match(message, /reason=insufficientPermissions/);
    assert.match(message, /sufficient permissions/i);
  });
});
