import Category from "../models/Category.js";

const defaults = [
  { name: "Healthy Bowls", slug: "healthy-bowls" },
  { name: "Salads", slug: "salads" },
  { name: "Smoothies", slug: "smoothies" },
];

export default async function seedDefaultCategories() {
  await Promise.all(defaults.map(({ name, slug }) => Category.updateOne(
    { slug },
    { $set: { name, isDeleted: false }, $setOnInsert: { slug, description: "" } },
    { upsert: true },
  )));
}
