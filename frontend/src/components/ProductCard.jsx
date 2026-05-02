import React from "react";
import { Link } from "react-router-dom";
import { Plus, Minus } from "lucide-react";
import { useCart } from "../lib/cart";
import { inr } from "../lib/api";

function resolveImg(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return src;
}

export default function ProductCard({ product }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((i) => i.product_id === product.product_id);
  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

  return (
    <div data-testid={`product-card-${product.product_id}`} className="group flex flex-col">
      <Link to={`/product/${product.product_id}`} className="relative aspect-[4/5] bg-bone-100 overflow-hidden rounded-xl block">
        <img
          src={resolveImg(product.image)}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-ink-900 text-bone-50 text-[10px] tracking-[0.2em] uppercase px-2 py-1 rounded">
            {discount}% off
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute top-3 right-3 bg-terra-600 text-bone-50 text-[10px] tracking-[0.2em] uppercase px-2 py-1 rounded">
            Out of stock
          </div>
        )}
        <div className="absolute left-3 right-3 bottom-3 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          {!inCart ? (
            <button
              data-testid={`add-to-cart-${product.product_id}`}
              onClick={(e) => { e.preventDefault(); if (product.stock > 0) add(product, 1); }}
              disabled={product.stock === 0}
              className="w-full py-3 rounded-full bg-ink-900 text-bone-50 text-xs uppercase tracking-[0.2em] font-medium hover:bg-terra-600 transition-colors disabled:opacity-50"
            >
              {product.stock === 0 ? "Sold out" : "Add to Cart"}
            </button>
          ) : (
            <div className="w-full py-2 rounded-full bg-ink-900 text-bone-50 flex items-center justify-between px-4" onClick={(e) => e.preventDefault()}>
              <button
                data-testid={`qty-dec-${product.product_id}`}
                onClick={(e) => { e.preventDefault(); setQty(product.product_id, inCart.qty - 1); }}
                className="p-1 hover:text-gold-500"
              >
                <Minus size={16} strokeWidth={1.5} />
              </button>
              <span className="text-xs uppercase tracking-[0.2em]" data-testid={`qty-${product.product_id}`}>
                {inCart.qty} in cart
              </span>
              <button
                data-testid={`qty-inc-${product.product_id}`}
                onClick={(e) => { e.preventDefault(); setQty(product.product_id, inCart.qty + 1); }}
                className="p-1 hover:text-gold-500"
              >
                <Plus size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </Link>
      <Link to={`/product/${product.product_id}`} className="pt-4 block">
        <div className="text-[10px] uppercase tracking-[0.2em] text-terra-600 mb-1">{product.category}</div>
        <h3 className="font-serif text-lg text-ink-900 leading-snug">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-ink-900 font-medium">{inr(product.price)}</span>
          {product.mrp > product.price && (
            <span className="text-xs text-ink-500 line-through">{inr(product.mrp)}</span>
          )}
        </div>
      </Link>
    </div>
  );
}
