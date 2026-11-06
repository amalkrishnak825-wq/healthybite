import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarDays,
  CircleUserRound,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import { getImageUrl } from "../utils/imageUrl";
import { getInitials, readAdminUser } from "../utils/admin";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/Admin.css";
import "../styles/AdminEdit.css";
import "../styles/AuthFormError.css";

export default function AdminCustomerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const admin = readAdminUser();
  useAdminErrorToast(pageError, setPageError);
  useEffect(() => {
    let active = true;
    api
      .get(`/auth/admin/users/${id}`)
      .then((response) => {
        if (active) setCustomer(response.data.customer);
      })
      .catch((error) => {
        if (!active) return;
        const message = getErrorMessage(error);
        if ([401, 403].includes(error.response?.status)) {
          sessionStorage.removeItem("healthyBiteAdmin");
          navigate("/admin/login", {
            replace: true,
            state: { error: message },
          });
        } else
          navigate("/admin/users", {
            replace: true,
            state: { error: message },
          });
      });
    return () => {
      active = false;
    };
  }, [id, navigate]);
  async function logout() {
    try {
      await api.post("/auth/admin/logout");
    } finally {
      sessionStorage.removeItem("healthyBiteAdmin");
      sessionStorage.removeItem("healthyBiteAdminUser");
      navigate("/admin/login");
    }
  }
  async function toggleStatus() {
    if (!customer) return;
    setBusy(true);
    setPageError("");
    try {
      const next = !customer.isBlocked;
      await api.patch(`/auth/admin/users/${id}/block`, { isBlocked: next });
      setCustomer({ ...customer, isBlocked: next });
      setConfirm(false);
      toast.success(
        next
          ? "Customer account deactivated."
          : "Customer account reactivated.",
        { id: "admin-customer-status" },
      );
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function saveCustomer(event) {
    event.preventDefault();
    setBusy(true);
    setPageError("");
    try {
      const response = await api.patch(`/auth/admin/users/${id}`, editForm);
      setCustomer((current) => ({ ...current, ...response.data.customer }));
      setEditing(false);
      toast.success("Customer profile updated.", {
        id: "admin-customer-profile-saved",
      });
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (!customer)
    return <div className="admin-loading">Loading customer profile…</div>;
  const address = customer.address;
  return (
    <div className="admin-app">
      <AdminSidebar activePage="customers" onLogout={logout} />
      <main className="admin-work">
        <header className="admin-toolbar">
          <form
            className="admin-global-search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate("/admin/users");
            }}
          >
            <span className="admin-search-placeholder">
              Search meals, orders, customers, metrics...
            </span>
          </form>
          <div className="admin-profile">
            <div className="admin-profile-avatar" aria-label="Admin profile">
              {getInitials(admin.email || admin.name)}
            </div>
          </div>
        </header>
        <section className="customer-detail-page">
          <div className="detail-breadcrumb">
            <Link to="/admin/users">
              <ArrowLeft size={16} /> Back to Customers
            </Link>
            <span>/</span>
            <b>CUSTOMER PROFILE</b>
            <div className="detail-actions">
              <a className="detail-email" href={`mailto:${customer.email}`}>
                <Mail size={16} /> Send Email
              </a>
              <button
                className="detail-edit"
                onClick={() => {
                  setEditForm({
                    name: customer.name,
                    phone: customer.phone || "",
                  });
                  setEditing(true);
                }}
              >
                <span>✎</span> Edit Customer
              </button>
            </div>
          </div>
          <section className="customer-identity-card">
            <div className="large-customer-photo">
              {customer.profileImage ? (
                <img src={getImageUrl(customer.profileImage)} alt="" />
              ) : (
                getInitials(customer.name)
              )}
            </div>
            <div className="identity-copy">
              <div className="identity-title">
                <h1>{customer.name}</h1>
                <span className="customer-id">
                  #{String(customer._id).slice(-8).toUpperCase()}
                </span>
              </div>
              <span
                className={`customer-status ${customer.isBlocked ? "inactive" : "active"}`}
              >
                <i />
                {customer.isBlocked ? "Deactivated" : "Active"}
              </span>
              <p>
                <MapPin size={15} />
                {address
                  ? `${address.city}, ${address.state}`
                  : "Delivery address not on file"}{" "}
                <span>•</span> Registered{" "}
                {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              className={`identity-deactivate ${customer.isBlocked ? "reactivate" : ""}`}
              onClick={() => setConfirm(true)}
            >
              <Ban size={15} />
              {customer.isBlocked ? "Reactivate Account" : "Deactivate Account"}
            </button>
          </section>
          <div className="customer-metric-grid">
            <Metric
              icon={<ShoppingBag />}
              label="TOTAL ORDERS"
              value="Not available"
              hint="Order history is not connected"
            />
            <Metric
              icon={<span className="rupee-sign">₹</span>}
              label="TOTAL SPENT"
              value="Not available"
              hint="Order history is not connected"
            />
            <Metric
              icon={<CalendarDays />}
              label="ACCOUNT STATUS"
              value={
                customer.isVerified ? "Email verified" : "Email unverified"
              }
              hint={`Joined ${new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
            />
          </div>
          <div className="customer-detail-columns">
            <section className="detail-panel">
              <div className="detail-panel-head">
                <h2>
                  <CircleIcon />
                  <span>Customer Details</span>
                </h2>
                <small>Profile info</small>
              </div>
              <Detail
                label="EMAIL ADDRESS"
                icon={<Mail size={15} />}
                value={customer.email}
              />
              <Detail
                label="PHONE NUMBER"
                icon={<Phone size={15} />}
                value={customer.phone || "Not provided"}
              />
              <Detail
                label="DELIVERY ADDRESS"
                icon={<MapPin size={15} />}
                value={
                  address
                    ? `${address.houseNo}, ${address.street}${address.landmark ? `, ${address.landmark}` : ""}, ${address.city}, ${address.state} ${address.pincode}`
                    : "No delivery address saved"
                }
              />
              <div className="detail-field">
                <span>DIETARY PREFERENCE</span>
                <p className="muted-info">Not provided</p>
              </div>
              <div className="detail-field">
                <span>ALLERGIES &amp; RESTRICTIONS</span>
                <p className="muted-info">Not provided</p>
              </div>
              <div className="joined-line">
                <span>Customer Joined</span>
                <b>
                  {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </b>
              </div>
            </section>
            <section className="detail-panel orders-panel">
              <div className="detail-panel-head">
                <h2>
                  <ClipboardList size={18} />
                  <span>Recent Orders</span>
                </h2>
                <small>Order service unavailable</small>
              </div>
              <div className="no-orders">
                <ShoppingBag size={24} />
                <b>Order history isn’t connected yet</b>
                <p>
                  Customer orders will appear here when the ordering service is
                  available.
                </p>
              </div>
              <div className="order-panel-foot">
                <span>Order details unavailable</span>
                <span>
                  View All Orders <ArrowRight size={15} />
                </span>
              </div>
            </section>
          </div>
        </section>
      </main>
      {editing && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(false);
          }}
        >
          <form
            className="admin-confirm-modal edit-customer-modal"
            onSubmit={saveCustomer}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setEditing(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2>Edit Customer</h2>
            <p>Update the customer’s name or contact number.</p>
            <label>
              Full name
              <input
                required
                minLength="2"
                maxLength="50"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm({ ...editForm, name: event.target.value })
                }
              />
            </label>
            <label>
              Phone number
              <input
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number"
                inputMode="numeric"
                maxLength="10"
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
            </label>
            <div className="confirm-actions">
              <button
                type="button"
                className="cancel-confirm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button className="detail-edit" disabled={busy}>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
      {confirm && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirm(false);
          }}
        >
          <section
            className="admin-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-deactivate-title"
          >
            <button
              className="modal-close"
              onClick={() => setConfirm(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="deactivate-icon">
              <Ban size={23} />
            </div>
            <h2 id="detail-deactivate-title">
              {customer.isBlocked
                ? "Reactivate Customer Account?"
                : "Deactivate Customer Account?"}
            </h2>
            <p>
              {customer.isBlocked
                ? `Reactivate ${customer.name}'s account? They will regain access to protected customer features.`
                : `Deactivate ${customer.name}'s account? They won't be able to log in or access customer features.`}
            </p>
            <div className="confirm-details">
              <div>
                <small>CUSTOMER</small>
                <b>{customer.name}</b>
              </div>
              <div>
                <small>EMAIL</small>
                <b>{customer.email}</b>
              </div>
            </div>
            {!customer.isBlocked && (
              <div className="confirm-warning">
                <Ban size={16} />
                <span>
                  The customer will lose access to protected features. Their
                  profile and saved data remain available if you reactivate the
                  account.
                </span>
              </div>
            )}
            <div className="confirm-actions">
              <button
                className="cancel-confirm"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="accept-confirm"
                disabled={busy}
                onClick={toggleStatus}
              >
                <Ban size={15} />
                {busy
                  ? "Updating…"
                  : customer.isBlocked
                    ? "Yes, Reactivate Account"
                    : "Yes, Deactivate Account"}
              </button>
            </div>
            <small className="confirm-footnote">
              You can reactivate this customer profile anytime from the
              Deactivated filter.
            </small>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, hint }) {
  return (
    <article className="customer-metric">
      <div className="metric-heading">
        {label}
        <span>{icon}</span>
      </div>
      <b>{value}</b>
      <small>{hint}</small>
    </article>
  );
}
function Detail({ label, icon, value }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <p>
        {icon}
        {value}
      </p>
    </div>
  );
}
function CircleIcon() {
  return <CircleUserRound size={18} />;
}
