import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Truck, Shield, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, inr } from "../lib/api";
import { useCart } from "../lib/cart";
import ProductCard from "../components/ProductCard";

export default function ProductDetail() {
  const { productId } = useParams();
  const nav = useNavigate();
  const { add, setOpen } = useCart();
  const [p, setP] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setP(null);
    setNotFound(false);
    api.get(`/products/${productId}`)
      .then((r) => {
        setP(r.data);
        api.get("/products", { params: { category: r.data.category } })
          .then((rr) => setRelated(rr.data.filter((x) => x.product_id !== r.data.product_id).slice(0, 4)));
      })
      .catch(() => setNotFound(true));
  }, [productId]);

  if (notFound) {
    return (
      <div data-testid="pdp-not-found" className="px-6 md:px-12 max-w-3xl mx-auto py-24 text-center">
        <h1 className="font-serif text-4xl mb-3">Product not found</h1>
        <p className="text-ink-700 mb-6">The item you're looking for may have been removed.</p>
        <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink-900 text-bone-50 text-sm uppercase tracking-[0.25em]">
          Back to shop
        </Link>
      </div>
    );
  }

  if (!p) {
    return <div className="min-h-[50vh] flex items-center justify-center text-ink-500">Loading…</div>;
  }

  const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const addToCart = () => {
    add(p, qty);
    toast.success(`${p.name} added to cart`);
  };
  const buyNow = () => {
    add(p, qty);
    setOpen(false);
    nav("/checkout");
  };

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto pt-8 pb-24">
      <button onClick={() => nav(-1)} data-testid="pdp-back" className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-terra-600 mb-6">
        <ArrowLeft size={16} strokeWidth={1.5} /> Back
      </button>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="relative aspect-square bg-bone-100 rounded-2xl overflow-hidden">
          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
          {discount > 0 && (
            <div className="absolute top-4 left-4 bg-ink-900 text-bone-50 text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded">
              {discount}% off
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-2">{p.category}</div>
          <h1 data-testid="pdp-name" className="font-serif text-4xl md:text-5xl tracking-tight mb-4">{p.name}</h1>
          <div className="flex items-baseline gap-3 mb-6">
            <span data-testid="pdp-price" className="font-serif text-3xl text-ink-900">{inr(p.price)}</span>
            {p.mrp > p.price && <span className="text-ink-500 line-through">{inr(p.mrp)}</span>}
            {discount > 0 && <span className="text-forest-600 text-sm">You save {inr(p.mrp - p.price)}</span>}
          </div>
          <p className="text-ink-700 leading-relaxed mb-6">{p.description}</p>

          <div className="flex items-center gap-3 text-xs text-ink-700 mb-6">
            {p.stock > 0 ? (
              <span data-testid="pdp-stock" className="inline-flex items-center gap-1.5 text-forest-600">
                <Check size={14} strokeWidth={2} /> In stock ({p.stock} available)
              </span>
            ) : (
              <span data-testid="pdp-stock" className="text-terra-600">Out of stock</span>
            )}
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="inline-flex items-center border border-bone-300 rounded-full">
              <button data-testid="pdp-qty-dec" onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2 text-ink-700">−</button>
              <span data-testid="pdp-qty" className="px-3 text-sm">{qty}</span>
              <button data-testid="pdp-qty-inc" onClick={() => setQty(Math.min(p.stock || 99, qty + 1))} className="px-4 py-2 text-ink-700">+</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button data-testid="pdp-add-to-cart" disabled={p.stock === 0} onClick={addToCart}
              className="px-8 py-4 rounded-full border-2 border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-bone-50 transition-colors text-sm uppercase tracking-[0.25em] disabled:opacity-50">
              Add to cart
            </button>
            <button data-testid="pdp-buy-now" disabled={p.stock === 0} onClick={buyNow}
              className="px-8 py-4 rounded-full bg-terra-600 text-bone-50 hover:bg-terra-700 transition-colors text-sm uppercase tracking-[0.25em] disabled:opacity-50">
              Buy now
            </button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 text-xs text-ink-700">
            <div className="flex flex-col items-start gap-2"><Truck size={18} strokeWidth={1.5} className="text-terra-600" />Free shipping above ₹999</div>
            <div className="flex flex-col items-start gap-2"><Shield size={18} strokeWidth={1.5} className="text-terra-600" />100% authentic, sealed</div>
            <div className="flex flex-col items-start gap-2"><RotateCcw size={18} strokeWidth={1.5} className="text-terra-600" />7-day easy returns</div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-serif text-3xl mb-8">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
            {related.map((r) => <ProductCard key={r.product_id} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
