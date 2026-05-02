import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const KEY = "pb_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const add = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.product_id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          image: product.image,
          qty,
        },
      ];
    });
  };
  const setQty = (product_id, qty) => {
    if (qty <= 0) return setItems((prev) => prev.filter((i) => i.product_id !== product_id));
    setItems((prev) => prev.map((i) => (i.product_id === product_id ? { ...i, qty } : i)));
  };
  const remove = (product_id) => setItems((prev) => prev.filter((i) => i.product_id !== product_id));
  const clear = () => setItems([]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal === 0 ? 0 : subtotal >= 999 ? 0 : 79;
    return { subtotal, shipping, total: subtotal + shipping, count: items.reduce((s, i) => s + i.qty, 0) };
  }, [items]);

  return (
    <CartCtx.Provider value={{ items, add, setQty, remove, clear, totals, open, setOpen }}>
      {children}
    </CartCtx.Provider>
  );
}
