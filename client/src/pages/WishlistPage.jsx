import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api, { getErrorMessage } from "../api/axios";
import { addProductToCart } from "../utils/cart";
import "../styles/Catalog.css";

export default function WishlistPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => { const response = await api.get("/wishlist"); setProducts(response.data.products); }, []);
  useEffect(() => { load().catch(failure => { if (failure.response?.status === 401) navigate("/login"); else setError(getErrorMessage(failure)); }); }, [load, navigate]);
  async function remove(id) { try { await api.delete(`/wishlist/${id}`); setProducts(current => current.filter(product => product._id !== id)); } catch (failure) { setError(getErrorMessage(failure)); } }
  async function add(product) { try { await addProductToCart(api, product._id); setProducts(current => current.filter(item => item._id !== product._id)); } catch (failure) { setError(getErrorMessage(failure)); } }
  return <div className="home-page wishlist-route"><Header/><main className="wishlist-page"><div className="catalog-heading"><div><span className="home-section-label">SAVED FOR LATER</span><h1>Wishlist</h1></div><Link to="/products">Explore products</Link></div>{error && <div className="catalog-error">{error}</div>}{products.map(product => <article className="wishlist-row" key={product._id}><img src={product.images?.[0]?.url ? `http://localhost:5000${product.images[0].url}` : "/login-bg.jpg"} alt={product.name}/><div><Link to={`/products/${product.slug}`}><b>{product.name}</b></Link><p>₹{Number(product.price).toFixed(2)}</p></div><button className="catalog-row-action danger" onClick={() => remove(product._id)}>Remove</button><button className="catalog-row-action" disabled={!product.stock} onClick={() => add(product)}>Add to cart</button></article>)}{!products.length && !error && <div className="catalog-empty">Your wishlist is empty.</div>}</main><Footer/></div>;
}
