import { Search } from "lucide-react";
import { getInitials, readAdminUser } from "../utils/admin";

export default function AdminToolbar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchLabel = "Search meals, orders, customers, metrics...",
  searchAriaLabel = "Search admin workspace",
}) {
  const admin = readAdminUser();

  return (
    <header className="admin-toolbar">
      {onSearchSubmit ? (
        <form className="admin-global-search" onSubmit={onSearchSubmit}>
          <Search size={17} />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchLabel}
            aria-label={searchAriaLabel}
          />
          <button type="submit" aria-label="Search">
            <Search size={15} />
          </button>
        </form>
      ) : (
        <div className="admin-global-search" aria-label={searchAriaLabel}>
          <Search size={17} />
          <span className="admin-search-placeholder">{searchLabel}</span>
        </div>
      )}
      <div className="admin-profile">
        <div className="admin-profile-avatar" aria-label="Admin profile">
          {getInitials(admin.email || admin.name || "Admin")}
        </div>
      </div>
    </header>
  );
}
