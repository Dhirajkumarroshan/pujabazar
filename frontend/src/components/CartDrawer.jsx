import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { inr } from "../lib/api";

export default function CartDrawer() {
  const { items, setQty, remove, totals, open, setOpen } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  const goCheckout = () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth"));
      return;
    }
    setOpen(false);
    nav("/checkout");
  };

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-ink-900/40 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <aside
        data-testid="cart-drawer"
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[440px] bg-bone-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-bone-300">
          <h3 className="font-serif text-2xl">Your Cart</h3>
          <button data-testid="cart-close" onClick={() => setOpen(false)} className="p-2 hover:bg-bone-100 rounded-full">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {items.length === 0 && (
            <div data-testid="empty-cart" className="text-center py-20 text-ink-500">
              Your cart is empty.
            </div>
          )}
          {items.map((i) => (
            <div key={i.product_id} className="flex gap-4 border-b border-bone-300 pb-4">
              <div className="w-20 h-24 bg-bone-100 rounded-lg overflow-hidden">
                <img src={i.image} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="font-serif text-base">{i.name}</div>
                <div className="text-sm text-ink-700 mt-1">{inr(i.price)}</div>
                <div className="mt-2 inline-flex items-center border border-bone-300 rounded-full">
                  <button onClick={() => setQty(i.product_id, i.qty - 1)} data-testid={`drawer-dec-${i.product_id}`} className="p-1.5 hover:text-terra-600">
                    <Minus size={14} strokeWidth={1.5} />
                  </button>
                  <span className="px-3 text-sm">{i.qty}</span>
                  <button onClick={() => setQty(i.product_id, i.qty + 1)} data-testid={`drawer-inc-${i.product_id}`} className="p-1.5 hover:text-terra-600">
                    <Plus size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="text-ink-900 font-medium">{inr(i.price * i.qty)}</div>
                <button onClick={() => remove(i.product_id)} className="mt-2 p-1.5 text-ink-500 hover:text-terra-600">
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-bone-300 p-6 space-y-2">
          <div className="flex justify-between text-sm text-ink-700">
            <span>Subtotal</span>
            <span data-testid="cart-subtotal">{inr(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-ink-700">
            <span>Shipping</span>
            <span>{totals.shipping === 0 ? "Free" : inr(totals.shipping)}</span>
          </div>
          <div className="flex justify-between font-serif text-xl pt-2">
            <span>Total</span>
            <span data-testid="cart-total">{inr(totals.total)}</span>
          </div>
          <button
            data-testid="cart-checkout-btn"
            disabled={items.length === 0}
            onClick={goCheckout}
            className="w-full mt-3 py-3 rounded-full bg-terra-600 text-bone-50 hover:bg-terra-700 disabled:opacity-50 text-sm uppercase tracking-[0.25em] font-medium"
          >
            Checkout
          </button>
        </div>
      </aside>
    </>
  );
}
