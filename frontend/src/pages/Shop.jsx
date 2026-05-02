import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function Shop() {
  const { category } = useParams();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const queryParams = {};
    if (category) queryParams.category = category;
    if (q) queryParams.q = q;
    api.get("/products", { params: queryParams }).then((r) => setProducts(r.data));
  }, [category, q]);

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto pt-12 pb-24">
      <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">Shop</div>
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-2">
        {category || (q ? `Results for "${q}"` : "All products")}
      </h1>
      <p className="text-ink-700 mb-12">{products.length} item{products.length === 1 ? "" : "s"}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {products.map((p) => <ProductCard key={p.product_id} product={p} />)}
      </div>
      {products.length === 0 && (
        <div data-testid="empty-shop" className="py-32 text-center text-ink-500">No products yet.</div>
      )}
    </div>
  );
}
