import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  ClipboardList,
  Heart,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import ActionConfirmation from "../components/ActionConfirmation";
import "../styles/AppPages.css";
import "../styles/ProfileGuest.css";
import "../styles/AuthFormError.css";

export default function AccountPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState([]);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [addressToDelete, setAddressToDelete] = useState(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 1000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    api
      .get("/profile/me")
      .then((response) => {
        if (active) setUser(response.data.user ?? response.data);
      })
      .catch(() => {});
    api
      .get("/addresses")
      .then((response) => {
        if (active) setAddresses(response.data.addresses || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id, setUser]);
  async function makeDefaultAddress(addressId) {
    try {
      await api.patch(`/addresses/${addressId}`, { isDefault: true });
      setAddresses((current) =>
        current.map((address) => ({
          ...address,
          isDefault: address._id === addressId,
        })),
      );
      setNotice("Default address updated.");
    } catch {
      setNotice("Could not update the default address. Please try again.");
    }
  }
  async function removeAddress(addressId) {
    setDeletingAddressId(addressId);
    try {
      await api.delete(`/addresses/${addressId}`);
      const response = await api.get("/addresses");
      setAddresses(response.data.addresses || []);
      setNotice("Address deleted.");
    } catch {
      setNotice("Could not delete this address. Please try again.");
    } finally {
      setDeletingAddressId(null);
      setAddressToDelete(null);
    }
  }
  async function signOut() {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }
  if (!user)
    return (
      <AuthLayout className="profile-logged-out">
        <>
          <div className="profile-breadcrumb">
            <Link to="/">⌂ Home</Link>
            <span>/</span>
            <b>Account Profile</b>
          </div>
          <section className="profile-access-card">
            <div className="centered-auth-icon">
              <UserRound />
            </div>
            <span className="auth-eyebrow">MEMBER ACCESS</span>
            <h1>Sign in to your account</h1>
            <p>
              Log in or create a HealthyBite account to access your personal
              profile and verified credentials.
            </p>
            <div className="profile-access-actions">
              <Link className="auth-button" to="/login">
                <ArrowRight size={15} /> Sign In
              </Link>
              <Link className="create-account-button" to="/register">
                <UserRound size={16} /> Create Account
              </Link>
            </div>
            <Link className="auth-back-link" to="/">
              <ArrowLeft size={14} /> Return to Home
            </Link>
          </section>
        </>
      </AuthLayout>
    );

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand-logo">
          <span className="brand-symbol">
            <img className="brand-mark-image" src="/healthybite-mark.png" alt="" />
          </span>{" "}
          HealthyBite
        </Link>
        <nav>
          <Link to="/">Home</Link>
          <Link
            className="active account-active"
            to="/account"
            aria-current="page"
          >
            My account
          </Link>
          <button className="text-button account-logout" onClick={signOut}>
            Log out
          </button>
        </nav>
      </header>
      <main className="account-wrap">
        {notice && (
          <div className="auth-form-success" role="status">
            <CircleCheck size={17} />
            <span>{notice}</span>
          </div>
        )}
        <section className="account-hero">
          <div className="account-intro">
            <div className="eyebrow">YOUR HEALTHYBITE</div>
            <h1>Good to see you, {user.name?.split(" ")[0] || "there"}.</h1>
            <p className="muted">Manage your profile and delivery details.</p>
          </div>
          <nav className="account-shortcuts" aria-label="Your account links">
            <Link to="/orders">
              <span className="account-shortcut-icon">
                <ClipboardList size={19} />
              </span>
              <span className="account-shortcut-copy">
                <strong>My Orders</strong>
                <small>Track and review your orders</small>
              </span>
              <ArrowRight size={17} />
            </Link>
            <Link to="/wishlist">
              <span className="account-shortcut-icon">
                <Heart size={19} />
              </span>
              <span className="account-shortcut-copy">
                <strong>Wishlist</strong>
                <small>Meals you saved for later</small>
              </span>
              <ArrowRight size={17} />
            </Link>
            <Link to="/wallet">
              <span className="account-shortcut-icon"><Wallet size={19} /></span>
              <span className="account-shortcut-copy"><strong>My Wallet</strong><small>Balance and return refunds</small></span>
              <ArrowRight size={17} />
            </Link>
          </nav>
        </section>
        <div className="account-grid">
          <section className="panel profile-card">
            <div className="panel-top">
              <div className="avatar">
                {user.profileImage ? (
                  <img src={getImageUrl(user.profileImage)} alt="Profile" />
                ) : (
                  <UserRound />
                )}
              </div>
              <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="info-line">
              <span>Phone</span>
              <b>{user.phone || "Add a phone number"}</b>
            </div>
            <div className="info-line">
              <span>Email status</span>
              <b className="status-green">Verified</b>
            </div>
            <Link className="outline-button" to="/account/profile">
              Edit profile <ArrowRight size={16} />
            </Link>
          </section>
          <section className="panel address-card">
            <div className="section-heading">
              <div>
                <div className="icon-tile">
                  <MapPin size={19} />
                </div>
                <h2>Saved addresses</h2>
              </div>
              <Link className="icon-action" to="/account/addresses/new">
                <Plus size={19} />
                <span>Add</span>
              </Link>
            </div>
            {addresses.length ? (
              <div className="address-list">
                {addresses.map((address) => (
                  <article className="address-item" key={address._id}>
                    <div>
                      <strong>{address.type || "Home"}</strong>
                      {address.isDefault && (
                        <span className="default-tag">Default</span>
                      )}
                    </div>
                    <p>
                      {address.houseNo}, {address.street}
                      {address.landmark ? `, ${address.landmark}` : ""}
                      <br />
                      {address.city}, {address.state} {address.pincode}
                    </p>
                    <div className="address-item-actions">
                      {!address.isDefault && (
                        <button
                          type="button"
                          onClick={() => makeDefaultAddress(address._id)}
                        >
                          Make default
                        </button>
                      )}
                      <Link
                        className="address-edit-button"
                        to={`/account/addresses/${address._id}/edit`}
                      >
                        <Pencil size={13} /> Edit
                      </Link>
                      <button
                        className="address-delete-button"
                        type="button"
                        onClick={() => setAddressToDelete(address)}
                        disabled={deletingAddressId === address._id}
                      >
                        <Trash2 size={13} />
                        {deletingAddressId === address._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-address">
                <p>No delivery address yet.</p>
                <Link to="/account/addresses/new">
                  Add your first address <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
      <ActionConfirmation
        open={Boolean(addressToDelete)}
        title="Delete this address?"
        message={
          addressToDelete
            ? `Are you sure you want to delete your ${addressToDelete.type || "saved"} address? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete address"
        busy={Boolean(deletingAddressId)}
        variant="danger"
        onCancel={() => setAddressToDelete(null)}
        onConfirm={() => removeAddress(addressToDelete._id)}
      />
    </div>
  );
}
