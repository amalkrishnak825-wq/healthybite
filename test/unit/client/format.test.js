import test from "node:test";
import assert from "node:assert/strict";
import { maskEmail, mmss } from "../../../client/src/utils/format.js";

test("maskEmail hides all but the first two local-part characters", () => {
  assert.equal(maskEmail("amal@example.com"), "am***@example.com");
  assert.equal(maskEmail("a@example.com"), "a***@example.com");
});

test("maskEmail leaves malformed addresses unchanged", () => {
  assert.equal(maskEmail(""), "");
  assert.equal(maskEmail("not-an-email"), "not-an-email");
});

test("mmss formats minutes and seconds", () => {
  assert.equal(mmss(0), "00:00");
  assert.equal(mmss(9), "00:09");
  assert.equal(mmss(60), "01:00");
  assert.equal(mmss(125), "02:05");
});

test("mmss floors fractions and clamps negative values to zero", () => {
  assert.equal(mmss(3.9), "00:03");
  assert.equal(mmss(-4), "00:00");
});
