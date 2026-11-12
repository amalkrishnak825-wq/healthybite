import { useEffect, useState } from "react";
import { Eye, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminPageLayout from "../components/AdminPageLayout";
import AdminPagination from "../components/AdminPagination";
import ActionConfirmation from "../components/ActionConfirmation";
import OrderStatusBadge from "../components/OrderStatusBadge";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/AdminOperations.css";

const pageSize = 8;
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const dateLabel = (value) => new Date(value).toLocaleString();

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmReturnAcceptance, setConfirmReturnAcceptance] = useState(false);
  const [acceptingReturn, setAcceptingReturn] = useState(false);
  const [confirmDelivery, setConfirmDelivery] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [confirmOutForDelivery, setConfirmOutForDelivery] = useState(false);
  const [markingOutForDelivery, setMarkingOutForDelivery] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [summary, setSummary] = useState({ totalOrders: 0, revenue: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useAdminErrorToast(error, setError);

  useEffect(() => {
    let active = true;
    api
      .get("/orders/admin", { params: { page, limit: pageSize, search, status } })
      .then((response) => {
        if (!active) return;
        setOrders(response.data.orders || []);
        setPagination(response.data.pagination || { pages: 1, total: 0 });
        setSummary(response.data.summary || { totalOrders: 0, revenue: 0 });
      })
      .catch((failure) => {
        if (!active) return;
        if ([401, 403].includes(failure.response?.status)) {
          sessionStorage.removeItem("healthyBiteAdmin");
          navigate("/admin/login", { replace: true, state: { error: getErrorMessage(failure) } });
        } else setError(getErrorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [navigate, page, search, status]);

  async function showOrder(orderId) {
    try {
      const response = await api.get(`/orders/admin/${orderId}`);
      setSelectedOrder(response.data.order);
    } catch (failure) {
      setError(getErrorMessage(failure));
    }
  }

  async function acceptReturn() {
    if (!selectedOrder) return;
    setAcceptingReturn(true);
    try {
      const response = await api.patch(`/orders/admin/${selectedOrder._id}/return/accept`);
      const acceptedOrder = response.data.order;
      setSelectedOrder(acceptedOrder);
      setOrders((current) => current.map((order) => order._id === acceptedOrder._id ? { ...order, ...acceptedOrder } : order));
      setConfirmReturnAcceptance(false);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setAcceptingReturn(false);
    }
  }

  async function markDelivered() {
    if (!selectedOrder) return;
    setMarkingDelivered(true);
    try {
      const response = await api.patch(`/orders/admin/${selectedOrder._id}/deliver`);
      const deliveredOrder = response.data.order;
      setSelectedOrder(deliveredOrder);
      setOrders((current) => current.map((order) => order._id === deliveredOrder._id ? { ...order, ...deliveredOrder } : order));
      setConfirmDelivery(false);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setMarkingDelivered(false);
    }
  }

  async function markOutForDelivery() {
    if (!selectedOrder) return;
    setMarkingOutForDelivery(true);
    try {
      const response = await api.patch(`/orders/admin/${selectedOrder._id}/out-for-delivery`);
      const updatedOrder = response.data.order;
      setSelectedOrder(updatedOrder);
      setOrders((current) => current.map((order) => order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order));
      setConfirmOutForDelivery(false);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setMarkingOutForDelivery(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  }

  return (
    <AdminPageLayout activePage="orders">
      <section className="admin-page operations-page">
        <AdminPageHeader
          kicker="FULFILLMENT"
          title="Orders"
          description="Review customer orders, item details, delivery addresses, and payment status."
        />
        <div className="operations-stats">
          <article><span>All orders</span><b>{summary.totalOrders}</b></article>
          <article><span>Collected revenue</span><b>{money(summary.revenue)}</b><small>Online and wallet payments, plus delivered COD orders</small></article>
        </div>
        <div className="operations-tools">
          <form className="operations-search" onSubmit={submitSearch}>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order ID, customer, or email" aria-label="Search orders" />
            <button type="submit">Search</button>
          </form>
          <select aria-label="Filter by order status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="placed">Order Placed</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="awaiting_payment">Awaiting payment</option>
            <option value="payment_failed">Payment failed</option>
            <option value="delivered">Delivered</option>
            <option value="return_requested">Return requested</option>
            <option value="return_accepted">Return accepted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="operations-table-wrap">
          <table className="operations-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td><b>#{order._id.slice(-8).toUpperCase()}</b></td>
                  <td><b>{order.user?.name || order.address?.fullName || "Customer"}</b><small>{order.user?.email || order.address?.phone || ""}</small></td>
                  <td>{dateLabel(order.createdAt)}</td>
                  <td><b>{money(order.pricing?.total)}</b></td>
                  <td><span className={`operation-pill ${order.status === "return_accepted" ? "return_accepted" : order.paymentStatus}`}>{order.status === "return_accepted" ? "Refunded to Wallet" : order.paymentMethod === "cod" ? "Cash on Delivery" : `${order.paymentMethod === "wallet" ? "Wallet" : "Razorpay"} · ${order.paymentStatus}`}</span></td>
                  <td><OrderStatusBadge order={order} variant="admin" /></td>
                  <td><button className="operation-icon-button" type="button" onClick={() => showOrder(order._id)} aria-label={`View order ${order._id}`}><Eye size={16} /></button></td>
                </tr>
              ))}
              {!loading && !orders.length && <tr><td colSpan="7" className="operations-empty">No orders match this search.</td></tr>}
              {loading && <tr><td colSpan="7" className="operations-empty">Loading orders…</td></tr>}
            </tbody>
          </table>
          <AdminPagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            label="orders"
            footerClassName="operations-pagination"
          />
        </div>
      </section>
      {selectedOrder && (
        <div className="operation-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <section className="operation-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title" onClick={(event) => event.stopPropagation()}>
            <header><div><span className="admin-kicker">ORDER DETAILS</span><h2 id="order-detail-title">#{selectedOrder._id.slice(-8).toUpperCase()}</h2></div><button className="operation-icon-button" onClick={() => setSelectedOrder(null)} aria-label="Close order details"><X size={18} /></button></header>
            <div className="operation-detail-grid"><span>Customer<b>{selectedOrder.user?.name || selectedOrder.address?.fullName}</b></span><span>Email<b>{selectedOrder.user?.email || "—"}</b></span><span>Placed<b>{dateLabel(selectedOrder.createdAt)}</b></span><span>Payment<b>{selectedOrder.walletAppliedAmount > 0 && selectedOrder.cashDueAmount > 0 ? "Wallet + Cash on Delivery" : selectedOrder.paymentMethod === "wallet" ? "HealthyBite Wallet" : selectedOrder.paymentMethod} · {selectedOrder.paymentStatus}</b></span><span>Order status<b><OrderStatusBadge order={selectedOrder} variant="admin" /></b></span></div>
            {selectedOrder.walletAppliedAmount > 0 && <div className="operation-total">Wallet used <b>₹{Number(selectedOrder.walletAppliedAmount).toFixed(2)}</b>{selectedOrder.cashDueAmount > 0 && <> · COD due <b>₹{Number(selectedOrder.cashDueAmount).toFixed(2)}</b></>}</div>}
            {selectedOrder.returnRequest?.refundAmount > 0 && <div className="operation-total">Wallet refund <b>₹{Number(selectedOrder.returnRequest.refundAmount).toFixed(2)}</b></div>}
            <h3>Items</h3>
            <div className="operation-order-items">{selectedOrder.items.map((item, index) => <div key={`${item.product}-${index}`}><span>{item.name} <small>× {item.quantity}</small></span><b>{money(item.lineTotal)}</b></div>)}</div>
            {selectedOrder.returnRequest && <section className="operation-return-details"><h3>Return request</h3><div>{selectedOrder.returnRequest.items?.map((item, index) => <span key={`${item.orderItemIndex}-${index}`}>{item.name} · Qty {item.quantity}</span>)}</div><p><b>Reason:</b> {selectedOrder.returnRequest.reason || "No reason provided"}</p><small>Status: {selectedOrder.returnRequest.status || "Pending"}</small></section>}
            <div className="operation-address"><b>Delivery address</b><span>{selectedOrder.address.fullName} · {selectedOrder.address.phone}</span><span>{selectedOrder.address.houseNo}, {selectedOrder.address.street}{selectedOrder.address.landmark ? `, ${selectedOrder.address.landmark}` : ""}, {selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.pincode}</span></div>
            <div className="operation-total">Total payable <b>{money(selectedOrder.pricing.total)}</b></div>
            {selectedOrder.status === "placed" && ["paid", "not_required"].includes(selectedOrder.paymentStatus) && <button className="operation-mark-delivered" type="button" onClick={() => setConfirmOutForDelivery(true)}>Mark Out for Delivery</button>}
            {selectedOrder.status === "out_for_delivery" && ["paid", "not_required"].includes(selectedOrder.paymentStatus) && <button className="operation-mark-delivered" type="button" onClick={() => setConfirmDelivery(true)}>Mark Delivered</button>}
            {selectedOrder.status === "return_requested" && <button className="operation-accept-return" type="button" onClick={() => setConfirmReturnAcceptance(true)}>Accept return request</button>}
            {selectedOrder.status === "return_accepted" && <p className="operation-return-accepted" role="status">{selectedOrder.returnRequest?.refundAmount != null ? `Return accepted. ₹${Number(selectedOrder.returnRequest.refundAmount).toFixed(2)} was credited to the customer’s wallet.` : "Return request accepted."}</p>}
          </section>
        </div>
      )}
      <ActionConfirmation
        open={confirmReturnAcceptance}
        title="Accept return request?"
        message="This will mark the return request as accepted and update the customer’s order status."
        confirmLabel="Accept return"
        busy={acceptingReturn}
        onCancel={() => setConfirmReturnAcceptance(false)}
        onConfirm={acceptReturn}
      />
      <ActionConfirmation
        open={confirmOutForDelivery}
        title="Mark order out for delivery?"
        message="The order status will move from Order Placed to Out for Delivery. It can then be marked delivered."
        confirmLabel="Mark Out for Delivery"
        busy={markingOutForDelivery}
        onCancel={() => setConfirmOutForDelivery(false)}
        onConfirm={markOutForDelivery}
      />
      <ActionConfirmation
        open={confirmDelivery}
        title="Mark this order delivered?"
        message="This will update the order from Out for Delivery to Delivered and allow the customer to request a return."
        confirmLabel="Mark delivered"
        busy={markingDelivered}
        onCancel={() => setConfirmDelivery(false)}
        onConfirm={markDelivered}
      />
    </AdminPageLayout>
  );
}
