import React from "react";

export default function Footer() {
  return (
    <footer data-testid="footer" className="bg-ink-900 text-bone-50 mt-24">
      <div className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="font-serif text-2xl mb-3">PujaBazar.in</div>
          <p className="text-sm text-bone-100/70 leading-relaxed">
            A house of authentic puja samagri, brass diyas, rudraksha & temple prasad — crafted with reverence, delivered with care.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.25em] text-gold-500 mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-bone-100/80">
            <li>Ganga Jal</li><li>Puja Samagri</li><li>Decorative</li><li>Murti</li><li>Prasad</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.25em] text-gold-500 mb-4">Policies</h4>
          <ul className="space-y-2 text-sm text-bone-100/80">
            <li>Privacy Policy</li><li>Terms of Service</li><li>Returns & Refund</li><li>Shipping Policy</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.25em] text-gold-500 mb-4">Newsletter</h4>
          <p className="text-sm text-bone-100/70 mb-3">Festival drops, new arrivals & rituals — once a fortnight.</p>
          <div className="flex">
            <input className="flex-1 bg-transparent border-b border-bone-100/40 px-1 py-2 text-sm outline-none focus:border-gold-500" placeholder="email@example.com" />
            <button className="ml-3 text-xs uppercase tracking-[0.25em] text-gold-500 hover:text-bone-50">Join →</button>
          </div>
        </div>
      </div>
      <div className="border-t border-bone-100/10 py-5 text-center text-xs text-bone-100/50">
        © {new Date().getFullYear()} PujaBazar.in — Made with reverence in India.
      </div>
    </footer>
  );
}
