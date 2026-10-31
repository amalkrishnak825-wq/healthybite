import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Home, Leaf, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import api from "../api/axios";
import "../styles/Catalog.css";

const dietaryTabs = [{ label: "Protein Meals", tag: "High Protein" }];
const categoryOrder = ["healthy bowls", "salads", "smoothies"];
const sortOptions = [["recent", "Recommended"], ["price_asc", "Price: Low to High"], ["price_desc", "Price: High to Low"], ["name_asc", "Name: A–Z"], ["name_desc", "Name: Z–A"]];

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || "recent";
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";
  const page = Number(params.get("page") || 1);
  const dietaryTags = useMemo(() => (params.get("dietaryTags") || "").split(",").filter(Boolean), [params]);

  useEffect(() => { api.get("/categories").then(response => setCategories(response.data.categories || [])).catch(() => {}); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get("/products", { params: { search, category, sort, minPrice, maxPrice, dietaryTags: dietaryTags.join(","), page, limit: 8 } })
      .then(response => { if (active) { setProducts(response.data.products || []); setPagination(response.data.pagination); setError(""); } })
      .catch(failure => { if (active) setError(failure.response?.data?.message || "Could not load meals."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, category, sort, minPrice, maxPrice, dietaryTags, page]);

  const orderedCategories = useMemo(() => [...categories].sort((a, b) => {
    const aOrder = categoryOrder.indexOf(a.name?.trim().toLowerCase());
    const bOrder = categoryOrder.indexOf(b.name?.trim().toLowerCase());
    return (aOrder < 0 ? 99 : aOrder) - (bOrder < 0 ? 99 : bOrder) || a.name.localeCompare(b.name);
  }).reduce((groups, item) => {
    const normalized = item.name?.trim().toLowerCase();
    const existing = groups.find(group => group.name.trim().toLowerCase() === normalized);
    if (existing) existing.ids.push(item._id);
    else groups.push({ ...item, ids: [item._id], name: categoryOrder.includes(normalized) ? normalized.replace(/\b\w/g, character => character.toUpperCase()) : item.name });
    return groups;
  }, []), [categories]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    setParams(next);
  }
  function selectCategory(item) {
    const next = new URLSearchParams(params);
    const nextTags = dietaryTags.filter(tag => tag !== "High Protein");
    if (item?.tag && !nextTags.includes(item.tag)) nextTags.push(item.tag);
    if (nextTags.length) next.set("dietaryTags", nextTags.join(",")); else next.delete("dietaryTags");
    if (item?.ids?.length) next.set("category", item.ids.join(","));
    else if (item?._id) next.set("category", item._id);
    else next.delete("category");
    next.delete("page");
    setParams(next);
  }
  function toggleDietaryTag(tag) {
    const nextTags = dietaryTags.includes(tag) ? dietaryTags.filter(value => value !== tag) : [...dietaryTags, tag];
    update("dietaryTags", nextTags.join(","));
  }
  function clearFilters() { setParams({}); setSortMenuOpen(false); }
  const tabs = [
    { label: "All Meals" },
    ...orderedCategories.filter(item => !/protein meals/i.test(item.name)).map(item => ({ ...item, label: item.name })),
    ...(!orderedCategories.some(item => /protein meals/i.test(item.name)) ? dietaryTabs : []),
  ];
  const isTabActive = item => item.tag ? dietaryTags.includes(item.tag) && !category : item.ids?.length ? item.ids.some(id => category.split(",").includes(id)) && !dietaryTags.includes("High Protein") : !category && !dietaryTags.includes("High Protein");

  return <div className="home-page"><Header/><main className="meal-menu-page">
    <div className="meal-menu-breadcrumb"><Link to="/"><Home size={15}/> Home</Link><span>›</span><span>Explore Meals</span></div>
    <section className="meal-menu-intro"><h1>Explore Our Meals</h1><p>Fresh ingredients, balanced nutrition, and delicious meals crafted for purposeful daily nourishment.</p></section>
    <section className="meal-menu-toolbar" aria-label="Search and filter meals">
      <label className="meal-menu-search"><Search size={17}/><input type="search" value={search} onChange={event => update("search", event.target.value)} placeholder="Search healthy meals, ingredients, or dietary perks..." aria-label="Search healthy meals, ingredients, or dietary perks"/></label>
      <div className="meal-menu-controls">
        <button type="button" className={`meal-vegetarian-toggle ${dietaryTags.includes("Vegetarian") ? "selected" : ""}`} aria-pressed={dietaryTags.includes("Vegetarian")} onClick={() => toggleDietaryTag("Vegetarian")}><span className="meal-filter-checkbox"><i/></span><span>Vegetarian Only</span><Leaf size={14}/></button>
        <div className="meal-sort-wrap"><button type="button" className="meal-menu-sort" aria-haspopup="menu" aria-expanded={sortMenuOpen} onClick={() => setSortMenuOpen(open => !open)}><span>Sort by: {sortOptions.find(([value]) => value === sort)?.[1] || "Recommended"}</span><ChevronDown size={14}/></button>{sortMenuOpen && <div className="meal-sort-popover"><div className="meal-sort-options" role="menu" aria-label="Sort meals">{sortOptions.map(([value, label]) => <button type="button" key={value} role="menuitemradio" aria-checked={sort === value} className={sort === value ? "selected" : ""} onClick={() => { update("sort", value); setSortMenuOpen(false); }}>{label}</button>)}</div><div className="meal-price-filter-panel"><b>Price range</b><label>Minimum<input type="number" min="0" value={minPrice} onChange={event => update("minPrice", event.target.value)} placeholder="₹ Min"/></label><label>Maximum<input type="number" min="0" value={maxPrice} onChange={event => update("maxPrice", event.target.value)} placeholder="₹ Max"/></label></div></div>}</div>
      </div>
    </section>
    <nav className="meal-category-tabs" aria-label="Meal categories">
      {tabs.map(item => <button key={item._id || item.tag || item.label} type="button" className={isTabActive(item) ? "active" : ""} aria-pressed={isTabActive(item)} onClick={() => selectCategory(item)}>{item.label}</button>)}
    </nav>
    {error && <div className="catalog-error" role="alert">{error}</div>}
    <section className="meal-menu-grid" aria-label="Meals">
      {products.map(product => <ProductCard key={product._id} product={product} onError={setError}/>)}
      {loading && !products.length && <div className="meal-menu-empty">Loading meals…</div>}
      {!loading && !products.length && !error && <div className="meal-menu-empty">No meals match these filters. <button onClick={clearFilters}>Clear filters</button></div>}
    </section>
    {pagination.pages > 1 && <nav className="meal-menu-pagination" aria-label="Meal pages"><span>Showing {products.length ? (page - 1) * 8 + 1 : 0}–{Math.min(page * 8, pagination.total)} of {pagination.total} meals</span><div><button disabled={page <= 1} onClick={() => update("page", String(page - 1))} aria-label="Previous page"><ChevronLeft size={17}/></button><b>{page}</b><button disabled={page >= pagination.pages} onClick={() => update("page", String(page + 1))} aria-label="Next page"><ChevronRight size={17}/></button></div></nav>}
  </main><Footer/></div>;
}
