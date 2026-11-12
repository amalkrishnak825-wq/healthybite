import { UtensilsCrossed } from "lucide-react";

export default function MealBasicInformation({ meal, categories, editing, dietaryOptions, onChange, onToggleDiet }) {
  return (
    <section className="meal-editor-card">
      <h2><UtensilsCrossed size={17} />{editing ? "1. Basic Information" : "General Information"}</h2>
      <div className="meal-basic-grid">
        <label className="meal-field">
          <span>Meal Title <b>*</b></span>
          <input required minLength="2" maxLength="140" value={meal.name} onChange={(event) => onChange("name", event.target.value)} placeholder="e.g. Green Goddess Bowl" />
        </label>
        <label className="meal-field">
          <span>Short Subtitle / Catchphrase</span>
          <input maxLength="160" value={meal.subtitle} onChange={(event) => onChange("subtitle", event.target.value)} placeholder="Gluten-Free • High Fiber • Vegan" />
        </label>
        <label className="meal-field">
          <span>Category <b>*</b></span>
          <select required value={meal.category} onChange={(event) => onChange("category", event.target.value)}>
            <option value="">Select category</option>
            {categories.filter((category) => !category.isDeleted).map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="meal-field">
          <span>Preparation Time</span>
          <input maxLength="60" value={meal.prepTime} onChange={(event) => onChange("prepTime", event.target.value)} placeholder="15–20 mins" />
        </label>
        <label className="meal-field">
          <span>Base Price (₹) <b>*</b></span>
          <input required type="number" min="0.01" step="0.01" value={meal.price} onChange={(event) => onChange("price", event.target.value)} placeholder="349" />
        </label>
        <label className="meal-field">
          <span>Promotional Price (Optional)</span>
          <input type="number" min="0" step="0.01" value={meal.compareAtPrice} onChange={(event) => onChange("compareAtPrice", event.target.value)} placeholder="299" />
        </label>
        <label className="meal-field">
          <span>Available Stock <b>*</b></span>
          <input required type="number" min="0" max="1000000" step="1" value={meal.stock} onChange={(event) => onChange("stock", event.target.value)} placeholder="24" />
        </label>
        <label className="meal-field meal-field-wide">
          <span>Description</span>
          <textarea required maxLength="5000" value={meal.description} onChange={(event) => onChange("description", event.target.value)} placeholder="Describe the meal, ingredients, and flavour…" />
        </label>
        <label className="meal-field meal-field-wide">
          <span>Ingredients &amp; Recipe Composition <small>Enter one ingredient per line.</small></span>
          <textarea value={meal.highlights} onChange={(event) => onChange("highlights", event.target.value)} placeholder="Organic baby spinach&#10;Avocado&#10;Quinoa" />
        </label>
      </div>
      <div className="meal-form-subsection">
        <h3>Dietary &amp; Lifestyle Tags</h3>
        <div className="meal-tag-list">
          {dietaryOptions.map((tag) => (
            <label key={tag} className={meal.dietaryTags.includes(tag) ? "selected" : ""}>
              <input type="checkbox" checked={meal.dietaryTags.includes(tag)} onChange={() => onToggleDiet(tag)} />
              {tag}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
