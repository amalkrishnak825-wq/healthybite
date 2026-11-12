import { UtensilsCrossed } from "lucide-react";

const nutritionFields = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbs", "g"],
  ["fats", "Fats", "g"],
];

export default function MealNutritionFields({ nutrition, onChange }) {
  return (
    <section className="meal-editor-card meal-nutrition-card">
      <h2>
        <span className="meal-section-icon"><UtensilsCrossed size={16} /></span>
        Nutritional Breakdown &amp; Macros
      </h2>
      <p>Per serving portion</p>
      <div className="meal-nutrition-grid">
        {nutritionFields.map(([key, label, unit]) => (
          <label key={key} className="meal-nutrition-field">
            <span>{label}</span>
            <div>
              <input type="number" min="0" max="100000" step="0.1" value={nutrition[key]} onChange={(event) => onChange(key, event.target.value)} />
              <small>{unit}</small>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
