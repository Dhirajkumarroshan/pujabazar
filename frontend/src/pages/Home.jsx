import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";

const HEROES = [
  {
    img: "https://static.prod-images.emergentagent.com/jobs/07b6612e-c1bd-4caa-b48c-faa0ca811820/images/4d0278b25606ce79290a5b673dc4745ba8247d3e78da1f5f90cebb6751aba411.png",
    eyebrow: "Festival edit",
    title: "Elevated puja\nessentials.",
    cta: "Shop the festival",
  },
  {
    img: "https://static.prod-images.emergentagent.com/jobs/07b6612e-c1bd-4caa-b48c-faa0ca811820/images/676ea3207868c334305cdec27c295c055def2d8a107425c75e7146531611bdcf.png",
    eyebrow: "Heirloom brass",
    title: "Diyas crafted\nin reverence.",
    cta: "Discover diyas",
  },
  {
    img: "https://static.prod-images.emergentagent.com/jobs/07b6612e-c1bd-4caa-b48c-faa0ca811820/images/4a7e7ffcbfc60f92346e2084eeca0c5d9083a9353ba43e32759ba1ab9ed13af3.png",
    eyebrow: "Sacred sculpture",
    title: "Murtis with\nsoul.",
    cta: "Explore murtis",
  },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
  }, []);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % HEROES.length), 5500);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="px-4 md:px-6 lg:px-10 pt-6">
        <div className="relative h-[78vh] min-h-[520px] rounded-2xl overflow-hidden">
          {HEROES.map((h, i) => (
            <div key={i} className={`hero-slide ${i === active ? "active" : ""}`}>
              <img src={h.img} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-900/70 via-ink-900/30 to-transparent" />
            </div>
          ))}
          <div className="absolute z-10 top-1/2 -translate-y-1/2 left-6 md:left-16 max-w-xl text-bone-50">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-500 mb-4">{HEROES[active].eyebrow}</div>
            <h1 className="font-serif text-5xl md:text-7xl leading-none whitespace-pre-line tracking-tight">{HEROES[active].title}</h1>
            <p className="mt-5 text-bone-100/80 max-w-md">Up to 50% off on festival items. Free shipping above ₹999. Authentic, sealed, sourced from temples.</p>
            <Link to="/shop" data-testid="hero-cta" className="inline-flex items-center gap-2 mt-8 px-7 py-3 rounded-full bg-bone-50 text-ink-900 hover:bg-gold-500 hover:text-ink-900 transition-colors text-sm uppercase tracking-[0.25em] font-medium">
              {HEROES[active].cta} <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="absolute z-10 bottom-6 right-6 md:right-10 flex gap-2">
            {HEROES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-10 bg-bone-50" : "w-4 bg-bone-50/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORY STRIP */}
      <section className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto py-16 grid grid-cols-2 md:grid-cols-5 gap-4">
        {["Ganga Jal", "Puja Samagri", "Decorative", "Murti", "Prasad"].map((c) => (
          <Link
            key={c}
            to={`/shop/${encodeURIComponent(c)}`}
            data-testid={`cat-tile-${c.toLowerCase().replace(/\s+/g, "-")}`}
            className="group relative aspect-square rounded-xl bg-bone-100 overflow-hidden flex items-center justify-center text-center px-4 hover:bg-bone-200 transition-colors"
          >
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-2">Shop</div>
              <div className="font-serif text-2xl text-ink-900 group-hover:text-terra-600 transition-colors">{c}</div>
            </div>
          </Link>
        ))}
      </section>

      {/* TOP DEALS */}
      <section className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto pb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-2">Top deals</div>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">House favourites.</h2>
          </div>
          <Link to="/shop" className="hidden md:inline-flex items-center gap-2 text-sm text-ink-900 hover:text-terra-600">
            View all <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
        <div data-testid="product-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.map((p) => <ProductCard key={p.product_id} product={p} />)}
        </div>
      </section>
    </div>
  );
}
