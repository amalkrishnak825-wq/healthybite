import { Activity } from "lucide-react";

export default function MealPublishingControls({ meal, onChange }) {
  return (
    <section className="meal-editor-card">
      <h2><Activity size={17} />Publishing &amp; Routing</h2>
      <label className="meal-stock-box">
        <span>
          <b>Show on home page</b>
          <small>Include this meal under Chef’s Table Selection · Fresh Picks</small>
        </span>
        <input type="checkbox" checked={meal.isFeatured} onChange={(event) => onChange("isFeatured", event.target.checked)} />
      </label>
      <label className="meal-stock-box">
        <span>
          <b>Available on Menu</b>
          <small>Enable for immediate customer ordering</small>
        </span>
        <input type="checkbox" checked={meal.isPublished} onChange={(event) => onChange("isPublished", event.target.checked)} />
      </label>
      <label className="meal-field meal-stock-input">
        <span>Inventory quantity</span>
        <input required type="number" min="0" max="1000000" step="1" value={meal.stock} onChange={(event) => onChange("stock", event.target.value)} />
      </label>
    </section>
  );
}
