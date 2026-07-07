"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/toast";
import { PlusCircle, Utensils } from "lucide-react";

export default function ComplementaryOrdersView({ hostelId }: { hostelId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/warden/complementary-orders?hostelId=${hostelId}`);
      if (!res.ok) throw new Error("Failed to load complementary orders");
      setOrders(await res.json());
    } catch (e: any) {
      notify.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hostelId]);

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch(`/api/warden/complementary-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forDate: formData.get("forDate"),
          category: formData.get("category"),
          reason: formData.get("reason"),
          breakfastQty: parseInt(formData.get("breakfastQty") as string) || 0,
          lunchQty: parseInt(formData.get("lunchQty") as string) || 0,
          dinnerQty: parseInt(formData.get("dinnerQty") as string) || 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create order");
      notify.success("Complementary order recorded");
      (e.target as HTMLFormElement).reset();
      loadData();
    } catch (e: any) {
      notify.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#4b5563]">
        <div className="animate-pulse h-64 w-full bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Create Order Form */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2">
          <Utensils className="size-5 text-[#4b5563]" />
          <h3 className="font-medium text-[#1a1a1a]">Record Complementary Order</h3>
        </div>
        <form onSubmit={handleCreateOrder} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-medium text-[#4b5563] mb-1">Date</label>
              <input name="forDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full h-[36px] px-3 rounded-md border border-[#e5e7eb] text-[13px]" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#4b5563] mb-1">Category</label>
              <select name="category" required className="w-full h-[36px] px-3 rounded-md border border-[#e5e7eb] text-[13px]">
                <option value="GUEST">Guest</option>
                <option value="STAFF">Staff</option>
                <option value="EVENT">Event</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="lg:col-span-3">
              <label className="block text-[13px] font-medium text-[#4b5563] mb-1">Reason</label>
              <input name="reason" type="text" required placeholder="e.g. Guest - visiting parents of tenant" className="w-full h-[36px] px-3 rounded-md border border-[#e5e7eb] text-[13px]" />
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-[#4b5563] mb-1">Breakfast Qty</label>
              <input name="breakfastQty" type="number" min="0" defaultValue="0" className="w-full h-[36px] px-3 rounded-md border border-[#e5e7eb] text-[13px]" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#4b5563] mb-1">Lunch Qty</label>
              <input name="lunchQty" type="number" min="0" defaultValue="0" className="w-full h-[36px] px-3 rounded-md border border-[#e5e7eb] text-[13px]" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#4b5563] mb-1">Dinner Qty</label>
              <input name="dinnerQty" type="number" min="0" defaultValue="0" className="w-full h-[36px] px-3 rounded-md border border-[#e5e7eb] text-[13px]" />
            </div>
          </div>
          <button type="submit" className="h-[36px] px-4 rounded-md bg-[#1f2937] text-white text-[13px] font-medium flex items-center gap-2 hover:bg-[#111827] transition-colors">
            <PlusCircle className="size-4" /> Record Order
          </button>
        </form>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb]">
          <h3 className="font-medium text-[#1a1a1a]">Order History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="px-4 py-3 text-left text-[13px] font-medium text-[#4b5563]">Date</th>
                <th className="px-4 py-3 text-left text-[13px] font-medium text-[#4b5563]">Category</th>
                <th className="px-4 py-3 text-left text-[13px] font-medium text-[#4b5563]">Reason</th>
                <th className="px-4 py-3 text-left text-[13px] font-medium text-[#4b5563]">Meals (B / L / D)</th>
                <th className="px-4 py-3 text-right text-[13px] font-medium text-[#4b5563]">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#4b5563]">No complementary orders recorded.</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#f9fafb]">
                    <td className="px-4 py-3 text-[13px] text-[#1a1a1a]">{new Date(o.forDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[13px] text-[#1a1a1a]">{o.category}</td>
                    <td className="px-4 py-3 text-[13px] text-[#1a1a1a]">{o.reason}</td>
                    <td className="px-4 py-3 text-[13px] text-[#1a1a1a]">{o.breakfastQty} / {o.lunchQty} / {o.dinnerQty}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-[#1a1a1a] text-right">₹{(o.totalCostPaise / 100).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
