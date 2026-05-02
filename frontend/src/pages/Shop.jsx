import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";

const SORTS = [
  { v: "", label: "Newest" },
  { v: "price_asc", label: "Price: Low to High" },
  { v: "price_desc", label: "Price: High to Low" },
  { v: "name_asc", label: "Name: A–Z" },
];

export default function Shop() {
  const { category } = useParams();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const queryParams = {};
    if (category) queryParams.category = category;
    if (q) queryParams.q = q;
    if (sort) queryParams.sort = sort;
    if (min !== "") queryParams.min_price = Number(min);
    if (max !== "") queryParams.max_price = Number(max);
    setLoading(true);
    api.get("/products", { params: queryParams })
      .then((r) => setProducts(r.data))
      .finally(() => setLoading(false));
  }, [category, q, sort, min, max]);

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto pt-12 pb-24">
      <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">Shop</div>
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-2">
        {category || (q ? `Results for "${q}"` : "All products")}
      </h1>
      <p className="text-ink-700 mb-8">{products.length} item{products.length === 1 ? "" : "s"}</p>

      <div className="flex flex-wrap items-center gap-3 mb-10 pb-6 border-b border-bone-300">
        <select
          data-testid="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-bone-100 border border-bone-300 rounded-full px-4 py-2 text-sm text-ink-900 outline-none"
        >
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input
            data-testid="filter-min"
            type="number" min="0"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="Min ₹"
            className="w-24 bg-bone-100 border border-bone-300 rounded-full px-4 py-2 text-sm outline-none"
          />
          <span className="text-ink-500">–</span>
          <input
            data-testid="filter-max"
            type="number" min="0"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Max ₹"
            className="w-24 bg-bone-100 border border-bone-300 rounded-full px-4 py-2 text-sm outline-none"
          />
        </div>
        {(sort || min !== "" || max !== "") && (
          <button
            data-testid="clear-filters"
            onClick={() => { setSort(""); setMin(""); setMax(""); }}
            className="text-sm text-terra-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {products.map((p) => <ProductCard key={p.product_id} product={p} />)}
      </div>
      {!loading && products.length === 0 && (
        <div data-testid="empty-shop" className="py-32 text-center text-ink-500">No products match your filters.</div>
      )}
    </div>
  );
}
