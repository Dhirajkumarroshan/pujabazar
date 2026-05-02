import React from "react";

export default function AnnouncementStrip() {
  const text = "Free Shipping above ₹999 — 5% Extra Discount on Prepaid Orders — 100% Authentic Puja Samagri — Secure Payments";
  return (
    <div data-testid="announcement-strip" className="w-full bg-terra-600 text-bone-50 overflow-hidden">
      <div className="marquee-track py-2 text-[11px] tracking-[0.25em] uppercase font-medium">
        <span className="px-12">{text}</span>
        <span className="px-12">{text}</span>
        <span className="px-12">{text}</span>
        <span className="px-12">{text}</span>
      </div>
    </div>
  );
}
