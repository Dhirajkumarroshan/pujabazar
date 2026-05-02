import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div data-testid="not-found-page" className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">404</div>
        <h1 className="font-serif text-5xl md:text-6xl mb-4">Path not found.</h1>
        <p className="text-ink-700 max-w-md mx-auto mb-8">
          The page you're looking for has wandered off. Let's return home.
        </p>
        <Link to="/" data-testid="nf-home" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-ink-900 text-bone-50 hover:bg-terra-600 text-sm uppercase tracking-[0.25em]">
          Return home
        </Link>
      </div>
    </div>
  );
}
