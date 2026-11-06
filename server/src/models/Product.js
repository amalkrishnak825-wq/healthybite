import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    subtitle: { type: String, trim: true, maxlength: 160, default: "" },
    prepTime: { type: String, trim: true, maxlength: 60, default: "" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: null },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: "" },
          alt: { type: String, trim: true, default: "" },
        },
      ],
      validate: [
        {
          validator: (images) => images.length >= 1,
          message: "A meal must have at least one image.",
        },
        {
          validator: (images) => images.length <= 5,
          message: "A meal can have at most five images.",
        },
      ],
    },
    highlights: [{ type: String, trim: true, maxlength: 160 }],
    dietaryTags: [
      {
        type: String,
        enum: [
          "Vegetarian",
          "Vegan",
          "Gluten-Free",
          "High Protein",
          "Dairy-Free",
          "Keto Friendly",
          "Nut-Free",
          "Organic",
        ],
      },
    ],
    nutrition: {
      calories: { type: Number, min: 0, default: null },
      protein: { type: Number, min: 0, default: null },
      carbs: { type: Number, min: 0, default: null },
      fats: { type: Number, min: 0, default: null },
    },
    isPublished: { type: Boolean, default: false, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text" });
export default mongoose.model("Product", productSchema);
