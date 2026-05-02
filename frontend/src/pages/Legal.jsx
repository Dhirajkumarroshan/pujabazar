import React from "react";
import { useParams, Navigate, Link } from "react-router-dom";

const POLICIES = {
  privacy: {
    title: "Privacy Policy",
    body: [
      ["Overview", "PujaBazar.in respects your privacy. This policy explains what personal data we collect, how we use it, and your rights over it."],
      ["Data we collect", "Name, email, phone number, shipping address, and order history when you create an account or place an order. Device/usage data via cookies and analytics."],
      ["How we use data", "To process your orders, deliver products, provide customer support, and send order updates. With your consent, we may send occasional marketing emails (opt-out anytime)."],
      ["Sharing", "We share data only with shipping partners, payment processors (Razorpay), and legal authorities where required. We never sell your data."],
      ["Your rights", "You can request access, correction, or deletion of your data by emailing support@pujabazar.in."],
      ["Contact", "For privacy queries write to support@pujabazar.in."],
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      ["Acceptance", "By using PujaBazar.in you agree to these Terms. If you do not agree, please do not use the site."],
      ["Eligibility", "You must be at least 18 years old or have guardian consent to place an order."],
      ["Orders", "All orders are subject to acceptance and stock availability. Prices are in INR and inclusive of applicable GST unless stated otherwise."],
      ["Payments", "We accept UPI, cards, netbanking (via Razorpay) and Cash on Delivery within India. Prepaid orders receive a 5% discount."],
      ["Accounts", "Keep your login credentials safe. You are responsible for activity on your account."],
      ["Prohibited use", "Reselling counterfeit items, scraping, or abusing promotional offers is prohibited."],
      ["Liability", "PujaBazar.in's liability is limited to the value of the order concerned."],
      ["Governing law", "Disputes are governed by the laws of India with jurisdiction in Mumbai courts."],
    ],
  },
  returns: {
    title: "Returns & Refund",
    body: [
      ["Return window", "Unopened items can be returned within 7 days of delivery. Items must be in original packaging."],
      ["Non-returnable", "Ganga Jal, prasad, sealed food items and personalised products are non-returnable for hygiene and religious reasons, unless damaged on arrival."],
      ["Damaged on arrival", "Report damaged/missing items within 48 hours of delivery with photos to support@pujabazar.in for a free replacement or refund."],
      ["Refund timeline", "Prepaid refunds are processed within 5–7 business days to the original payment method. COD refunds are sent via bank transfer within 7 business days."],
      ["How to raise a return", "Go to My Orders → select the order → Request return. Our team will schedule a reverse pickup."],
    ],
  },
  shipping: {
    title: "Shipping Policy",
    body: [
      ["Serviceable areas", "We ship pan-India to all serviceable PIN codes. International shipping is currently not available."],
      ["Delivery time", "Orders are dispatched in 1–2 business days and typically delivered in 2–5 business days depending on your location."],
      ["Shipping charges", "Flat ₹79 on orders below ₹999. Free shipping on orders ₹999 and above."],
      ["Cash on Delivery", "COD is available across serviceable PIN codes. COD fee is included in the shipping charge."],
      ["Tracking", "Once shipped, a tracking link is sent via email/SMS. You can also view it under My Orders."],
    ],
  },
};

export default function LegalPage() {
  const { slug } = useParams();
  const policy = POLICIES[slug];
  if (!policy) return <Navigate to="/" replace />;
  return (
    <div data-testid={`legal-${slug}`} className="px-6 md:px-12 max-w-3xl mx-auto pt-12 pb-24">
      <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">Legal</div>
      <h1 className="font-serif text-4xl md:text-5xl mb-3 tracking-tight">{policy.title}</h1>
      <p className="text-ink-500 text-sm mb-10">Last updated: January 2026</p>
      <div className="space-y-8">
        {policy.body.map(([h, b]) => (
          <section key={h}>
            <h2 className="font-serif text-2xl mb-2">{h}</h2>
            <p className="text-ink-700 leading-relaxed">{b}</p>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3 text-sm">
        {Object.keys(POLICIES).filter((k) => k !== slug).map((k) => (
          <Link key={k} to={`/legal/${k}`} className="px-4 py-2 rounded-full border border-bone-300 hover:bg-bone-100 capitalize">
            {POLICIES[k].title}
          </Link>
        ))}
      </div>
    </div>
  );
}
