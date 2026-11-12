import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminPageLayout from "../components/AdminPageLayout";
import AdminCustomerStats from "../components/admin/customers/AdminCustomerStats";
import AdminCustomerTable from "../components/admin/customers/AdminCustomerTable";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/Admin.css";
import "../styles/AuthFormError.css";

const pageSize = 8;
const emptySummary = { total: 0, active: 0, deactivated: 0, verified: 0 };

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [summary, setSummary] = useState(emptySummary);
  const [pageError, setPageError] = useState(location.state?.error || "");
  useAdminErrorToast(pageError, setPageError);

  useEffect(() => {
    let active = true;
    api
      .get("/auth/admin/users", { params: { page, limit: pageSize, search, status } })
      .then((response) => {
        if (!active) return;
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      })
      .catch((error) => {
        if (!active) return;
        const message = getErrorMessage(error);
        if ([401, 403].includes(error.response?.status)) {
          sessionStorage.removeItem("healthyBiteAdmin");
          navigate("/admin/login", { replace: true, state: { error: message } });
        } else setPageError(message);
      });
    return () => { active = false; };
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
    return () => { active = false; };
  }, [users]);

  function submitSearch(event) {
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

  function exportCustomersCsv() {
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
      ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "healthy-bite-customers-page.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminPageLayout
      activePage="customers"
      toolbarProps={{
        searchValue: query,
        onSearchChange: setQuery,
        onSearchSubmit: submitSearch,
        searchAriaLabel: "Search customers",
      }}
    >
      <section className="admin-page">
        <AdminPageHeader
          kicker="OPERATIONS · CUSTOMER DIRECTORY"
          title={(
            <>
              Customer Management{" "}
              <span className="title-total">{summary.total.toLocaleString()} Total Customers</span>
            </>
          )}
          description="Manage customer accounts, review profile information, and manage operational account statuses."
          action={<button className="admin-export" onClick={exportCustomersCsv}><Download size={16} /> Export CSV</button>}
        />
        <AdminCustomerStats summary={summary} />
        <AdminCustomerTable
          users={users}
          query={query}
          search={search}
          onQueryChange={setQuery}
          onSearch={submitSearch}
          onClearSearch={clearSearch}
          status={status}
          onStatusChange={(nextStatus) => { setStatus(nextStatus); setPage(1); }}
          summary={summary}
          page={page}
          pagination={pagination}
          limit={pageSize}
          onPageChange={setPage}
        />
      </section>
    </AdminPageLayout>
  );
}
