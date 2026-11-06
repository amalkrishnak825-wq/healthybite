import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Minus,
  Plus,
  Save,
  UtensilsCrossed,
  X,
} from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
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
  isBlocked: false,
};
export default function AdminMealEditorPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(productId);
  const cropImageRef = useRef(null);
  const cropperRef = useRef(null);
  const [meal, setMeal] = useState(emptyMeal);
  const [categories, setCategories] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [cropQueue, setCropQueue] = useState([]);
  const [cropIndex, setCropIndex] = useState(0);
  const [cropperReady, setCropperReady] = useState(false);
  const [cropSource, setCropSource] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useAdminErrorToast(error, setError);

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

  useEffect(() => {
    const previews = files.map((file) => URL.createObjectURL(file));
    setFilePreviews(previews);
    return () => previews.forEach(URL.revokeObjectURL);
  }, [files]);

  useEffect(() => {
    if (!cropQueue[cropIndex]) {
      setCropSource("");
      return;
    }
    const url = URL.createObjectURL(cropQueue[cropIndex]);
    setCropSource(url);
    return () => URL.revokeObjectURL(url);
  }, [cropQueue, cropIndex]);

  useEffect(() => {
    if (!cropQueue.length) {
      cropperRef.current?.destroy();
      cropperRef.current = null;
    }
  }, [cropQueue.length]);

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
  function addImageFiles(selected) {
    const keptCount = existingImages.filter(
      (image) => !removeImages.includes(image.url),
    ).length;
    const remaining = Math.max(
      0,
      5 - keptCount - files.length - cropQueue.length,
    );
    const validFiles = selected.filter((file) =>
      file.type.startsWith("image/"),
    );
    const accepted = validFiles.slice(0, remaining);
    if (validFiles.length > remaining)
      setError("A meal can have at most 5 images.");
    if (accepted.length) {
      cropperRef.current?.destroy();
      cropperRef.current = null;
      setCropperReady(false);
      setCropQueue(accepted);
      setCropIndex(0);
    }
  }

  function initializeCropper(event) {
    const image = event.currentTarget;
    setCropperReady(false);
    cropperRef.current?.destroy();
    cropperRef.current = null;
    import("cropperjs")
      .then(({ default: Cropper }) => {
        if (!image.isConnected) return;
        cropperRef.current = new Cropper(image, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: "move",
          autoCropArea: 0.9,
          responsive: true,
          background: false,
          guides: false,
          center: true,
          highlight: false,
          movable: true,
          cropBoxMovable: false,
          cropBoxResizable: false,
          toggleDragModeOnDblclick: false,
          ready: () => setCropperReady(true),
        });
      })
      .catch(() =>
        setError("Could not open the image cropper. Please try another image."),
      );
  }

  async function applyCurrentCrop() {
    const sourceFile = cropQueue[cropIndex];
    const canvas = cropperRef.current?.getCroppedCanvas({
      width: 1200,
      height: 1200,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!sourceFile || !canvas) return;
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.88),
    );
    if (!blob) {
      setError("Could not crop this image. Please try another image.");
      return;
    }
    const cropped = new File(
      [blob],
      `${sourceFile.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp" },
    );
    setFiles((current) => [...current, cropped]);
    if (cropIndex + 1 < cropQueue.length) {
      cropperRef.current?.destroy();
      cropperRef.current = null;
      setCropperReady(false);
      setCropIndex(cropIndex + 1);
    } else {
      setCropQueue([]);
      setCropIndex(0);
    }
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
                <section className="meal-editor-card">
                  <h2>
                    <UtensilsCrossed size={17} />
                    {editing ? "1. Basic Information" : "General Information"}
                  </h2>
                  <div className="meal-basic-grid">
                    <label className="meal-field">
                      <span>
                        Meal Title <b>*</b>
                      </span>
                      <input
                        required
                        minLength="2"
                        maxLength="140"
                        value={meal.name}
                        onChange={(event) =>
                          setField("name", event.target.value)
                        }
                        placeholder="e.g. Green Goddess Bowl"
                      />
                    </label>
                    <label className="meal-field">
                      <span>Short Subtitle / Catchphrase</span>
                      <input
                        maxLength="160"
                        value={meal.subtitle}
                        onChange={(event) =>
                          setField("subtitle", event.target.value)
                        }
                        placeholder="Gluten-Free • High Fiber • Vegan"
                      />
                    </label>
                    <label className="meal-field">
                      <span>
                        Category <b>*</b>
                      </span>
                      <select
                        required
                        value={meal.category}
                        onChange={(event) =>
                          setField("category", event.target.value)
                        }
                      >
                        <option value="">Select category</option>
                        {categories
                          .filter((item) => !item.isDeleted)
                          .map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="meal-field">
                      <span>Preparation Time</span>
                      <input
                        maxLength="60"
                        value={meal.prepTime}
                        onChange={(event) =>
                          setField("prepTime", event.target.value)
                        }
                        placeholder="15–20 mins"
                      />
                    </label>
                    <label className="meal-field">
                      <span>
                        Base Price (₹) <b>*</b>
                      </span>
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={meal.price}
                        onChange={(event) =>
                          setField("price", event.target.value)
                        }
                        placeholder="349"
                      />
                    </label>
                    <label className="meal-field">
                      <span>Promotional Price (Optional)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={meal.compareAtPrice}
                        onChange={(event) =>
                          setField("compareAtPrice", event.target.value)
                        }
                        placeholder="299"
                      />
                    </label>
                    <label className="meal-field">
                      <span>
                        Available Stock <b>*</b>
                      </span>
                      <input
                        required
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        value={meal.stock}
                        onChange={(event) =>
                          setField("stock", event.target.value)
                        }
                        placeholder="24"
                      />
                    </label>
                    <label className="meal-field meal-field-wide">
                      <span>Description</span>
                      <textarea
                        required
                        maxLength="5000"
                        value={meal.description}
                        onChange={(event) =>
                          setField("description", event.target.value)
                        }
                        placeholder="Describe the meal, ingredients, and flavour…"
                      />
                    </label>
                    <label className="meal-field meal-field-wide">
                      <span>
                        Ingredients &amp; Recipe Composition{" "}
                        <small>Enter one ingredient per line.</small>
                      </span>
                      <textarea
                        value={meal.highlights}
                        onChange={(event) =>
                          setField("highlights", event.target.value)
                        }
                        placeholder="Organic baby spinach&#10;Avocado&#10;Quinoa"
                      />
                    </label>
                  </div>
                  <div className="meal-form-subsection">
                    <h3>Dietary &amp; Lifestyle Tags</h3>
                    <div className="meal-tag-list">
                      {dietaryOptions.map((tag) => (
                        <label
                          key={tag}
                          className={
                            meal.dietaryTags.includes(tag) ? "selected" : ""
                          }
                        >
                          <input
                            type="checkbox"
                            checked={meal.dietaryTags.includes(tag)}
                            onChange={() => toggleDiet(tag)}
                          />
                          {tag}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>
                <section className="meal-editor-card meal-nutrition-card">
                  <h2>
                    <span className="meal-section-icon">
                      <UtensilsCrossed size={16} />
                    </span>
                    Nutritional Breakdown &amp; Macros
                  </h2>
                  <p>Per serving portion</p>
                  <div className="meal-nutrition-grid">
                    {[
                      ["calories", "Calories", "kcal"],
                      ["protein", "Protein", "g"],
                      ["carbs", "Carbs", "g"],
                      ["fats", "Fats", "g"],
                    ].map(([key, label, unit]) => (
                      <label key={key} className="meal-nutrition-field">
                        <span>{label}</span>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            step="0.1"
                            value={meal.nutrition[key]}
                            onChange={(event) =>
                              setField("nutrition", {
                                ...meal.nutrition,
                                [key]: event.target.value,
                              })
                            }
                          />
                          <small>{unit}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
              <aside className="meal-editor-side">
                <section className="meal-editor-card">
                  <h2>
                    Meal Visuals{" "}
                    <small>
                      {existingImages.length -
                        removeImages.length +
                        files.length}{" "}
                      / 5 images · min 1
                    </small>
                  </h2>
                  <div className="meal-image-grid">
                    {existingImages
                      .filter((image) => !removeImages.includes(image.url))
                      .map((image) => (
                        <div className="meal-image-tile" key={image.url}>
                          <img
                            src={
                              image.url.startsWith("/")
                                ? `http://localhost:5000${image.url}`
                                : image.url
                            }
                            alt={image.alt || meal.name}
                          />
                          <button
                            type="button"
                            aria-label="Remove image"
                            onClick={() =>
                              setRemoveImages((current) => [
                                ...current,
                                image.url,
                              ])
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    {files.map((file, index) => (
                      <div
                        className="meal-image-tile"
                        key={`${file.name}-${file.lastModified}-${index}`}
                      >
                        <img src={filePreviews[index]} alt={file.name} />
                        <button
                          type="button"
                          aria-label="Remove selected image"
                          onClick={() =>
                            setFiles((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label
                    className={`meal-upload-box ${existingImages.length - removeImages.length + files.length >= 5 ? "disabled" : ""}`}
                  >
                    <Plus size={18} />
                    <span>Add meal images</span>
                    <small>JPG, PNG or WebP · 1–5 images required</small>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      disabled={
                        existingImages.length -
                          removeImages.length +
                          files.length >=
                        5
                      }
                      onChange={(event) => {
                        addImageFiles(Array.from(event.target.files || []));
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {files.length > 0 && (
                    <small className="meal-files-selected">
                      {files.length} new image{files.length > 1 ? "s" : ""}{" "}
                      cropped and resized to 1200 × 1200 WebP.
                    </small>
                  )}
                </section>
                <section className="meal-editor-card">
                  <h2>
                    <Activity size={17} />
                    Publishing &amp; Routing
                  </h2>
                  <label className="meal-stock-box">
                    <span>
                      <b>Available on Menu</b>
                      <small>Enable for immediate customer ordering</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={meal.isPublished}
                      onChange={(event) =>
                        setField("isPublished", event.target.checked)
                      }
                    />
                  </label>
                  <label className="meal-field meal-stock-input">
                    <span>Inventory quantity</span>
                    <input
                      required
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      value={meal.stock}
                      onChange={(event) =>
                        setField("stock", event.target.value)
                      }
                    />
                  </label>
                </section>
              </aside>
              <footer className="meal-editor-footer">
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
      {cropQueue.length > 0 && (
        <div className="meal-crop-backdrop" role="presentation">
          <section
            className="meal-crop-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meal-crop-title"
          >
            <div className="meal-crop-heading">
              <div>
                <h2 id="meal-crop-title">Adjust meal photo</h2>
                <p>
                  {cropIndex + 1} of {cropQueue.length} · drag or pinch to frame
                  your meal.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cancel image crop"
                onClick={() => {
                  cropperRef.current?.destroy();
                  cropperRef.current = null;
                  setCropperReady(false);
                  setCropQueue([]);
                  setCropIndex(0);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="meal-crop-preview">
              <img
                ref={cropImageRef}
                src={cropSource}
                alt="Crop preview"
                onLoad={initializeCropper}
              />
            </div>
            <div className="meal-crop-zoom" aria-label="Photo zoom controls">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={!cropperReady}
                onClick={() => cropperRef.current?.zoom(-0.1)}
              >
                <Minus size={17} />
              </button>
              <span>Pinch or zoom</span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={!cropperReady}
                onClick={() => cropperRef.current?.zoom(0.1)}
              >
                <Plus size={17} />
              </button>
            </div>
            <p className="meal-crop-help">
              Square crop · drag to reposition · pinch to zoom
            </p>
            <div className="meal-crop-actions">
              <button
                type="button"
                className="meal-cancel-button"
                onClick={() => {
                  cropperRef.current?.destroy();
                  cropperRef.current = null;
                  setCropperReady(false);
                  setCropQueue([]);
                  setCropIndex(0);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="meal-save-button"
                disabled={!cropperReady}
                onClick={applyCurrentCrop}
              >
                {cropperReady
                  ? cropIndex + 1 < cropQueue.length
                    ? "Crop & Next"
                    : "Crop & Add"
                  : "Preparing crop…"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
