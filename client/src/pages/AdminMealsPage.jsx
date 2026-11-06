import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownWideNarrow,
  Plus,
  Search,
  X,
  Salad,
  BadgeCheck,
  CirclePause,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import AvailabilityToggle from "../components/AvailabilityToggle";
import { getInitials, readAdminUser } from "../utils/admin";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/Admin.css";
import "../styles/Catalog.css";
import "../styles/MealManagement.css";

const pageSize = 8;
const blankCategory = { name: "", description: "" };
const blankProduct = {
  name: "",
  description: "",
  price: "",
  compareAtPrice: "",
  category: "",
  stock: "",
  highlights: "",
  isPublished: false,
};
async function cropAndResize(file) {
  const source = await createImageBitmap(file);
  const side = Math.min(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1200;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    source,
    (source.width - side) / 2,
    (source.height - side) / 2,
    side,
    side,
    0,
    0,
    1200,
    1200,
  );
  source.close();
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) =>
        resolve(
          new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
            type: "image/webp",
          }),
        ),
      "image/webp",
      0.88,
    ),
  );
}

export default function AdminMealsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState("products");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [stats, setStats] = useState({
    totalMeals: 0,
    activeMeals: 0,
    inactiveMeals: 0,
    lowStockMeals: 0,
    averagePrice: 0,
  });
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [categoryForm, setCategoryForm] = useState(blankCategory);
  const [productForm, setProductForm] = useState(blankProduct);
  const [files, setFiles] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState("");
  const [togglingCategoryId, setTogglingCategoryId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const admin = readAdminUser();
  useAdminErrorToast(error, setError);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!location.state?.notice) return;
    toast.success(location.state.notice, {
      id: `admin-success-${location.state.notice}`,
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const loadCategories = useCallback(async () => {
    const endpoint = tab === "categories" ? "/admin/categories" : "/categories";
    const response = await api.get(endpoint, {
      params: {
        page: 1,
        limit: 50,
        search: tab === "categories" ? search : undefined,
      },
    });
    setCategories(response.data.categories);
    if (tab === "categories") setPagination(response.data.pagination);
  }, [search, tab]);

  const loadProducts = useCallback(async () => {
    const response = await api.get("/products/admin", {
      params: {
        page,
        limit: pageSize,
        search,
        category: categoryFilter,
        availability: availabilityFilter,
      },
    });
    setProducts(response.data.products);
    setPagination(response.data.pagination);
  }, [page, search, categoryFilter, availabilityFilter]);

  const loadStats = useCallback(async () => {
    const response = await api.get("/products/admin/stats");
    setStats(response.data.stats);
  }, []);

  useEffect(() => {
    let live = true;
    const load = async () => {
      setError("");
      try {
        if (tab === "categories") await loadCategories();
        else {
          await Promise.all([loadCategories(), loadProducts(), loadStats()]);
        }
      } catch (failure) {
        if (!live) return;
        const message = getErrorMessage(failure);
        if ([401, 403].includes(failure.response?.status))
          navigate("/admin/login", {
            replace: true,
            state: { error: message },
          });
        else setError(message);
      }
    };
    load();
    return () => {
      live = false;
    };
  }, [loadCategories, loadProducts, loadStats, tab, navigate]);

  function startCategory(category = null) {
    setEditing(
      category ? { kind: "category", id: category._id } : { kind: "category" },
    );
    setCategoryForm(
      category
        ? { name: category.name, description: category.description || "" }
        : blankCategory,
    );
    setError("");
  }

  async function startProduct(product = null) {
    if (product) {
      navigate(`/admin/meals/${product._id}/edit`);
      return;
    }
    if (!product) {
      setError("");
      try {
        // Refresh at the point of use so a newly-created category is available
        // even if the products page was opened before the category request finished.
        const response = await api.get("/categories", {
          params: { page: 1, limit: 50 },
        });
        const activeCategories = response.data.categories || [];
        setCategories(activeCategories);
        if (!activeCategories.length) {
          setTab("categories");
          setNotice("Create a category before adding a product.");
          return;
        }
      } catch (failure) {
        setError(`Could not load categories: ${getErrorMessage(failure)}`);
        return;
      }
    }
    navigate("/admin/meals/new");
  }

  async function submitCategory(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editing.id)
        await api.patch(`/admin/categories/${editing.id}`, categoryForm);
      else await api.post("/admin/categories", categoryForm);
      setEditing(null);
      await loadCategories();
      toast.success(
        editing.id
          ? "Category updated successfully."
          : "Category added successfully.",
        { id: "admin-category-saved" },
      );
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function submitProduct(event) {
    event.preventDefault();
    const currentImages = editing.id
      ? products.find((product) => product._id === editing.id)?.images || []
      : [];
    const keptImageCount = currentImages.filter(
      (image) => !removedImages.includes(image.url),
    ).length;
    if (keptImageCount + files.length < 1) {
      setError("Each meal must have at least 1 image.");
      return;
    }
    if (keptImageCount + files.length > 5) {
      setError("A meal can have at most 5 images.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      Object.entries(productForm).forEach(([key, value]) =>
        data.append(key, String(value)),
      );
      data.set(
        "highlights",
        JSON.stringify(
          productForm.highlights
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      );
      data.set("removeImages", JSON.stringify(removedImages));
      for (const file of files)
        data.append("images", await cropAndResize(file));
      if (editing.id)
        await api.patch(`/products/${editing.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      else
        await api.post("/products", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      setEditing(null);
      await loadProducts();
      toast.success(
        editing.id ? "Meal updated successfully." : "Meal added successfully.",
        { id: "admin-meal-saved" },
      );
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(item) {
    setError("");
    setPendingDelete({
      kind: tab === "categories" ? "category" : "product",
      item,
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { kind, item } = pendingDelete;
    const label = kind;
    setBusy(true);
    setError("");
    try {
      if (kind === "category")
        await api.delete(`/admin/categories/${item._id}`);
      else await api.delete(`/products/${item._id}`);
      setNotice(`${label[0].toUpperCase()}${label.slice(1)} removed.`);
      setPendingDelete(null);
      if (kind === "category") await loadCategories();
      else await loadProducts();
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategoryAvailability(category) {
    const nextIsActive = category.isActive === false;
    setTogglingCategoryId(category._id);
    try {
      await api.patch(`/admin/categories/${category._id}`, {
        isActive: nextIsActive,
      });
      await Promise.all([loadCategories(), loadProducts()]);
      toast.success(
        nextIsActive
          ? `${category.name} is now active.`
          : `${category.name} is now inactive.`,
        { id: `category-availability-${category._id}` },
      );
    } catch (failure) {
      toast.error(getErrorMessage(failure), {
        id: `category-availability-error-${category._id}`,
      });
    } finally {
      setTogglingCategoryId("");
    }
  }

  async function toggleProductAvailability(product) {
    const isActive =
      product.isPublished && product.stock > 0 && !product.isBlocked;
    if (!isActive && product.stock < 1) {
      toast.error("Add stock before activating this meal.", {
        id: `meal-stock-${product._id}`,
      });
      return;
    }
    setTogglingProductId(product._id);
    try {
      await api.patch(
        `/products/${product._id}`,
        isActive
          ? { isPublished: false }
          : { isPublished: true, isBlocked: false },
      );
      await Promise.all([loadProducts(), loadStats()]);
      toast.success(
        isActive
          ? `${product.name} is now inactive.`
          : `${product.name} is now active.`,
        { id: `meal-availability-${product._id}` },
      );
    } catch (failure) {
      toast.error(getErrorMessage(failure), {
        id: `meal-availability-error-${product._id}`,
      });
    } finally {
      setTogglingProductId("");
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

  return (
    <div className="admin-app meal-admin-app">
      <AdminSidebar activePage="meals" onLogout={logout} />
      <main className="admin-work">
        <header className="admin-toolbar">
          <form
            className="admin-global-search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(query.trim());
            }}
          >
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search meals, orders, customers, metrics..."
              aria-label="Search meals"
            />
            <button aria-label="Search">
              <Search size={15} />
            </button>
          </form>
          <div className="admin-profile">
            <div className="admin-profile-avatar" aria-label="Admin profile">
              {getInitials(admin.email || admin.name)}
            </div>
          </div>
        </header>
        <section className="admin-page catalog-admin-page">
          {notice && <div className="catalog-notice">{notice}</div>}
          <div className="admin-title-row">
            <div>
              <span className="admin-kicker">KITCHEN CATALOG OPERATIONS</span>
              <h1>Meal Management</h1>
              <p>
                Manage healthy recipes, nutritional details, live menu
                availability, and pricing across regional delivery kitchens.
              </p>
            </div>
            <button
              className="admin-export"
              onClick={() =>
                tab === "categories" ? startCategory() : startProduct()
              }
            >
              <Plus size={16} /> Add{" "}
              {tab === "categories" ? "Category" : "Meal"}
            </button>
          </div>
          {tab === "products" && (
            <div className="meal-stats-grid">
              <article>
                <span>Total Meals</span>
                <div>
                  <b>{stats.totalMeals}</b>
                  <small>In catalog</small>
                </div>
                <i>
                  <Salad size={18} />
                </i>
              </article>
              <article>
                <span>Active In-Stock</span>
                <div>
                  <b>{stats.activeMeals}</b>
                  <small>Available on menu</small>
                </div>
                <i className="positive">
                  <BadgeCheck size={18} />
                </i>
              </article>
              <article>
                <span>Inactive Stock</span>
                <div>
                  <b>{stats.inactiveMeals}</b>
                  <small>Unavailable on menu</small>
                </div>
                <i className="warning">
                  <CirclePause size={18} />
                </i>
              </article>
            </div>
          )}
          <div className="catalog-tabs">
            <button
              className={tab === "products" ? "active" : ""}
              onClick={() => {
                setTab("products");
                setPage(1);
                setSearch("");
                setQuery("");
              }}
            >
              Meals
            </button>
            <button
              className={tab === "categories" ? "active" : ""}
              onClick={() => {
                setTab("categories");
                setPage(1);
                setSearch("");
                setQuery("");
              }}
            >
              Categories
            </button>
          </div>
          <section className="customer-table-card">
            <div className="customer-table-tools">
              <form
                className="customer-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  setSearch(query.trim());
                }}
              >
                <Search size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    tab === "products"
                      ? "Search meals, ingredients..."
                      : "Search categories..."
                  }
                  aria-label={`Search ${tab}`}
                />
                {query && (
                  <button
                    type="button"
                    className="clear-customer-search"
                    onClick={() => {
                      setQuery("");
                      setSearch("");
                      setPage(1);
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
                <button className="customer-search-submit">Search</button>
              </form>
              {tab === "products" && (
                <>
                  <select
                    className="meal-filter-select"
                    aria-label="Filter meals by category"
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Categories</option>
                    {categories
                      .filter(
                        (category) =>
                          !category.isDeleted && category.isActive !== false,
                      )
                      .map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  <select
                    className="meal-filter-select"
                    aria-label="Filter meals by availability"
                    value={availabilityFilter}
                    onChange={(event) => {
                      setAvailabilityFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Availability</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Out of Stock</option>
                  </select>
                  <button
                    type="button"
                    className="meal-filter-reset"
                    onClick={() => {
                      setCategoryFilter("");
                      setAvailabilityFilter("");
                      setQuery("");
                      setSearch("");
                      setPage(1);
                    }}
                  >
                    Reset
                  </button>
                  <span className="meal-result-count">
                    Showing {products.length} of {pagination.total} meals
                  </span>
                </>
              )}
              {tab === "categories" && (
                <div className="customer-sort">
                  <ArrowDownWideNarrow size={15} /> Sort: Most Recent
                </div>
              )}
            </div>
            {tab === "categories" ? (
              <div className="admin-table-scroll">
                <table className="customer-table catalog-admin-table">
                  <thead>
                    <tr>
                      <th>CATEGORY</th>
                      <th>DESCRIPTION</th>
                      <th>CREATED</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category._id}>
                        <td>
                          <b>{category.name}</b>
                        </td>
                        <td>{category.description || "—"}</td>
                        <td>
                          {new Date(category.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`meal-table-status ${category.isDeleted || category.isActive === false ? "inactive" : "active"}`}
                          >
                            <i />
                            {category.isDeleted
                              ? "Deleted"
                              : category.isActive === false
                                ? "Inactive"
                                : "Active"}
                          </span>
                        </td>
                        <td>
                          <div className="category-actions">
                            <button
                              type="button"
                              className="catalog-row-action"
                              onClick={() => startCategory(category)}
                              disabled={category.isDeleted}
                            >
                              Edit
                            </button>
                            {!category.isDeleted && (
                              <AvailabilityToggle
                                active={category.isActive !== false}
                                disabled={Boolean(togglingCategoryId)}
                                busy={togglingCategoryId === category._id}
                                title={
                                  category.isActive === false
                                    ? "Click to activate this category"
                                    : "Click to deactivate this category"
                                }
                                label={`${category.isActive === false ? "Activate" : "Deactivate"} ${category.name}`}
                                onToggle={() =>
                                  toggleCategoryAvailability(category)
                                }
                              />
                            )}
                            {!category.isDeleted && (
                              <button
                                type="button"
                                className="catalog-row-action danger"
                                aria-label={`Delete category ${category.name}`}
                                onClick={() => deleteEntry(category)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!categories.length && (
                      <tr>
                        <td colSpan="5" className="admin-empty-row">
                          No categories found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-table-scroll">
                <table className="customer-table catalog-admin-table meal-admin-table">
                  <thead>
                    <tr>
                      <th>MEAL RECIPE</th>
                      <th>CATEGORY</th>
                      <th>PRICE</th>
                      <th>CALORIES</th>
                      <th>MENU STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const isActive =
                        product.isPublished &&
                        product.stock > 0 &&
                        !product.isBlocked &&
                        product.category?.isActive !== false;
                      return (
                        <tr key={product._id}>
                          <td>
                            <div className="catalog-admin-product">
                              {product.images?.[0] && (
                                <img
                                  src={
                                    product.images[0].url.startsWith("/")
                                      ? `http://localhost:5000${product.images[0].url}`
                                      : product.images[0].url
                                  }
                                  alt=""
                                />
                              )}
                              <span>
                                <b>{product.name}</b>
                                <small>
                                  {product.subtitle || product.description}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="meal-category-chip">
                              {product.category?.name || "Deleted category"}
                            </span>
                          </td>
                          <td>
                            <b>₹{Number(product.price).toFixed(0)}</b>
                            {product.compareAtPrice > product.price && (
                              <del className="meal-old-price">
                                ₹{Number(product.compareAtPrice).toFixed(0)}
                              </del>
                            )}
                          </td>
                          <td>
                            {product.nutrition?.calories
                              ? `${product.nutrition.calories} kcal`
                              : "—"}
                          </td>
                          <td>
                            <div className="meal-status-cell">
                              <span
                                className={`meal-table-status ${isActive ? "active" : "inactive"}`}
                              >
                                <i />
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="category-actions">
                              <button
                                type="button"
                                className="catalog-row-action"
                                aria-label={`Edit ${product.name}`}
                                onClick={() => startProduct(product)}
                              >
                                Edit
                              </button>
                              <AvailabilityToggle
                                active={isActive}
                                disabled={
                                  Boolean(togglingProductId) ||
                                  (!isActive && product.stock < 1)
                                }
                                busy={togglingProductId === product._id}
                                title={
                                  !isActive && product.stock < 1
                                    ? "Add stock before activating"
                                    : undefined
                                }
                                label={`${isActive ? "Deactivate" : "Activate"} ${product.name}`}
                                onToggle={() =>
                                  toggleProductAvailability(product)
                                }
                              />
                              {!product.isDeleted && (
                                <button
                                  type="button"
                                  className="catalog-row-action danger"
                                  aria-label={`Delete ${product.name}`}
                                  onClick={() => deleteEntry(product)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!products.length && (
                      <tr>
                        <td colSpan="6" className="admin-empty-row">
                          No meals found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <footer className="customer-table-footer">
              <span>
                {pagination.total} {tab}
              </span>
              <div className="admin-pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>
                <span>
                  {page} / {Math.max(1, pagination.pages)}
                </span>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </section>
      </main>
      {editing && (
        <div
          className="admin-modal-backdrop catalog-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          {editing.kind === "category" ? (
            <form
              className="admin-confirm-modal catalog-editor"
              onSubmit={submitCategory}
            >
              <button
                className="modal-close"
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                <X />
              </button>
              <h2>{editing.id ? "Edit Category" : "Add Category"}</h2>
              <label>
                Category name
                <input
                  required
                  minLength="2"
                  maxLength="80"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength="500"
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: event.target.value,
                    })
                  }
                />
              </label>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="cancel-confirm"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className="detail-edit" disabled={busy}>
                  Save Category
                </button>
              </div>
            </form>
          ) : (
            <form
              className="admin-confirm-modal catalog-editor product-editor"
              onSubmit={submitProduct}
            >
              <button
                className="modal-close"
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                <X />
              </button>
              <h2>{editing.id ? "Edit Product" : "Add Product"}</h2>
              <label>
                Product name
                <input
                  required
                  minLength="2"
                  maxLength="140"
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm({ ...productForm, name: event.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  required
                  maxLength="5000"
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      description: event.target.value,
                    })
                  }
                />
              </label>
              <div className="catalog-form-row">
                <label>
                  Price
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        price: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Original price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.compareAtPrice}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        compareAtPrice: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Stock
                  <input
                    required
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        stock: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Category
                <select
                  required
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value,
                    })
                  }
                >
                  <option value="">Select category</option>
                  {categories
                    .filter(
                      (category) =>
                        !category.isDeleted && category.isActive !== false,
                    )
                    .map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Highlights <small>One highlight per line</small>
                <textarea
                  value={productForm.highlights}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      highlights: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Product images{" "}
                <small>
                  Choose 1–5 images to crop to square and resize to 1200 × 1200
                  px before upload.
                </small>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) =>
                    setFiles(
                      Array.from(event.target.files || []).slice(
                        0,
                        Math.max(
                          0,
                          5 -
                            (editing.id
                              ? (
                                  products.find(
                                    (product) => product._id === editing.id,
                                  )?.images || []
                                ).filter(
                                  (image) => !removedImages.includes(image.url),
                                ).length
                              : 0),
                        ),
                      ),
                    )
                  }
                />
              </label>
              {editing.id &&
                editing.kind === "product" &&
                products.find((product) => product._id === editing.id)?.images
                  ?.length > 0 && (
                  <div className="catalog-existing-images">
                    {products
                      .find((product) => product._id === editing.id)
                      .images.map((image) => (
                        <label key={image.url}>
                          <img
                            src={`http://localhost:5000${image.url}`}
                            alt=""
                          />
                          <input
                            type="checkbox"
                            checked={removedImages.includes(image.url)}
                            onChange={(event) =>
                              setRemovedImages((current) =>
                                event.target.checked
                                  ? [...current, image.url]
                                  : current.filter((url) => url !== image.url),
                              )
                            }
                          />{" "}
                          Remove
                        </label>
                      ))}
                  </div>
                )}
              <label className="catalog-publish-check">
                <input
                  type="checkbox"
                  checked={productForm.isPublished}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      isPublished: event.target.checked,
                    })
                  }
                />{" "}
                Publish product
              </label>
              <label className="catalog-publish-check">
                <input
                  type="checkbox"
                  checked={Boolean(productForm.isBlocked)}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      isBlocked: event.target.checked,
                    })
                  }
                />{" "}
                Block product from customer listings
              </label>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="cancel-confirm"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className="detail-edit" disabled={busy}>
                  {busy ? "Saving…" : "Save Product"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {pendingDelete && (
        <div
          className="admin-modal-backdrop catalog-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setPendingDelete(null);
          }}
        >
          <section
            className="admin-confirm-modal catalog-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="catalog-delete-title"
            aria-describedby="catalog-delete-description"
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => !busy && setPendingDelete(null)}
              aria-label="Close"
            >
              <X />
            </button>
            <span className="catalog-delete-icon">
              <AlertCircle size={22} />
            </span>
            <h2 id="catalog-delete-title">
              {pendingDelete.kind === "category"
                ? "Delete Category?"
                : "Delete Meal Recipe?"}
            </h2>
            <p id="catalog-delete-description">
              Are you sure you want to delete <b>{pendingDelete.item.name}</b>?{" "}
              {pendingDelete.kind === "category"
                ? "Meals in this category will also be removed from customer menus."
                : "This meal will no longer be available for customer ordering."}{" "}
              This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="cancel-confirm"
                disabled={busy}
                onClick={() => {
                  setPendingDelete(null);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="catalog-delete-confirm"
                disabled={busy}
                onClick={confirmDelete}
              >
                {busy
                  ? "Deleting…"
                  : pendingDelete.kind === "category"
                    ? "Yes, Delete Category"
                    : "Yes, Delete Meal"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
