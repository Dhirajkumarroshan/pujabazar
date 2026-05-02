import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, User, LogOut, LayoutGrid, ChevronDown } from "lucide-react";
import AnnouncementStrip from "./AnnouncementStrip";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";

const categories = [
  { name: "Ganga Jal", subs: ["Haridwar Ganga Jal", "Varanasi Ganga Jal", "Premium Bottled Jal"] },
  { name: "Puja Samagri", subs: ["Havan Samagri", "Puja Kits", "Flowers & Dhoop"] },
  { name: "Decorative", subs: ["Torans", "Lights & Diyas", "Wall Hangings"] },
  { name: "Murti", subs: ["Brass Murti", "Marble Murti", "Wooden Murti"] },
  { name: "Prasad", subs: ["Dry Prasad", "Charnamrit", "Special Temple Prasad"] },
];

export default function Header() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e) => {
    e.preventDefault();
    nav(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  };

  return (
    <header className="sticky top-0 z-40 bg-bone-50/95 backdrop-blur-xl border-b border-bone-300">
      <AnnouncementStrip />
      <div className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto flex items-center gap-6 py-4">
        <Link to="/" data-testid="brand-logo" className="font-serif text-2xl md:text-3xl tracking-tight text-ink-900 mr-4">
          PujaBazar<span className="text-terra-600">.in</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {categories.map((c) => (
            <div key={c.name} className="relative group">
              <Link
                to={`/shop/${encodeURIComponent(c.name)}`}
                data-testid={`nav-${c.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-3 py-2 text-sm text-ink-900 hover:text-terra-600 inline-flex items-center gap-1"
              >
                {c.name} <ChevronDown size={14} strokeWidth={1.5} />
              </Link>
              <div className="absolute top-full left-0 hidden group-hover:block min-w-[220px] bg-bone-50 border border-bone-300 rounded-xl shadow-medium p-2">
                {c.subs.map((s) => (
                  <Link key={s} to={`/shop/${encodeURIComponent(c.name)}`} className="block px-3 py-2 text-sm text-ink-700 hover:bg-bone-100 rounded-lg">
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <form onSubmit={onSearch} className="hidden md:flex items-center bg-bone-100 rounded-full px-3 py-2 w-64">
          <Search size={16} strokeWidth={1.5} className="text-ink-500" />
          <input
            data-testid="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search puja items…"
            className="ml-2 bg-transparent outline-none text-sm flex-1 text-ink-900 placeholder-ink-500"
          />
        </form>

        <button
          data-testid="cart-button"
          onClick={() => cart.setOpen(true)}
          className="relative p-2 text-ink-900 hover:text-terra-600 transition-colors"
          aria-label="Cart"
        >
          <ShoppingBag size={22} strokeWidth={1.5} />
          {cart.totals.count > 0 && (
            <span data-testid="cart-count" className="absolute -top-1 -right-1 bg-terra-600 text-bone-50 text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {cart.totals.count}
            </span>
          )}
        </button>

        {user ? (
          <div className="relative group">
            <button data-testid="user-menu-btn" className="p-2 text-ink-900 hover:text-terra-600 inline-flex items-center gap-2">
              <User size={20} strokeWidth={1.5} />
              <span className="hidden md:inline text-sm">{user.name?.split(" ")[0] || "Account"}</span>
            </button>
            <div className="absolute right-0 top-full hidden group-hover:block min-w-[200px] bg-bone-50 border border-bone-300 rounded-xl shadow-medium p-2">
              <Link to="/account" data-testid="link-account" className="block px-3 py-2 text-sm rounded-lg hover:bg-bone-100">My Orders</Link>
              {user.role === "admin" && (
                <Link to="/admin" data-testid="link-admin" className="block px-3 py-2 text-sm rounded-lg hover:bg-bone-100 inline-flex items-center gap-2">
                  <LayoutGrid size={14} strokeWidth={1.5} /> Admin Console
                </Link>
              )}
              <button onClick={logout} data-testid="logout-btn" className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-bone-100 inline-flex items-center gap-2">
                <LogOut size={14} strokeWidth={1.5} /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            data-testid="open-login-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("open-auth"))}
            className="px-5 py-2 rounded-full text-sm font-medium bg-ink-900 text-bone-50 hover:bg-terra-600 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
