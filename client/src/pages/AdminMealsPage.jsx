import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  Plus,
  Search,
  Salad,
  BadgeCheck,
  CirclePause,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../api/axios";
import ActionConfirmation from "../components/ActionConfirmation";
import AdminPageLayout from "../components/AdminPageLayout";
import AdminPageHeader from "../components/AdminPageHeader";
import ProductImage from "../components/ProductImage";
import AvailabilityToggle from "../components/AvailabilityToggle";
import AdminPagination from "../components/AdminPagination";
import CategoryEditorModal from "../components/admin/meals/CategoryEditorModal";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/Admin.css";
import "../styles/Catalog.css";
import "../styles/MealManagement.css";

const pageSize = 8;
const blankCategory = { name: "", description: "" };

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
  const [busy, setBusy] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState("");
  const [togglingCategoryId, setTogglingCategoryId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useAdminErrorToast(error, setError);

  const orderedCategories = useMemo(
    () =>
      [...categories].sort((left, right) => {
        const deletedRank = (category) => (category.isDeleted ? 1 : 0);
        return (
          deletedRank(left) - deletedRank(right) ||
          new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
        );
      }),
    [categories],
  );

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

  function deleteEntry(item) {
    setError("");
    setPendingDelete({
      kind: tab === "categories" ? "category" : "product",
      item,
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { kind, item } = pendingDelete;
    setBusy(true);
    setError("");
    try {
      if (kind === "category")
        await api.delete(`/admin/categories/${item._id}`);
      else await api.delete(`/products/${item._id}`);
      setNotice(
        kind === "category"
          ? "Category soft deleted. It has been moved to the bottom of the list."
          : "Meal soft deleted.",
      );
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
          ? `${category.name} is active and visible to customers.`
          : `${category.name} is inactive and hidden from customers.`,
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

  return (
    <AdminPageLayout
      className="admin-app meal-admin-app"
      activePage="meals"
      toolbarProps={{
        searchValue: query,
        onSearchChange: setQuery,
        onSearchSubmit: (event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query.trim());
        },
        searchAriaLabel: "Search meals",
      }}
    >
      <section className="admin-page catalog-admin-page">
        {notice && <div className="catalog-notice">{notice}</div>}
        <AdminPageHeader
          kicker="KITCHEN CATALOG OPERATIONS"
          title="Meal Management"
          description="Manage healthy recipes, nutritional details, live menu availability, and pricing across regional delivery kitchens."
          action={(
            <button
              className="admin-export"
              onClick={() =>
                tab === "categories" ? startCategory() : startProduct()
              }
            >
              <Plus size={16} /> Add {tab === "categories" ? "Category" : "Meal"}
            </button>
          )}
        />
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
                  {orderedCategories.map((category) => (
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
                    <th>QUANTITY</th>
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
                              <ProductImage
                                src={product.images[0].url}
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
                          <span
                            className={`meal-stock-count${product.stock === 0 ? " out-of-stock" : ""}`}
                          >
                            {product.stock}
                          </span>
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
                      <td colSpan="7" className="admin-empty-row">
                        No meals found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            as="footer"
            footerClassName="customer-table-footer"
            controlsClassName="admin-pagination"
            summary={`${pagination.total} ${tab}`}
          />
        </section>
      </section>
      <CategoryEditorModal
        editing={editing}
        form={categoryForm}
        onFormChange={setCategoryForm}
        onSubmit={submitCategory}
        onClose={() => setEditing(null)}
        busy={busy}
      />
      <ActionConfirmation
        open={Boolean(pendingDelete)}
        variant="danger"
        title={
          pendingDelete?.kind === "category"
            ? "Delete Category?"
            : "Delete Meal Recipe?"
        }
        message={
          pendingDelete
            ? pendingDelete.kind === "category"
              ? `Soft delete ${pendingDelete.item.name}? The category record will be kept and moved to the bottom of this list. Meals in this category will also be removed from customer menus.`
              : `Soft delete ${pendingDelete.item.name}? The meal record will be kept and it will no longer be available for customer ordering.`
            : ""
        }
        confirmLabel={
          pendingDelete?.kind === "category"
            ? "Yes, Delete Category"
            : "Yes, Delete Meal"
        }
        busy={busy}
        onCancel={() => {
          setPendingDelete(null);
          setError("");
        }}
        onConfirm={confirmDelete}
      />
    </AdminPageLayout>
  );
}
