import test from "node:test";
import assert from "node:assert/strict";
import AppError from "../../../server/src/utils/AppError.js";
import {
  allowedDietaryTags,
  booleanValue,
  isOrderableProduct,
  makeSlug,
  publicProductFilter,
  requireId,
} from "../../../server/src/utils/catalog.js";

const availableProduct = () => ({
  isDeleted: false,
  isBlocked: false,
  isPublished: true,
  stock: 5,
  category: { isDeleted: false, isActive: true },
});

test("booleanValue parses boolean input and uses its fallback", () => {
  assert.equal(booleanValue(true), true);
  assert.equal(booleanValue("true"), true);
  assert.equal(booleanValue(false, true), false);
  assert.equal(booleanValue("false", true), false);
  assert.equal(booleanValue(undefined, true), true);
});

test("booleanValue rejects values other than true or false", () => {
  assert.throws(() => booleanValue("yes"), (error) => error instanceof AppError && error.statusCode === 400);
  assert.throws(() => booleanValue(1), AppError);
});

test("public product filter excludes unpublished, deleted, and blocked meals", () => {
  assert.deepEqual(publicProductFilter, { isPublished: true, isDeleted: false, isBlocked: false });
});

test("isOrderableProduct accepts available products and valid quantities", () => {
  assert.equal(isOrderableProduct(availableProduct()), true);
  assert.equal(isOrderableProduct(availableProduct(), 5), true);
});

test("isOrderableProduct rejects missing, unpublished, deleted, blocked, or unavailable products", () => {
  assert.equal(isOrderableProduct(null), false);
  for (const patch of [
    { isDeleted: true }, { isBlocked: true }, { isPublished: false }, { stock: 0 },
    { category: null }, { category: { isDeleted: true, isActive: true } },
    { category: { isDeleted: false, isActive: false } },
  ]) {
    assert.equal(isOrderableProduct({ ...availableProduct(), ...patch }), false);
  }
});

test("isOrderableProduct rejects invalid, excessive, and out-of-stock quantities", () => {
  for (const quantity of [0, -1, 1.5, 6, 11, "2"]) {
    assert.equal(isOrderableProduct(availableProduct(), quantity), false, String(quantity));
  }
});

test("requireId accepts valid Mongo ObjectIds and rejects malformed IDs", () => {
  assert.doesNotThrow(() => requireId("507f1f77bcf86cd799439011", "Meal"));
  assert.throws(() => requireId("bad-id", "Meal"), (error) => error instanceof AppError && error.statusCode === 404);
});

test("makeSlug normalizes a meal name and appends a unique suffix", () => {
  const first = makeSlug("  Green Goddess Bowl! ");
  const second = makeSlug("Green Goddess Bowl!");
  assert.match(first, /^green-goddess-bowl-[a-f0-9]{6}$/);
  assert.notEqual(first, second);
});

test("makeSlug provides a fallback for names without ASCII slug characters", () => {
  assert.match(makeSlug("🥗"), /^item-[a-f0-9]{6}$/);
});

test("dietary tags contain supported unique values", () => {
  assert.ok(allowedDietaryTags.includes("Vegetarian"));
  assert.ok(allowedDietaryTags.includes("Vegan"));
  assert.equal(new Set(allowedDietaryTags).size, allowedDietaryTags.length);
});
