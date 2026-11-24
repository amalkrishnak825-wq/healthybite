import test from "node:test";
import assert from "node:assert/strict";
import {
  getEmailError,
  getIndianPhoneError,
  getIndianPincodeError,
  getNameError,
} from "../../../client/src/utils/validation.js";

test("name validation accepts supported names and optional blanks", () => {
  assert.equal(getNameError(" Amal Krishnan "), "");
  assert.equal(getNameError("Anne-Marie"), "");
  assert.equal(getNameError(""), "");
});

test("name validation reports required, length, and character errors", () => {
  assert.match(getNameError("", { required: true }), /enter your name/i);
  assert.match(getNameError("A"), /between 2 and 50/i);
  assert.match(getNameError("Amal123"), /letters only/i);
});

test("email validation accepts normal email and rejects malformed values", () => {
  assert.equal(getEmailError("amal@example.com"), "");
  assert.equal(getEmailError(""), "");
  assert.match(getEmailError("", true), /enter your email/i);
  for (const email of ["amal", "a@b", "amal @example.com", "@example.com"]) {
    assert.notEqual(getEmailError(email), "", email);
  }
});

test("phone validation accepts only a 10-digit Indian mobile number", () => {
  assert.equal(getIndianPhoneError("9876543210"), "");
  assert.match(getIndianPhoneError(""), /phone number/i);
  assert.equal(getIndianPhoneError("", false), "");
  assert.match(getIndianPhoneError("", true), /phone number/i);
  for (const phone of ["1234567890", "987654321", "98765432101", "98765abc10"]) {
    assert.match(getIndianPhoneError(phone), /10-digit/i, phone);
  }
});

test("PIN validation requires six digits beginning with 1 through 9", () => {
  assert.equal(getIndianPincodeError("682001"), "");
  assert.match(getIndianPincodeError("012345"), /6-digit/i);
  assert.match(getIndianPincodeError("68200"), /6-digit/i);
  assert.match(getIndianPincodeError("68A001"), /6-digit/i);
});
