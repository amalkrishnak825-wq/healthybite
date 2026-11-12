const orderLabels = {
  placed: "Order Placed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  return_accepted: "Return accepted",
};

const adminLabels = {
  ...orderLabels,
  awaiting_payment: "Awaiting Payment",
  payment_failed: "Payment Failed",
  return_requested: "Return Requested",
  return_accepted: "Return Accepted",
};

function customerStatusLabel(order) {
  if (orderLabels[order.status]) return orderLabels[order.status];
  if (order.paymentStatus === "failed") return "Payment failed";
  if (order.paymentStatus === "paid") return "Paid";
  if (order.paymentMethod === "cod") return "Cash on Delivery";
  return "Awaiting payment";
}

function customerStatusClass(order) {
  if (order.status === "placed") return "placed";
  if (order.status === "out_for_delivery") return "out-for-delivery";
  if (order.status === "delivered") return "delivered";
  if (order.paymentStatus === "failed" || order.status === "cancelled")
    return "failed";
  if (order.status === "return_requested") return "pending";
  if (
    order.status === "return_accepted" ||
    order.paymentStatus === "paid" ||
    order.paymentMethod === "cod"
  )
    return "complete";
  return "pending";
}

export default function OrderStatusBadge({ order, variant = "customer" }) {
  const isAdmin = variant === "admin";
  const label = isAdmin
    ? adminLabels[order.status] || order.status.replaceAll("_", " ")
    : customerStatusLabel(order);
  const className = isAdmin
    ? `operation-pill ${order.status}`
    : `order-status ${customerStatusClass(order)}`;

  return <span className={className}>{label}</span>;
}
