import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { ArrowLeft, ArrowRight, CircleCheck, MapPin, Plus, UserRound, UtensilsCrossed } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import "../styles/AppPages.css";
import "../styles/ProfileGuest.css";
import "../styles/AuthFormError.css";

export default function AccountPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState([]);
  const [notice, setNotice] = useState(location.state?.notice || "");
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    api.get("/profile/me").then(response => {
      if (active) setUser(response.data.user ?? response.data);
    }).catch(() => {});
    api.get("/addresses").then(response => {
      if (active) setAddresses(response.data.addresses || []);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id, setUser]);
  async function makeDefaultAddress(addressId) { try { await api.patch(`/addresses/${addressId}`, { isDefault: true }); setAddresses(current => current.map(address => ({ ...address, isDefault: address._id === addressId }))); setNotice("Default address updated."); } catch { setNotice("Could not update the default address. Please try again."); } }
  async function signOut() { try { await logout(); } finally { navigate("/login"); } }

  if (!user) return <AuthLayout className="profile-logged-out"><><div className="profile-breadcrumb"><Link to="/">⌂ Home</Link><span>/</span><b>Account Profile</b></div><section className="profile-access-card"><div className="centered-auth-icon"><UserRound/></div><span className="auth-eyebrow">MEMBER ACCESS</span><h1>Sign in to your account</h1><p>Log in or create a HealthyBite account to access your personal profile and verified credentials.</p><div className="profile-access-actions"><Link className="auth-button" to="/login"><ArrowRight size={15}/> Sign In</Link><Link className="create-account-button" to="/register"><UserRound size={16}/> Create Account</Link></div><Link className="auth-back-link" to="/"><ArrowLeft size={14}/> Return to Home</Link></section></></AuthLayout>;

  return <div className="app-shell"><header className="site-header"><Link className="brand" to="/"><span className="brand-mark"><UtensilsCrossed size={19}/></span> healthy<span>bite</span></Link><nav><Link to="/">Home</Link><Link className="active" to="/account">My account</Link><button className="text-button" onClick={signOut}>Sign out</button></nav></header><main className="account-wrap">{notice && <div className="auth-form-success" role="status"><CircleCheck size={17}/><span>{notice}</span></div>}<div className="eyebrow">YOUR HEALTHYBITE</div><h1>Good to see you, {user.name?.split(" ")[0] || "there"}.</h1><p className="muted">Manage your profile and delivery details.</p><div className="account-grid"><section className="panel profile-card"><div className="panel-top"><div className="avatar">{user.profileImage ? <img src={`http://localhost:5000${user.profileImage}`} alt="Profile"/> : <UserRound/>}</div><div><h2>{user.name}</h2><p>{user.email}</p></div></div><div className="info-line"><span>Phone</span><b>{user.phone || "Add a phone number"}</b></div><div className="info-line"><span>Email status</span><b className="status-green">Verified</b></div><Link className="outline-button" to="/account/profile">Edit profile <ArrowRight size={16}/></Link></section><section className="panel address-card"><div className="section-heading"><div><div className="icon-tile"><MapPin size={19}/></div><h2>Saved addresses</h2></div><Link className="icon-action" to="/account/addresses/new"><Plus size={19}/><span>Add</span></Link></div>{addresses.length ? <div className="address-list">{addresses.map(address => <article className="address-item" key={address._id}><div><strong>{address.type || "Home"}</strong>{address.isDefault && <span className="default-tag">Default</span>}</div><p>{address.houseNo}, {address.street}{address.landmark ? `, ${address.landmark}` : ""}<br/>{address.city}, {address.state} {address.pincode}</p><div className="address-item-actions">{!address.isDefault && <button type="button" onClick={() => makeDefaultAddress(address._id)}>Make default</button>}<Link to={`/account/addresses/${address._id}/edit`}>Edit address</Link></div></article>)}</div> : <div className="empty-address"><p>No delivery address yet.</p><Link to="/account/addresses/new">Add your first address <ArrowRight size={15}/></Link></div>}</section></div></main></div>;
}
