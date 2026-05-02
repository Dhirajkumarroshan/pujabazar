import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatErr, inr } from "../lib/api";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";

export default function Checkout() {
  const { items, totals, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [pm, setPm] = useState("razorpay");
  const [addr, setAddr] = useState({
    full_name: user?.name || "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const update = (k) => (e) => setAddr({ ...addr, [k]: e.target.value });

  const placeOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("Cart is empty"); return; }
    setBusy(true);
    try {
      const payload = {
        items: items.map(i => ({ product_id: i.product_id, qty: i.qty })),
        address: addr,
        payment_method: pm,
      };
      const { data } = await api.post("/checkout", payload);
      const order = data.order;

      if (pm === "cod" || data.mock || !data.razorpay) {
        clear();
        toast.success("Order placed");
        nav(`/order/${order.order_id}`);
        return;
      }

      const opts = {
        key: data.razorpay.key_id,
        order_id: data.razorpay.order_id,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: "PujaBazar.in",
        description: "Order " + order.order_id,
        prefill: { name: addr.full_name, email: user.email, contact: addr.phone },
        theme: { color: "#8C3B30" },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", {
              order_id: order.order_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            clear();
            toast.success("Payment successful");
            nav(`/order/${order.order_id}`);
          } catch (err) {
            toast.error(formatErr(err));
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      };
      // eslint-disable-next-line no-undef
      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (err) {
      toast.error(formatErr(err));
    } finally { setBusy(false); }
  };

  const prepaidDiscount = pm === "razorpay" ? Math.round(totals.total * 0.05) : 0;
  const finalTotal = totals.total - prepaidDiscount;

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto pt-12 pb-24 grid lg:grid-cols-[1.3fr_1fr] gap-12">
      <form onSubmit={placeOrder} className="space-y-10">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">Step 1</div>
          <h2 className="font-serif text-3xl mb-6">Shipping address</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input data-testid="addr-name" required value={addr.full_name} onChange={update("full_name")} placeholder="Full name" className="input" />
            <input data-testid="addr-phone" required value={addr.phone} onChange={update("phone")} placeholder="Phone" className="input" />
            <input data-testid="addr-line1" required value={addr.line1} onChange={update("line1")} placeholder="Address line 1" className="input md:col-span-2" />
            <input data-testid="addr-line2" value={addr.line2} onChange={update("line2")} placeholder="Address line 2 (optional)" className="input md:col-span-2" />
            <input data-testid="addr-city" required value={addr.city} onChange={update("city")} placeholder="City" className="input" />
            <input data-testid="addr-state" required value={addr.state} onChange={update("state")} placeholder="State" className="input" />
            <input data-testid="addr-pincode" required value={addr.pincode} onChange={update("pincode")} placeholder="PIN code" className="input" />
          </div>
        </div>

        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">Step 2</div>
          <h2 className="font-serif text-3xl mb-6">Payment</h2>
          <div className="space-y-3">
            <label className={`flex gap-3 items-start p-5 border rounded-xl cursor-pointer ${pm === "razorpay" ? "border-terra-600 bg-bone-100" : "border-bone-300"}`}>
              <input data-testid="pm-razorpay" type="radio" checked={pm === "razorpay"} onChange={() => setPm("razorpay")} />
              <div>
                <div className="font-medium">Pay online (Razorpay)</div>
                <div className="text-sm text-ink-700">UPI, Cards, Netbanking. <span className="text-terra-600">Get 5% prepaid discount.</span></div>
              </div>
            </label>
            <label className={`flex gap-3 items-start p-5 border rounded-xl cursor-pointer ${pm === "cod" ? "border-terra-600 bg-bone-100" : "border-bone-300"}`}>
              <input data-testid="pm-cod" type="radio" checked={pm === "cod"} onChange={() => setPm("cod")} />
              <div>
                <div className="font-medium">Cash on Delivery</div>
                <div className="text-sm text-ink-700">Pay in cash when your order arrives.</div>
              </div>
            </label>
          </div>
        </div>

        <button data-testid="place-order-btn" disabled={busy || items.length === 0} className="w-full md:w-auto px-12 py-4 rounded-full bg-terra-600 text-bone-50 hover:bg-terra-700 disabled:opacity-60 text-sm uppercase tracking-[0.3em]">
          {busy ? "Processing…" : (pm === "razorpay" ? "Pay & place order" : "Place order")}
        </button>
      </form>

      <aside className="bg-bone-100 rounded-2xl p-6 h-fit sticky top-32">
        <h3 className="font-serif text-2xl mb-4">Order summary</h3>
        <div className="space-y-3 mb-5 max-h-72 overflow-auto pr-2">
          {items.map((i) => (
            <div key={i.product_id} className="flex justify-between text-sm">
              <span className="text-ink-700">{i.name} <span className="text-ink-500">× {i.qty}</span></span>
              <span>{inr(i.price * i.qty)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-bone-300 pt-4 space-y-2 text-sm text-ink-700">
          <div className="flex justify-between"><span>Subtotal</span><span>{inr(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{totals.shipping ? inr(totals.shipping) : "Free"}</span></div>
          {prepaidDiscount > 0 && <div className="flex justify-between text-forest-600"><span>Prepaid discount (5%)</span><span>− {inr(prepaidDiscount)}</span></div>}
          <div className="flex justify-between font-serif text-2xl text-ink-900 pt-3"><span>Total</span><span data-testid="checkout-total">{inr(finalTotal)}</span></div>
        </div>
      </aside>

      <style>{`.input{background:transparent;border-bottom:1px solid #E2DFD3;padding:10px 4px;outline:none;}
      .input:focus{border-bottom-color:#8C3B30;}
      `}</style>
    </div>
  );
}
