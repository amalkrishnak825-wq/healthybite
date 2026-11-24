import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidIndianPhone,
  isValidIndianPincode,
  isValidPersonName,
} from "../../../server/src/utils/inputValidation.js";

test("person names accept normal names and supported punctuation", () => {
  for (const name of ["Amal Krishnan", "Anne-Marie", "O’Neil", "José"]) {
    assert.equal(isValidPersonName(name), true, name);
  }
});

test("person names reject empty, too short, too long, and invalid characters", () => {
  assert.equal(isValidPersonName(" "), false);
  assert.equal(isValidPersonName("A"), false);
  assert.equal(isValidPersonName("A1mal"), false);
  assert.equal(isValidPersonName("A".repeat(51)), false);
  assert.equal(isValidPersonName(null), false);
});

test("person name validation trims surrounding whitespace", () => {
  assert.equal(isValidPersonName("  Amal  "), true);
});

test("Indian phone validation accepts exactly 10 digits beginning 6 through 9", () => {
  for (const phone of ["6123456789", "7123456789", "8123456789", "9123456789"]) {
    assert.equal(isValidIndianPhone(phone), true, phone);
  }
});

test("Indian phone validation rejects wrong length, prefix, characters, and type", () => {
  for (const phone of ["5123456789", "612345678", "61234567890", "61234a6789", 6123456789, null]) {
    assert.equal(isValidIndianPhone(phone), false, String(phone));
  }
});

test("Indian PIN validation accepts six digits beginning 1 through 9", () => {
  assert.equal(isValidIndianPincode("682001"), true);
  assert.equal(isValidIndianPincode("012345"), false);
  assert.equal(isValidIndianPincode("68200"), false);
  assert.equal(isValidIndianPincode("6820010"), false);
  assert.equal(isValidIndianPincode("68A001"), false);
});
