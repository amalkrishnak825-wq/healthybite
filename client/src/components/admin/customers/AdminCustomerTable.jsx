import { ArrowDownWideNarrow, Search } from "lucide-react";
import { Link } from "react-router-dom";
import AdminPagination from "../../AdminPagination";
import { getImageUrl } from "../../../utils/imageUrl";
import { getInitials } from "../../../utils/admin";

const statusFilters = [
  { key: "all", summaryKey: "total", label: "All" },
  { key: "active", summaryKey: "active", label: "Active" },
  { key: "deactivated", summaryKey: "deactivated", label: "Deactivated" },
];

function CustomerRow({ user }) {
  const joinedDate = new Date(user.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <tr>
      <td>
        <div className="directory-person">
          <div className={`directory-avatar avatar-${getInitials(user.name).charCodeAt(0) % 4}`}>
            {user.profileImage ? <img src={getImageUrl(user.profileImage)} alt="" /> : getInitials(user.name)}
          </div>
          <div>
            <b>{user.name}</b>
            <small>{user.isVerified ? "Verified member" : "Email not verified"}</small>
          </div>
        </div>
      </td>
      <td>{user.email}</td>
      <td>{user.phone || "—"}</td>
      <td>{joinedDate}</td>
      <td><span className="unavailable-data">Not available</span></td>
      <td>
        <span className={`customer-status ${user.isBlocked ? "inactive" : "active"}`}>
          <i />{user.isBlocked ? "Deactivated" : "Active"}
        </span>
      </td>
      <td>
        <Link className="view-customer-link" to={`/admin/users/${user._id}`}>
          View <span>→</span>
        </Link>
      </td>
    </tr>
  );
}

export default function AdminCustomerTable({
  users,
  query,
  search,
  onQueryChange,
  onSearch,
  onClearSearch,
  status,
  onStatusChange,
  summary,
  page,
  pagination,
  limit,
  onPageChange,
}) {
  return (
    <section className="customer-table-card">
      <div className="customer-table-tools">
        <form className="customer-search" onSubmit={onSearch}>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by customer name, email or phone..."
            aria-label="Search by customer name, email or phone"
          />
          {query && (
            <button type="button" className="clear-customer-search" aria-label="Clear search" onClick={onClearSearch}>
              ×
            </button>
          )}
          <button className="customer-search-submit">Search</button>
        </form>
        <div className="customer-tabs" aria-label="Filter customers by account status">
          {statusFilters.map(({ key, summaryKey, label }) => (
            <button
              key={key}
              type="button"
              className={status === key ? "selected" : ""}
              aria-pressed={status === key}
              onClick={() => onStatusChange(key)}
            >
              {label} ({Number(summary[summaryKey] || 0).toLocaleString()})
            </button>
          ))}
        </div>
        <div className="customer-sort">
          <ArrowDownWideNarrow size={15} /> Sort: Most Recent <span>⌄</span>
        </div>
      </div>

      <div className="admin-table-scroll">
        <table className="customer-table">
          <thead>
            <tr>
              <th>CUSTOMER</th><th>EMAIL</th><th>PHONE</th><th>JOINED DATE</th>
              <th>TOTAL ORDERS &amp; SPEND</th><th>STATUS</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => <CustomerRow key={user._id} user={user} />)}
            {!users.length && (
              <tr>
                <td colSpan="7" className="admin-empty-row">
                  {search ? "No customers match your search." : "No customers to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={page}
        pages={pagination.pages}
        total={pagination.total}
        pageSize={limit}
        onPageChange={onPageChange}
        numbered
        as="footer"
        footerClassName="customer-table-footer"
        controlsClassName="admin-pagination"
        summary={(
          <>
            Showing <b>{pagination.total ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, pagination.total)}</b>
            {" "}of <b>{Number(pagination.total || 0).toLocaleString()}</b> customers
          </>
        )}
      />
    </section>
  );
}
