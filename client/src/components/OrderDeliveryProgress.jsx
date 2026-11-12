import { Check, Circle } from "lucide-react";

const steps = [
  { key: "placed", label: "Order Placed" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

function timeLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export default function OrderDeliveryProgress({ order }) {
  if (!order || !["placed", "out_for_delivery", "delivered", "return_requested", "return_accepted"].includes(order.status)) return null;

  const activeIndex = order.status === "placed" ? 0 : order.status === "out_for_delivery" ? 1 : 2;
  const timestamps = [order.createdAt, order.outForDeliveryAt, order.deliveredAt];

  return (
    <section className={`order-delivery-progress step-${activeIndex}`} aria-label={`Delivery progress: ${steps[activeIndex].label}`}>
      {steps.map((step, index) => {
        const state = index < activeIndex ? "done" : index === activeIndex ? "current" : "upcoming";
        return (
          <div className={`order-progress-step ${state}`} key={step.key}>
            <span className="order-progress-marker" aria-hidden="true">
              {state === "done" ? <Check size={12} strokeWidth={3} /> : state === "current" ? <span /> : <Circle size={8} fill="currentColor" />}
            </span>
            <b>{step.label}</b>
            <small>{timeLabel(timestamps[index])}</small>
          </div>
        );
      })}
    </section>
  );
}
