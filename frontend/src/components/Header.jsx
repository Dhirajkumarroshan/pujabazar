import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, User, LogOut, LayoutGrid, ChevronDown, Menu, X } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const onSearch = (e) => {
    e.preventDefault();
    nav(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-bone-50/95 backdrop-blur-xl border-b border-bone-300">
      <AnnouncementStrip />
      <div className="px-4 md:px-12 lg:px-16 max-w-[1400px] mx-auto flex items-center gap-4 md:gap-6 py-4">
        <button
          data-testid="mobile-menu-btn"
          className="lg:hidden p-2 -ml-2 text-ink-900"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>

        <Link to="/" data-testid="brand-logo" className="font-serif text-xl md:text-3xl tracking-tight text-ink-900 lg:mr-4">
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

        <form onSubmit={onSearch} className="hidden md:flex items-center bg-bone-100 rounded-full px-3 py-2 w-56 xl:w-64">
          <Search size={16} strokeWidth={1.5} className="text-ink-500" />
          <input
            data-testid="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search puja items…"
            className="ml-2 bg-transparent outline-none text-sm flex-1 text-ink-900 placeholder-ink-500"
          />
        </form>

        <div className="flex items-center gap-2 md:gap-3 ml-auto lg:ml-0">
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
              className="px-4 md:px-5 py-2 rounded-full text-sm font-medium bg-ink-900 text-bone-50 hover:bg-terra-600 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile slide-over menu */}
      {mobileOpen && (
        <div data-testid="mobile-menu" className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-bone-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-bone-300">
              <span className="font-serif text-xl">Menu</span>
              <button data-testid="mobile-close" onClick={() => setMobileOpen(false)} className="p-2 hover:bg-bone-100 rounded-full">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={onSearch} className="flex md:hidden items-center bg-bone-100 mx-5 mt-4 rounded-full px-3 py-2">
              <Search size={16} strokeWidth={1.5} className="text-ink-500" />
              <input
                data-testid="search-input-mobile"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search puja items…"
                className="ml-2 bg-transparent outline-none text-sm flex-1 text-ink-900 placeholder-ink-500"
              />
            </form>
            <nav className="p-5 flex-1 overflow-auto">
              {categories.map((c) => (
                <Link
                  key={c.name}
                  to={`/shop/${encodeURIComponent(c.name)}`}
                  onClick={() => setMobileOpen(false)}
                  data-testid={`mnav-${c.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="block py-3 border-b border-bone-300 text-ink-900 font-serif text-lg"
                >
                  {c.name}
                </Link>
              ))}
              <Link to="/shop" onClick={() => setMobileOpen(false)} className="block py-3 border-b border-bone-300 text-ink-900 font-serif text-lg">All products</Link>
              {user ? (
                <>
                  <Link to="/account" onClick={() => setMobileOpen(false)} className="block py-3 border-b border-bone-300 text-ink-900">My Orders</Link>
                  {user.role === "admin" && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-3 border-b border-bone-300 text-ink-900">Admin Console</Link>
                  )}
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="w-full text-left py-3 text-terra-600">Sign out</button>
                </>
              ) : (
                <button onClick={() => { setMobileOpen(false); window.dispatchEvent(new CustomEvent("open-auth")); }} className="mt-4 w-full py-3 rounded-full bg-ink-900 text-bone-50 text-sm uppercase tracking-[0.25em]">Sign In</button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
