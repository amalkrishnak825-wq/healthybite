import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import MealBasicInformation from "../components/admin/meals/MealBasicInformation";
import MealCropDialog from "../components/admin/meals/MealCropDialog";
import MealNutritionFields from "../components/admin/meals/MealNutritionFields";
import MealPublishingControls from "../components/admin/meals/MealPublishingControls";
import MealVisuals from "../components/admin/meals/MealVisuals";
import useMealImages from "../hooks/useMealImages";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "cropperjs/dist/cropper.css";
import "../styles/Admin.css";
import "../styles/MealManagement.css";

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "High Protein",
  "Dairy-Free",
  "Keto Friendly",
  "Nut-Free",
  "Organic",
];
const emptyMeal = {
  name: "",
  subtitle: "",
  description: "",
  prepTime: "",
  price: "",
  compareAtPrice: "",
  category: "",
  stock: "",
  highlights: "",
  dietaryTags: [],
  nutrition: { calories: "", protein: "", carbs: "", fats: "" },
  isPublished: false,
  isFeatured: false,
  isBlocked: false,
};
export default function AdminMealEditorPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(productId);
  const [meal, setMeal] = useState(emptyMeal);
  const [categories, setCategories] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useAdminErrorToast(error, setError);
  const {
    cropImageRef,
    cropperRef,
    files,
    filePreviews,
    cropQueue,
    cropIndex,
    cropperReady,
    cropSource,
    addImageFiles,
    initializeCropper,
    applyCurrentCrop,
    cancelCrop,
    removeSelectedFile,
  } = useMealImages({ existingImages, removeImages, onError: setError });

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/categories", { params: { page: 1, limit: 50 } }),
      editing ? api.get(`/products/admin/${productId}`) : Promise.resolve(null),
    ])
      .then(([categoryResponse, productResponse]) => {
        if (!active) return;
        const available = categoryResponse.data.categories || [];
        setCategories(available);
        if (productResponse) {
          const product = productResponse.data.product;
          setMeal({
            name: product.name || "",
            subtitle: product.subtitle || "",
            description: product.description || "",
            prepTime: product.prepTime || "",
            price: String(product.price ?? ""),
            compareAtPrice: product.compareAtPrice ?? "",
            category: product.category?._id || "",
            stock: String(product.stock ?? ""),
            highlights: (product.highlights || []).join("\n"),
            dietaryTags: product.dietaryTags || [],
            nutrition: Object.fromEntries(
              ["calories", "protein", "carbs", "fats"].map((key) => [
                key,
                product.nutrition?.[key] ?? "",
              ]),
            ),
            isPublished: product.isPublished,
            isFeatured: product.isFeatured ?? true,
            isBlocked: product.isBlocked,
          });
          setExistingImages(product.images || []);
        } else {
          const preferred =
            available.find((category) => category.slug === "healthy-bowls") ||
            available[0];
          setMeal({ ...emptyMeal, category: preferred?._id || "" });
        }
        setLoaded(true);
      })
      .catch((failure) => {
        if (active) {
          setError(getErrorMessage(failure));
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [editing, productId]);

  function setField(key, value) {
    setMeal((current) => ({ ...current, [key]: value }));
  }
  function toggleDiet(tag) {
    setField(
      "dietaryTags",
      meal.dietaryTags.includes(tag)
        ? meal.dietaryTags.filter((item) => item !== tag)
        : [...meal.dietaryTags, tag],
    );
  }
  function setNutritionField(key, value) {
    setField("nutrition", { ...meal.nutrition, [key]: value });
  }
  function removeExistingImage(url) {
    setRemoveImages((current) => [...current, url]);
  }
  async function save(event, publish = meal.isPublished) {
    event.preventDefault();
    const keptImageCount = existingImages.filter(
      (image) => !removeImages.includes(image.url),
    ).length;
    if (keptImageCount + files.length < 1) {
      setError("Each meal must have at least 1 image.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      for (const key of [
        "name",
        "subtitle",
        "description",
        "prepTime",
        "price",
        "compareAtPrice",
        "category",
        "stock",
      ])
        data.append(key, String(meal[key]));
      data.append(
        "highlights",
        JSON.stringify(
          meal.highlights
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      );
      data.append("dietaryTags", JSON.stringify(meal.dietaryTags));
      data.append("nutrition", JSON.stringify(meal.nutrition));
      data.append("isPublished", String(publish));
      data.append("isFeatured", String(meal.isFeatured));
      data.append("isBlocked", String(meal.isBlocked));
      data.append("removeImages", JSON.stringify(removeImages));
      for (const file of files) data.append("images", file);
      if (editing)
        await api.patch(`/products/${productId}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      else
        await api.post("/products", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      navigate("/admin/meals", {
        state: {
          notice: editing
            ? "Meal updated successfully."
            : publish
              ? "Meal added successfully."
              : "Meal draft saved successfully.",
        },
      });
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api.post("/auth/admin/logout");
    } finally {
      sessionStorage.removeItem("healthyBiteAdmin");
      sessionStorage.removeItem("healthyBiteAdminUser");
      navigate("/admin/login");
    }
  }
  const activeCategory = categories.find(
    (category) => category._id === meal.category,
  );
  return (
    <div className="admin-app meal-admin-app">
      <AdminSidebar activePage="meals" onLogout={logout} />
      <main className="admin-work">
        <section className="meal-editor-page">
          <div className="meal-editor-top">
            <Link to="/admin/meals">
              <ArrowLeft size={15} /> Back to Meal Management
            </Link>
            {editing && (
              <span
                className={`meal-live-badge ${meal.isPublished && Number(meal.stock) > 0 ? "live" : "draft"}`}
              >
                <i />
                {meal.isPublished && Number(meal.stock) > 0
                  ? "Active • In Stock"
                  : "Draft / Unavailable"}
              </span>
            )}
          </div>
          {editing ? (
            <div className="meal-editor-summary">
              <div>
                <h1>Edit Meal: {meal.name || "Meal"}</h1>
                <p>
                  Update recipe details, nutritional metrics, pricing, allergen
                  warnings, and live menu availability.
                </p>
              </div>
              {activeCategory && <span>{activeCategory.name}</span>}
            </div>
          ) : (
            <div className="meal-editor-heading">
              <h1>Add New Meal</h1>
              <p>
                Configure recipe details, dietary certifications, and
                nutritional macros.
              </p>
            </div>
          )}
          {!loaded ? (
            <div className="meal-editor-card">Loading meal details…</div>
          ) : (
            <form
              className="meal-editor-layout"
              onSubmit={(event) => save(event)}
            >
              <div className="meal-editor-main">
                <MealBasicInformation
                  meal={meal}
                  categories={categories}
                  editing={editing}
                  dietaryOptions={dietaryOptions}
                  onChange={setField}
                  onToggleDiet={toggleDiet}
                />
                <MealNutritionFields nutrition={meal.nutrition} onChange={setNutritionField} />
              </div>
              <aside className="meal-editor-side">
                <MealVisuals
                  mealName={meal.name}
                  existingImages={existingImages}
                  removeImages={removeImages}
                  files={files}
                  filePreviews={filePreviews}
                  onRemoveExisting={removeExistingImage}
                  onRemoveFile={removeSelectedFile}
                  onFilesSelected={addImageFiles}
                />
                <MealPublishingControls meal={meal} onChange={setField} />
              </aside>              <footer className="meal-editor-footer">
                <span>
                  <i />
                  {meal.name && meal.category && meal.price
                    ? "Meal details are ready to save."
                    : "Complete the required meal details to continue."}
                </span>
                <div>
                  <Link to="/admin/meals" className="meal-cancel-button">
                    Cancel
                  </Link>
                  {!editing && (
                    <button
                      type="button"
                      className="meal-draft-button"
                      disabled={busy || !loaded}
                      onClick={(event) => save(event, false)}
                    >
                      <Save size={15} /> Save as Draft
                    </button>
                  )}
                  <button
                    type="submit"
                    className="meal-save-button"
                    disabled={busy || !loaded}
                  >
                    <Save size={15} />
                    {busy ? "Saving…" : editing ? "Save Changes" : "Save Meal"}
                  </button>
                </div>
              </footer>
            </form>
          )}
        </section>
      </main>
      <MealCropDialog
        cropImageRef={cropImageRef}
        cropperRef={cropperRef}
        source={cropSource}
        ready={cropperReady}
        index={cropIndex}
        count={cropQueue.length}
        onImageLoad={initializeCropper}
        onCancel={cancelCrop}
        onApply={applyCurrentCrop}
      />
    </div>
  );
}
