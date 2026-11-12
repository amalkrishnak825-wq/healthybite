import { useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../api/axios";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminPageLayout from "../components/AdminPageLayout";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/AdminOperations.css";

const emptyForm = { code: "", discountType: "percent", discountValue: "10", minimumSubtotal: "0", maximumDiscount: "", maxUsesPerUser: "", expiresAt: "" };
const toDateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useAdminErrorToast(error, setError);

  async function loadCoupons() {
    try {
      const response = await api.get("/admin/coupons");
      setCoupons(response.data.coupons || []);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api
      .get("/admin/coupons")
      .then((response) => {
        if (active) setCoupons(response.data.coupons || []);
      })
      .catch((failure) => {
        if (active) setError(getErrorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setEditing(false);
    setForm(emptyForm);
  }
  function openEdit(coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minimumSubtotal: String(coupon.minimumSubtotal || 0),
      maximumDiscount: coupon.maximumDiscount == null ? "" : String(coupon.maximumDiscount),
      maxUsesPerUser: coupon.maxUsesPerUser == null ? "" : String(coupon.maxUsesPerUser),
      expiresAt: toDateInput(coupon.expiresAt),
    });
  }
  async function saveCoupon(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      discountValue: Number(form.discountValue),
      minimumSubtotal: Number(form.minimumSubtotal),
      maximumDiscount: form.maximumDiscount === "" ? null : Number(form.maximumDiscount),
      maxUsesPerUser: form.maxUsesPerUser === "" ? null : Number(form.maxUsesPerUser),
      expiresAt: form.expiresAt || null,
    };
    try {
      if (editing) await api.patch(`/admin/coupons/${editing._id}`, payload);
      else await api.post("/admin/coupons", payload);
      toast.success(editing ? "Coupon updated." : "Coupon created.");
      setEditing(null);
      await loadCoupons();
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function toggleCoupon(coupon) {
    try {
      const response = await api.patch(`/admin/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      setCoupons((current) => current.map((item) => item._id === coupon._id ? response.data.coupon : item));
      toast.success(response.data.coupon.isActive ? "Coupon activated." : "Coupon deactivated.");
    } catch (failure) {
      setError(getErrorMessage(failure));
    }
  }
  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  return (
    <AdminPageLayout activePage="coupons">
      <section className="admin-page operations-page">
        <AdminPageHeader
          kicker="PROMOTIONS"
          title="Coupons"
          description="Create and manage coupon codes used by customers during checkout."
          action={<button type="button" className="admin-export" onClick={openCreate}><Plus size={16} /> Add Coupon</button>}
        />
        <div className="operations-stats"><article><span>All coupons</span><b>{coupons.length}</b></article><article><span>Active coupons</span><b>{coupons.filter((coupon) => coupon.isActive).length}</b></article></div>
        <div className="operations-table-wrap">
          <table className="operations-table"><thead><tr><th>Code</th><th>Offer</th><th>Used</th><th>User limit</th><th>Minimum order</th><th>Maximum discount</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {coupons.map((coupon) => <tr key={coupon._id}>
                <td><b className="coupon-code"><Tag size={14} /> {coupon.code}</b></td>
                <td>{coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `₹${coupon.discountValue} off`}</td>
                <td>{coupon.usageCount || 0} orders</td>
                <td>{coupon.maxUsesPerUser == null ? "No limit" : `${coupon.maxUsesPerUser} per customer`}</td>
                <td>₹{Number(coupon.minimumSubtotal || 0).toFixed(2)}</td>
                <td>{coupon.maximumDiscount == null ? "No limit" : `₹${Number(coupon.maximumDiscount).toFixed(2)}`}</td>
                <td>{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "No expiry"}</td>
                <td><span className={`operation-pill ${coupon.isActive ? "active" : "inactive"}`}>{coupon.isActive ? "Active" : "Inactive"}</span></td>
                <td><div className="operation-actions"><button type="button" onClick={() => openEdit(coupon)}>Edit</button><button type="button" className={coupon.isActive ? "deactivate" : "activate"} onClick={() => toggleCoupon(coupon)}>{coupon.isActive ? "Deactivate" : "Activate"}</button></div></td>
              </tr>)}
              {!loading && !coupons.length && <tr><td colSpan="9" className="operations-empty">No coupons yet. Add a coupon to make it available at checkout.</td></tr>}
              {loading && <tr><td colSpan="9" className="operations-empty">Loading coupons…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {editing !== null && (
        <div className="operation-modal-backdrop" onClick={() => setEditing(null)}>
          <form className="operation-modal coupon-modal" onSubmit={saveCoupon} role="dialog" aria-modal="true" aria-labelledby="coupon-form-title" onClick={(event) => event.stopPropagation()}>
            <header><div><span className="admin-kicker">COUPON RULES</span><h2 id="coupon-form-title">{editing ? "Edit coupon" : "Create coupon"}</h2></div></header>
            <label>Coupon code<input required minLength="3" maxLength="24" value={form.code} onChange={(event) => setField("code", event.target.value.toUpperCase())} placeholder="e.g. FRESH15" /></label>
            <div className="coupon-form-row"><label>Discount type<select value={form.discountType} onChange={(event) => setField("discountType", event.target.value)}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label><label>Discount value<input required type="number" min="0.01" step="0.01" max={form.discountType === "percent" ? "100" : undefined} value={form.discountValue} onChange={(event) => setField("discountValue", event.target.value)} /></label></div>
            <div className="coupon-form-row"><label>Minimum order (₹)<input type="number" min="0" step="0.01" value={form.minimumSubtotal} onChange={(event) => setField("minimumSubtotal", event.target.value)} /></label><label>Maximum discount (₹)<input type="number" min="0.01" step="0.01" value={form.maximumDiscount} onChange={(event) => setField("maximumDiscount", event.target.value)} placeholder="No limit" /></label></div>
            <label>Maximum uses per customer (optional)<input type="number" min="1" step="1" value={form.maxUsesPerUser} onChange={(event) => setField("maxUsesPerUser", event.target.value)} placeholder="No limit" /></label>
            <label>Expiry date (optional)<input type="date" value={form.expiresAt} onChange={(event) => setField("expiresAt", event.target.value)} /></label>
            <div className="operation-modal-actions"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create coupon"}</button></div>
          </form>
        </div>
      )}
    </AdminPageLayout>
  );
}
