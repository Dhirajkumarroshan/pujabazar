import React, { useEffect, useState } from "react";
import { api, inr } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Account() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get("/orders").then((r) => setOrders(r.data)); }, []);

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-5xl mx-auto pt-12 pb-24">
      <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">Welcome</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-2">{user?.name || user?.email}</h1>
      <p className="text-ink-700 mb-10">{user?.email}</p>

      <h2 className="font-serif text-2xl mb-5">Your orders</h2>
      {orders.length === 0 && <div className="text-ink-500" data-testid="no-orders">No orders yet.</div>}
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.order_id} data-testid={`order-${o.order_id}`} className="bg-bone-100 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="font-mono text-xs text-ink-700">{o.order_id}</div>
              <div className="flex gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-ink-900 text-bone-50">{o.status}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-bone-50 border border-bone-300">{o.payment_method} · {o.payment_status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-3">
              {o.items.map((i) => (
                <div key={i.product_id} className="flex items-center gap-3">
                  <img src={i.image} alt="" className="w-12 h-14 object-cover rounded-md bg-bone-200" />
                  <div className="text-sm">
                    <div>{i.name}</div>
                    <div className="text-ink-500 text-xs">× {i.qty}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm border-t border-bone-300 pt-3">
              <span className="text-ink-700">Total</span>
              <span className="font-medium">{inr(o.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
