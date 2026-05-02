import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { api, inr } from "../lib/api";

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => {
    api.get("/orders").then((r) => setOrder(r.data.find((o) => o.order_id === orderId)));
  }, [orderId]);

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-3xl mx-auto pt-16 pb-24 text-center">
      <div className="inline-flex w-16 h-16 rounded-full bg-forest-600 text-bone-50 items-center justify-center mx-auto">
        <Check size={28} strokeWidth={1.5} />
      </div>
      <h1 data-testid="order-success-heading" className="font-serif text-4xl md:text-5xl mt-6">Order placed</h1>
      <p className="text-ink-700 mt-3">Reference: <code className="font-mono text-ink-900">{orderId}</code></p>
      {order && (
        <div className="mt-10 text-left bg-bone-100 rounded-2xl p-6">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><div className="text-ink-500 text-xs uppercase tracking-[0.2em] mb-1">Status</div><div className="font-medium capitalize">{order.status}</div></div>
            <div><div className="text-ink-500 text-xs uppercase tracking-[0.2em] mb-1">Payment</div><div className="font-medium uppercase">{order.payment_status}</div></div>
            <div><div className="text-ink-500 text-xs uppercase tracking-[0.2em] mb-1">Total</div><div className="font-medium">{inr(order.total)}</div></div>
            <div><div className="text-ink-500 text-xs uppercase tracking-[0.2em] mb-1">Shipping to</div><div className="font-medium">{order.address.city}, {order.address.state}</div></div>
          </div>
        </div>
      )}
      <div className="mt-8 flex gap-3 justify-center">
        <Link to="/" className="px-6 py-3 rounded-full bg-ink-900 text-bone-50 hover:bg-terra-600 text-sm uppercase tracking-[0.25em]">Continue shopping</Link>
        <Link to="/account" className="px-6 py-3 rounded-full border border-ink-900 hover:bg-ink-900 hover:text-bone-50 text-sm uppercase tracking-[0.25em]">My orders</Link>
      </div>
    </div>
  );
}
