import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, AlertCircle, ArrowDownWideNarrow, ClipboardList, LayoutDashboard, LogOut, Package, Plus, Search, Tag, Truck, UtensilsCrossed, Users, X, Salad, BadgeCheck, Banknote } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import "../styles/Admin.css";
import "../styles/Catalog.css";
import "../styles/MealManagement.css";

const pageSize = 10;
const blankCategory = { name: "", description: "" };
const blankProduct = { name: "", description: "", price: "", compareAtPrice: "", category: "", stock: "", highlights: "", isPublished: false };
function readAdmin() { try { return JSON.parse(sessionStorage.getItem("healthyBiteAdminUser") || "{}"); } catch { return {}; } }
function initials(name = "") { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "HB"; }

async function cropAndResize(file) {
  const source = await createImageBitmap(file);
  const side = Math.min(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1200;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 1200, 1200);
  source.close();
  return new Promise(resolve => canvas.toBlob(blob => resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" })), "image/webp", 0.88));
}

export default function AdminCatalogPage() {
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
  const [stats, setStats] = useState({ totalMeals: 0, activeMeals: 0, lowStockMeals: 0, averagePrice: 0 });
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [categoryForm, setCategoryForm] = useState(blankCategory);
  const [productForm, setProductForm] = useState(blankProduct);
  const [files, setFiles] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const admin = readAdmin();

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!location.state?.notice) return;
    setNotice(location.state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const loadCategories = useCallback(async () => {
    const endpoint = tab === "categories" ? "/admin/categories" : "/categories";
    const response = await api.get(endpoint, { params: { page: 1, limit: 50, search: tab === "categories" ? search : undefined } });
    setCategories(response.data.categories);
    if (tab === "categories") setPagination(response.data.pagination);
  }, [search, tab]);

  const loadProducts = useCallback(async () => {
    const response = await api.get("/products/admin", { params: { page, limit: pageSize, search, category: categoryFilter, availability: availabilityFilter } });
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
        else { await Promise.all([loadCategories(), loadProducts(), loadStats()]); }
      } catch (failure) {
        if (!live) return;
        const message = getErrorMessage(failure);
        if ([401, 403].includes(failure.response?.status)) navigate("/admin/login", { replace: true, state: { error: message } });
        else setError(message);
      }
    };
    load();
    return () => { live = false; };
  }, [loadCategories, loadProducts, loadStats, tab, navigate]);

  function startCategory(category = null) {
    setEditing(category ? { kind: "category", id: category._id } : { kind: "category" });
    setCategoryForm(category ? { name: category.name, description: category.description || "" } : blankCategory);
    setError("");
  }

  async function startProduct(product = null) {
    if (product) {
      navigate(`/admin/catalog/${product._id}/edit`);
      return;
    }
    if (!product) {
      setError("");
      try {
        // Refresh at the point of use so a newly-created category is available
        // even if the products page was opened before the category request finished.
        const response = await api.get("/categories", { params: { page: 1, limit: 50 } });
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
    navigate("/admin/catalog/new");
  }

  async function submitCategory(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (editing.id) await api.patch(`/admin/categories/${editing.id}`, categoryForm);
      else await api.post("/admin/categories", categoryForm);
      setEditing(null); setNotice("Category saved."); await loadCategories();
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  }

  async function submitProduct(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = new FormData();
      Object.entries(productForm).forEach(([key, value]) => data.append(key, String(value)));
      data.set("highlights", JSON.stringify(productForm.highlights.split("\n").map(value => value.trim()).filter(Boolean)));
      data.set("removeImages", JSON.stringify(removedImages));
      for (const file of files) data.append("images", await cropAndResize(file));
      if (editing.id) await api.patch(`/products/${editing.id}`, data, { headers: { "Content-Type": "multipart/form-data" } });
      else await api.post("/products", data, { headers: { "Content-Type": "multipart/form-data" } });
      setEditing(null); setNotice("Product saved."); await loadProducts();
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  }

  async function deleteEntry(item) {
    setError("");
    setPendingDelete({ kind: tab === "categories" ? "category" : "product", item });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { kind, item } = pendingDelete;
    const label = kind;
    setBusy(true); setError("");
    try {
      if (kind === "category") await api.delete(`/admin/categories/${item._id}`);
      else await api.delete(`/products/${item._id}`);
      setNotice(`${label[0].toUpperCase()}${label.slice(1)} removed.`);
      setPendingDelete(null);
      if (kind === "category") await loadCategories(); else await loadProducts();
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  }

  async function logout() { try { await api.post("/auth/admin/logout"); } finally { sessionStorage.removeItem("healthyBiteAdmin"); sessionStorage.removeItem("healthyBiteAdminUser"); navigate("/admin/login"); } }

  return <div className="admin-app meal-admin-app"><aside className="admin-rail"><Link to="/" className="admin-brand"><span className="admin-brand-mark"><UtensilsCrossed size={20}/></span><span><b>HealthyBite</b><small>FRESH · HEALTHY · DELICIOUS</small></span></Link><nav className="admin-nav"><span className="admin-nav-label">WORKSPACE</span><a><LayoutDashboard/>Overview</a><Link className="current" to="/admin/catalog"><UtensilsCrossed/>Meals</Link><a><ClipboardList/>Orders</a><Link to="/admin/users"><Users/>Customers</Link><a><Truck/>Delivery Agents</a><a><Tag/>Coupons</a><a><Activity/>Reports &amp; Analytics</a></nav><button className="admin-logout" onClick={logout}><LogOut size={17}/> Logout</button></aside>
    <main className="admin-work"><header className="admin-toolbar"><form className="admin-global-search" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search meals, orders, customers, metrics..." aria-label="Search meals"/><button aria-label="Search"><Search size={15}/></button></form><div className="admin-profile"><div className="admin-profile-avatar" aria-label="Admin profile">{initials(admin.email || admin.name)}</div></div></header><section className="admin-page catalog-admin-page">{error && <div className="auth-form-error admin-inline-error" role="alert"><AlertCircle size={17}/><span>{error}</span></div>}{notice && <div className="catalog-notice">{notice}</div>}
      <div className="admin-title-row"><div><span className="admin-kicker">KITCHEN CATALOG OPERATIONS</span><h1>Meal Management</h1><p>Manage healthy recipes, nutritional details, live menu availability, and pricing across regional delivery kitchens.</p></div><button className="admin-export" onClick={() => tab === "categories" ? startCategory() : startProduct()}><Plus size={16}/> Add {tab === "categories" ? "Category" : "Meal"}</button></div>
      {tab === "products" && <div className="meal-stats-grid"><article><span>Total Meals</span><div><b>{stats.totalMeals}</b><small>In catalog</small></div><i><Salad size={18}/></i></article><article><span>Active In-Stock</span><div><b>{stats.activeMeals}</b><small>Available on menu</small></div><i className="positive"><BadgeCheck size={18}/></i></article><article><span>Average Meal Price</span><div><b>₹{stats.averagePrice}</b><small>Across catalog</small></div><i><Banknote size={18}/></i></article></div>}
      <div className="catalog-tabs"><button className={tab === "products" ? "active" : ""} onClick={() => { setTab("products"); setPage(1); setSearch(""); setQuery(""); }}>Meals</button><button className={tab === "categories" ? "active" : ""} onClick={() => { setTab("categories"); setPage(1); setSearch(""); setQuery(""); }}>Categories</button></div>
      <section className="customer-table-card"><div className="customer-table-tools"><form className="customer-search" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={tab === "products" ? "Search meals, ingredients..." : "Search categories..."} aria-label={`Search ${tab}`}/>{query && <button type="button" className="clear-customer-search" onClick={() => { setQuery(""); setSearch(""); setPage(1); }} aria-label="Clear search">×</button>}<button className="customer-search-submit">Search</button></form>{tab === "products" && <><select className="meal-filter-select" aria-label="Filter meals by category" value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value); setPage(1); }}><option value="">All Categories</option>{categories.filter(category => !category.isDeleted).map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select><select className="meal-filter-select" aria-label="Filter meals by availability" value={availabilityFilter} onChange={event => { setAvailabilityFilter(event.target.value); setPage(1); }}><option value="">All Availability</option><option value="active">Active</option><option value="inactive">Inactive / Out of Stock</option></select><button type="button" className="meal-filter-reset" onClick={() => { setCategoryFilter(""); setAvailabilityFilter(""); setQuery(""); setSearch(""); setPage(1); }}>Reset</button><span className="meal-result-count">Showing {products.length} of {pagination.total} meals</span></>}{tab === "categories" && <div className="customer-sort"><ArrowDownWideNarrow size={15}/> Sort: Most Recent</div>}</div>
      {tab === "categories" ? <div className="admin-table-scroll"><table className="customer-table catalog-admin-table"><thead><tr><th>CATEGORY</th><th>DESCRIPTION</th><th>CREATED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{categories.map(category => <tr key={category._id}><td><b>{category.name}</b></td><td>{category.description || "—"}</td><td>{new Date(category.createdAt).toLocaleDateString()}</td><td>{category.isDeleted ? "Deleted" : "Active"}</td><td><button className="catalog-row-action" onClick={() => startCategory(category)}>Edit</button>{!category.isDeleted && <button className="catalog-row-action danger" onClick={() => deleteEntry(category)}>Delete</button>}</td></tr>)}{!categories.length && <tr><td colSpan="5" className="admin-empty-row">No categories found.</td></tr>}</tbody></table></div> : <div className="admin-table-scroll"><table className="customer-table catalog-admin-table meal-admin-table"><thead><tr><th>MEAL RECIPE</th><th>CATEGORY</th><th>PRICE</th><th>CALORIES</th><th>MENU STATUS</th><th>ACTIONS</th></tr></thead><tbody>{products.map(product => <tr key={product._id}><td><div className="catalog-admin-product">{product.images?.[0] && <img src={`http://localhost:5000${product.images[0].url}`} alt=""/>}<span><b>{product.name}</b><small>{product.subtitle || product.description}</small></span></div></td><td><span className="meal-category-chip">{product.category?.name || "Deleted category"}</span></td><td><b>₹{Number(product.price).toFixed(0)}</b>{product.compareAtPrice > product.price && <del className="meal-old-price">₹{Number(product.compareAtPrice).toFixed(0)}</del>}</td><td>{product.nutrition?.calories ? `${product.nutrition.calories} kcal` : "—"}</td><td><span className={`meal-table-status ${product.isPublished && product.stock > 0 && !product.isBlocked ? "active" : "inactive"}`}><i/>{product.isPublished && product.stock > 0 && !product.isBlocked ? "Active" : "Inactive"}</span></td><td><button className="catalog-row-action" aria-label={`Edit ${product.name}`} onClick={() => startProduct(product)}>Edit</button>{!product.isDeleted && <button className="catalog-row-action danger" aria-label={`Delete ${product.name}`} onClick={() => deleteEntry(product)}>Delete</button>}</td></tr>)}{!products.length && <tr><td colSpan="6" className="admin-empty-row">No meals found.</td></tr>}</tbody></table></div>}
      <footer className="customer-table-footer"><span>{pagination.total} {tab}</span><div className="admin-pagination"><button disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button><span>{page} / {Math.max(1, pagination.pages)}</span><button disabled={page >= pagination.pages} onClick={() => setPage(current => current + 1)}>Next</button></div></footer></section>
    </section></main>
    {editing && <div className="admin-modal-backdrop catalog-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}>{editing.kind === "category" ? <form className="admin-confirm-modal catalog-editor" onSubmit={submitCategory}><button className="modal-close" type="button" onClick={() => setEditing(null)} aria-label="Close"><X/></button><h2>{editing.id ? "Edit Category" : "Add Category"}</h2>{error && <div className="auth-form-error" role="alert">{error}</div>}<label>Category name<input required minLength="2" maxLength="80" value={categoryForm.name} onChange={event => setCategoryForm({ ...categoryForm, name: event.target.value })}/></label><label>Description<textarea maxLength="500" value={categoryForm.description} onChange={event => setCategoryForm({ ...categoryForm, description: event.target.value })}/></label><div className="confirm-actions"><button type="button" className="cancel-confirm" onClick={() => setEditing(null)}>Cancel</button><button className="detail-edit" disabled={busy}>Save Category</button></div></form> : <form className="admin-confirm-modal catalog-editor product-editor" onSubmit={submitProduct}><button className="modal-close" type="button" onClick={() => setEditing(null)} aria-label="Close"><X/></button><h2>{editing.id ? "Edit Product" : "Add Product"}</h2>{error && <div className="auth-form-error" role="alert">{error}</div>}<label>Product name<input required minLength="2" maxLength="140" value={productForm.name} onChange={event => setProductForm({ ...productForm, name: event.target.value })}/></label><label>Description<textarea required maxLength="5000" value={productForm.description} onChange={event => setProductForm({ ...productForm, description: event.target.value })}/></label><div className="catalog-form-row"><label>Price<input required type="number" min="0.01" step="0.01" value={productForm.price} onChange={event => setProductForm({ ...productForm, price: event.target.value })}/></label><label>Original price<input type="number" min="0" step="0.01" value={productForm.compareAtPrice} onChange={event => setProductForm({ ...productForm, compareAtPrice: event.target.value })}/></label><label>Stock<input required type="number" min="0" max="1000000" step="1" value={productForm.stock} onChange={event => setProductForm({ ...productForm, stock: event.target.value })}/></label></div><label>Category<select required value={productForm.category} onChange={event => setProductForm({ ...productForm, category: event.target.value })}><option value="">Select category</option>{categories.filter(category => !category.isDeleted).map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label>Highlights <small>One highlight per line</small><textarea value={productForm.highlights} onChange={event => setProductForm({ ...productForm, highlights: event.target.value })}/></label><label>Product images <small>Choose files to crop to square and resize to 1200 × 1200 px before upload.</small><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={event => setFiles(Array.from(event.target.files || []).slice(0, 8))}/></label>{editing.id && editing.kind === "product" && products.find(product => product._id === editing.id)?.images?.length > 0 && <div className="catalog-existing-images">{products.find(product => product._id === editing.id).images.map(image => <label key={image.url}><img src={`http://localhost:5000${image.url}`} alt=""/><input type="checkbox" checked={removedImages.includes(image.url)} onChange={event => setRemovedImages(current => event.target.checked ? [...current, image.url] : current.filter(url => url !== image.url))}/> Remove</label>)}</div>}<label className="catalog-publish-check"><input type="checkbox" checked={productForm.isPublished} onChange={event => setProductForm({ ...productForm, isPublished: event.target.checked })}/> Publish product</label><label className="catalog-publish-check"><input type="checkbox" checked={Boolean(productForm.isBlocked)} onChange={event => setProductForm({ ...productForm, isBlocked: event.target.checked })}/> Block product from customer listings</label><div className="confirm-actions"><button type="button" className="cancel-confirm" onClick={() => setEditing(null)}>Cancel</button><button className="detail-edit" disabled={busy}>{busy ? "Saving…" : "Save Product"}</button></div></form>}</div>}
    {pendingDelete && <div className="admin-modal-backdrop catalog-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setPendingDelete(null); }}><section className="admin-confirm-modal catalog-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="catalog-delete-title" aria-describedby="catalog-delete-description"><button className="modal-close" type="button" onClick={() => !busy && setPendingDelete(null)} aria-label="Close"><X/></button><span className="catalog-delete-icon"><AlertCircle size={22}/></span><h2 id="catalog-delete-title">{pendingDelete.kind === "category" ? "Delete Category?" : "Delete Meal Recipe?"}</h2><p id="catalog-delete-description">Are you sure you want to delete <b>{pendingDelete.item.name}</b>? {pendingDelete.kind === "category" ? "Meals in this category will also be removed from customer menus." : "This meal will no longer be available for customer ordering."} This action cannot be undone.</p>{error && <div className="auth-form-error" role="alert">{error}</div>}<div className="confirm-actions"><button type="button" className="cancel-confirm" disabled={busy} onClick={() => { setPendingDelete(null); setError(""); }}>Cancel</button><button type="button" className="catalog-delete-confirm" disabled={busy} onClick={confirmDelete}>{busy ? "Deleting…" : pendingDelete.kind === "category" ? "Yes, Delete Category" : "Yes, Delete Meal"}</button></div></section></div>}
  </div>;
}


