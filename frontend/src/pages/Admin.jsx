import React, { useEffect, useState } from "react";
import { Link, NavLink, Routes, Route, Navigate } from "react-router-dom";
import { LayoutGrid, Package, ShoppingBag, LogOut, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, inr } from "../lib/api";
import { useAuth } from "../lib/auth";

function Sidebar() {
  const { logout } = useAuth();
  const cls = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${isActive ? "bg-ink-900 text-bone-50" : "text-ink-700 hover:bg-bone-200"}`;
  return (
    <aside className="w-64 border-r border-bone-300 bg-bone-100 p-6 hidden md:flex flex-col gap-1 min-h-screen sticky top-0">
      <Link to="/" className="font-serif text-xl mb-8 text-ink-900">PujaBazar<span className="text-terra-600">.in</span></Link>
      <NavLink end to="/admin" data-testid="adm-nav-dashboard" className={cls}><LayoutGrid size={16} strokeWidth={1.5}/>Dashboard</NavLink>
      <NavLink to="/admin/products" data-testid="adm-nav-products" className={cls}><Package size={16} strokeWidth={1.5}/>Products</NavLink>
      <NavLink to="/admin/orders" data-testid="adm-nav-orders" className={cls}><ShoppingBag size={16} strokeWidth={1.5}/>Orders</NavLink>
      <button onClick={logout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-ink-700 hover:bg-bone-200">
        <LogOut size={16} strokeWidth={1.5}/>Sign out
      </button>
    </aside>
  );
}

function StatCard({ label, value, testid }) {
  return (
    <div data-testid={testid} className="bg-white border border-bone-300 rounded-xl p-6">
      <div className="text-[10px] uppercase tracking-[0.25em] text-ink-500">{label}</div>
      <div className="font-serif text-3xl mt-2">{value}</div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)).catch(()=>{}); }, []);
  return (
    <div className="p-8">
      <h1 className="font-serif text-4xl mb-8">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testid="stat-revenue" label="Revenue" value={inr(stats?.revenue || 0)} />
        <StatCard testid="stat-orders" label="Orders" value={stats?.total_orders ?? "—"} />
        <StatCard testid="stat-aov" label="Avg order value" value={inr(stats?.aov || 0)} />
        <StatCard testid="stat-customers" label="Customers" value={stats?.customers ?? "—"} />
      </div>
    </div>
  );
}

const EMPTY_PROD = { name: "", price: 0, mrp: 0, image: "", category: "Puja Samagri", description: "", stock: 100, featured: false };

function Products() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/products").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editing, price: Number(editing.price), mrp: Number(editing.mrp || 0), stock: Number(editing.stock || 0) };
      if (editing.product_id) await api.put(`/products/${editing.product_id}`, payload);
      else await api.post(`/products`, payload);
      toast.success("Saved");
      setEditing(null); load();
    } catch (err) { toast.error(formatErr(err)); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try { await api.delete(`/products/${id}`); toast.success("Deleted"); load(); }
    catch (err) { toast.error(formatErr(err)); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-4xl">Products</h1>
        <button data-testid="adm-new-product" onClick={() => setEditing({ ...EMPTY_PROD })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-terra-600 text-bone-50 hover:bg-terra-700 text-sm">
          <Plus size={16} strokeWidth={1.5}/> New Product
        </button>
      </div>

      <div className="bg-white border border-bone-300 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bone-100 text-ink-700">
            <tr>
              <th className="text-left p-4">Product</th>
              <th className="text-left p-4">Category</th>
              <th className="text-right p-4">Price</th>
              <th className="text-right p-4">Stock</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.product_id} className="border-t border-bone-300">
                <td className="p-4 flex items-center gap-3">
                  <img src={p.image} alt="" className="w-10 h-12 rounded object-cover bg-bone-100"/>
                  <span>{p.name}</span>
                </td>
                <td className="p-4 text-ink-700">{p.category}</td>
                <td className="p-4 text-right">{inr(p.price)}</td>
                <td className="p-4 text-right">{p.stock}</td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button data-testid={`adm-edit-${p.product_id}`} onClick={() => setEditing(p)} className="p-2 hover:text-terra-600"><Pencil size={16} strokeWidth={1.5}/></button>
                  <button data-testid={`adm-del-${p.product_id}`} onClick={() => del(p.product_id)} className="p-2 hover:text-terra-600"><Trash2 size={16} strokeWidth={1.5}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[80] bg-ink-900/60 flex items-center justify-center px-4">
          <form onSubmit={save} className="w-full max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-auto">
            <h3 className="font-serif text-2xl mb-4">{editing.product_id ? "Edit product" : "New product"}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input data-testid="prod-name" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" className="border border-bone-300 rounded p-2 sm:col-span-2"/>
              <input data-testid="prod-price" required type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="Price (₹)" className="border border-bone-300 rounded p-2"/>
              <input type="number" value={editing.mrp || ""} onChange={(e) => setEditing({ ...editing, mrp: e.target.value })} placeholder="MRP" className="border border-bone-300 rounded p-2"/>
              <input data-testid="prod-image" required value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="Image URL or /images/x.jpg" className="border border-bone-300 rounded p-2 sm:col-span-2"/>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="border border-bone-300 rounded p-2">
                {["Ganga Jal","Puja Samagri","Decorative","Murti","Prasad"].map(c=> <option key={c}>{c}</option>)}
              </select>
              <input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} placeholder="Stock" className="border border-bone-300 rounded p-2"/>
              <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" className="border border-bone-300 rounded p-2 sm:col-span-2 h-24"/>
              <label className="flex items-center gap-2 sm:col-span-2 text-sm">
                <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /> Featured
              </label>
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="px-5 py-2 rounded-full border border-ink-900 text-sm">Cancel</button>
              <button data-testid="prod-save" type="submit" className="px-5 py-2 rounded-full bg-terra-600 text-bone-50 hover:bg-terra-700 text-sm">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Orders() {
  const [list, setList] = useState([]);
  const load = () => api.get("/admin/orders").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const setStatus = async (id, status) => {
    try { await api.put(`/admin/orders/${id}/status`, { status }); toast.success("Updated"); load(); }
    catch (err) { toast.error(formatErr(err)); }
  };

  return (
    <div className="p-8">
      <h1 className="font-serif text-4xl mb-6">Orders</h1>
      <div className="bg-white border border-bone-300 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bone-100 text-ink-700">
            <tr>
              <th className="text-left p-4">Order</th>
              <th className="text-left p-4">Customer</th>
              <th className="text-left p-4">Payment</th>
              <th className="text-right p-4">Total</th>
              <th className="text-left p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.order_id} data-testid={`adm-order-${o.order_id}`} className="border-t border-bone-300">
                <td className="p-4 font-mono text-xs">{o.order_id}</td>
                <td className="p-4">{o.address?.full_name}<div className="text-xs text-ink-500">{o.address?.phone}</div></td>
                <td className="p-4 capitalize">{o.payment_method} · {o.payment_status}</td>
                <td className="p-4 text-right">{inr(o.total)}</td>
                <td className="p-4">
                  <select data-testid={`adm-status-${o.order_id}`} value={o.status} onChange={(e) => setStatus(o.order_id, e.target.value)} className="border border-bone-300 rounded p-1.5 text-sm">
                    {["pending","confirmed","shipped","delivered","cancelled"].map(s=> <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <div className="flex bg-bone-50 min-h-screen text-ink-900">
      <Sidebar />
      <div className="flex-1">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}
