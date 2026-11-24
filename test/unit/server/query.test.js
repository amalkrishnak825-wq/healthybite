import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeRegex,
  paginationMetadata,
  parsePagination,
} from "../../../server/src/utils/query.js";

test("escapeRegex escapes regular expression metacharacters", () => {
  assert.equal(escapeRegex("meal.*(hot)"), "meal\\.\\*\\(hot\\)");
  assert.equal(new RegExp(escapeRegex("A+B")).test("A+B"), true);
  assert.equal(new RegExp(escapeRegex("A+B")).test("AAAB"), false);
});

test("parsePagination uses defaults for missing and invalid values", () => {
  assert.deepEqual(parsePagination({}, { defaultLimit: 12, maxLimit: 50 }), { page: 1, limit: 12 });
  assert.deepEqual(parsePagination({ page: "abc", limit: "0" }, { defaultLimit: 12, maxLimit: 50 }), { page: 1, limit: 12 });
});

test("parsePagination clamps page and limit to valid boundaries", () => {
  assert.deepEqual(parsePagination({ page: "-4", limit: "100" }, { defaultLimit: 12, maxLimit: 50 }), { page: 1, limit: 50 });
  assert.deepEqual(parsePagination({ page: "3", limit: "20" }, { defaultLimit: 12, maxLimit: 50 }), { page: 3, limit: 20 });
});

test("paginationMetadata calculates pages and preserves total", () => {
  assert.deepEqual(paginationMetadata(2, 10, 21), { page: 2, limit: 10, total: 21, pages: 3 });
  assert.equal(paginationMetadata(1, 10, 0).pages, 0);
});
