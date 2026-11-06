import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  Ban,
  Download,
  Mail,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import { getImageUrl } from "../utils/imageUrl";
import { getInitials, readAdminUser } from "../utils/admin";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/Admin.css";
import "../styles/AuthFormError.css";

const emptySummary = { total: 0, active: 0, deactivated: 0, verified: 0 };
export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [summary, setSummary] = useState(emptySummary);
  const [confirmUser, setConfirmUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const admin = readAdminUser();
  const limit = 8;
  useAdminErrorToast(pageError, setPageError);

  useEffect(() => {
    if (location.state?.error) setPageError(location.state.error);
  }, [location.state]);
  useEffect(() => {
    let active = true;
    api
      .get("/auth/admin/users", { params: { page, limit, search, status } })
      .then((response) => {
        if (active) {
          setUsers(response.data.users);
          setPagination(response.data.pagination);
        }
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
        } else setPageError(message);
      });
    return () => {
      active = false;
    };
  }, [page, search, status, navigate]);
  useEffect(() => {
    let active = true;
    api
      .get("/auth/admin/customers/summary")
      .then((response) => {
        if (active) setSummary(response.data.summary);
      })
      .catch((error) => {
        if (active) setPageError(getErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [users]);

  function doSearch(event) {
    event.preventDefault();
    setPageError("");
    setPage(1);
    setSearch(query.trim());
  }
  function clearSearch() {
    setPageError("");
    setQuery("");
    setSearch("");
    setPage(1);
  }
  async function confirmToggle() {
    if (!confirmUser) return;
    const nextBlocked = !confirmUser.isBlocked;
    setBusy(true);
    setPageError("");
    try {
      await api.patch(`/auth/admin/users/${confirmUser._id}/block`, {
        isBlocked: nextBlocked,
      });
      setUsers((current) =>
        current.map((user) =>
          user._id === confirmUser._id
            ? { ...user, isBlocked: nextBlocked }
            : user,
        ),
      );
      setSummary((current) => ({
        ...current,
        active: current.active + (nextBlocked ? -1 : 1),
        deactivated: current.deactivated + (nextBlocked ? 1 : -1),
      }));
      toast.success(
        nextBlocked
          ? "Customer account deactivated."
          : "Customer account reactivated.",
        { id: "admin-customer-status" },
      );
      setConfirmUser(null);
    } catch (error) {
      setPageError(getErrorMessage(error));
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
  function exportCsv() {
    const columns = ["name", "email", "phone", "createdAt", "status"];
    const rows = users.map((user) => [
      user.name,
      user.email,
      user.phone || "",
      new Date(user.createdAt).toISOString().slice(0, 10),
      user.isBlocked ? "Deactivated" : "Active",
    ]);
    const csv = [
      columns.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "healthy-bite-customers-page.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const pageCount = Math.max(1, pagination.pages);
  const first = pagination.total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, pagination.total);
  const visiblePages =
    pageCount <= 3
      ? Array.from({ length: pageCount }, (_, index) => index + 1)
      : page <= 2
        ? [1, 2, 3]
        : page >= pageCount - 1
          ? [pageCount - 2, pageCount - 1, pageCount]
          : [page - 1, page, page + 1];

  return (
    <div className="admin-app">
      <AdminSidebar activePage="customers" onLogout={logout} />
      <main className="admin-work">
        <header className="admin-toolbar">
          <form className="admin-global-search" onSubmit={doSearch}>
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search meals, orders, customers, metrics..."
              aria-label="Search customers"
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
        <section className="admin-page">
          <div className="admin-title-row">
            <div>
              <span className="admin-kicker">
                OPERATIONS · CUSTOMER DIRECTORY
              </span>
              <h1>
                Customer Management{" "}
                <span className="title-total">
                  {summary.total.toLocaleString()} Total Customers
                </span>
              </h1>
              <p>
                Manage customer accounts, review profile information, and manage
                operational account statuses.
              </p>
            </div>
            <button className="admin-export" onClick={exportCsv}>
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div className="admin-stats">
            <Stat
              title="Total Customers"
              value={summary.total}
              note="Registered profiles"
              icon={<Users />}
            />
            <Stat
              title="Active Accounts"
              value={summary.active}
              note={`${summary.total ? Math.round((summary.active / summary.total) * 100) : 0}% of customers`}
              icon={<ShieldCheck />}
            />
            <Stat
              title="Deactivated / Inactive"
              value={summary.deactivated}
              note="Blocked from customer features"
              icon={<Ban />}
              tone="red"
            />
            <Stat
              title="Verified Emails"
              value={summary.verified}
              note="Email addresses confirmed"
              icon={<Mail />}
              tone="mint"
            />
          </div>
          <section className="customer-table-card">
            <div className="customer-table-tools">
              <form className="customer-search" onSubmit={doSearch}>
                <Search size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by customer name, email or phone..."
                  aria-label="Search by customer name, email or phone"
                />
                {query && (
                  <button
                    type="button"
                    className="clear-customer-search"
                    aria-label="Clear search"
                    onClick={clearSearch}
                  >
                    ×
                  </button>
                )}
                <button className="customer-search-submit">Search</button>
              </form>
              <div className="customer-tabs">
                {[
                  ["all", `All (${summary.total.toLocaleString()})`],
                  ["active", `Active (${summary.active.toLocaleString()})`],
                  [
                    "deactivated",
                    `Deactivated (${summary.deactivated.toLocaleString()})`,
                  ],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={status === key ? "selected" : ""}
                    onClick={() => {
                      setStatus(key);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="customer-sort">
                <ArrowDownWideNarrow size={15} /> Sort: Most Recent{" "}
                <span>⌄</span>
              </div>
            </div>
            <div className="admin-table-scroll">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>CUSTOMER</th>
                    <th>EMAIL</th>
                    <th>PHONE</th>
                    <th>JOINED DATE</th>
                    <th>TOTAL ORDERS &amp; SPEND</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="directory-person">
                          <div
                            className={`directory-avatar avatar-${getInitials(user.name).charCodeAt(0) % 4}`}
                          >
                            {user.profileImage ? (
                              <img
                                src={getImageUrl(user.profileImage)}
                                alt=""
                              />
                            ) : (
                              getInitials(user.name)
                            )}
                          </div>
                          <div>
                            <b>{user.name}</b>
                            <small>
                              {user.isVerified
                                ? "Verified member"
                                : "Email not verified"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.phone || "—"}</td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <span className="unavailable-data">Not available</span>
                      </td>
                      <td>
                        <span
                          className={`customer-status ${user.isBlocked ? "inactive" : "active"}`}
                        >
                          <i />
                          {user.isBlocked ? "Deactivated" : "Active"}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="view-customer-link"
                          to={`/admin/users/${user._id}`}
                        >
                          View <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!users.length && (
                    <tr>
                      <td colSpan="7" className="admin-empty-row">
                        {search
                          ? "No customers match your search."
                          : "No customers to show."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="customer-table-footer">
              <span>
                Showing{" "}
                <b>
                  {first} to {last}
                </b>{" "}
                of <b>{pagination.total.toLocaleString()}</b> customers
              </span>
              <div className="admin-pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={page === pageNumber ? "page-active" : ""}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                {pageCount > 3 && (
                  <>
                    <span>…</span>
                    <button
                      className={page === pageCount ? "page-active" : ""}
                      onClick={() => setPage(pageCount)}
                    >
                      {pageCount}
                    </button>
                  </>
                )}
                <button
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </section>
        {confirmUser && (
          <div
            className="admin-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setConfirmUser(null);
            }}
          >
            <section
              className="admin-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deactivate-title"
            >
              <button
                className="modal-close"
                onClick={() => setConfirmUser(null)}
                aria-label="Close"
              >
                ×
              </button>
              <div className="deactivate-icon">
                <Ban size={23} />
              </div>
              <h2 id="deactivate-title">
                {confirmUser.isBlocked
                  ? "Reactivate Customer Account?"
                  : "Deactivate Customer Account?"}
              </h2>
              <p>
                {confirmUser.isBlocked
                  ? `Reactivate ${confirmUser.name}'s account? They will regain access to protected customer features.`
                  : `Deactivate ${confirmUser.name}'s account? They won't be able to log in or access customer features.`}
              </p>
              <div className="confirm-details">
                <div>
                  <small>CUSTOMER</small>
                  <b>{confirmUser.name}</b>
                </div>
                <div>
                  <small>EMAIL</small>
                  <b>{confirmUser.email}</b>
                </div>
              </div>
              {!confirmUser.isBlocked && (
                <div className="confirm-warning">
                  <Ban size={16} />
                  <span>
                    The customer will lose access to protected features. Their
                    profile and saved data remain available if you reactivate
                    the account.
                  </span>
                </div>
              )}
              <div className="confirm-actions">
                <button
                  className="cancel-confirm"
                  onClick={() => setConfirmUser(null)}
                >
                  Cancel
                </button>
                <button
                  className="accept-confirm"
                  disabled={busy}
                  onClick={confirmToggle}
                >
                  <Ban size={15} />
                  {busy
                    ? "Updating…"
                    : confirmUser.isBlocked
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
      </main>
    </div>
  );
}

function Stat({ title, value, note, icon, tone = "green" }) {
  return (
    <article className="admin-stat-card">
      <div className="stat-label">
        {title}
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <div className="stat-number">{value.toLocaleString()}</div>
      <small>{note}</small>
    </article>
  );
}
