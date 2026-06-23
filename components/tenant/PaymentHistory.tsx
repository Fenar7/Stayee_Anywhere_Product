import { FileText } from "lucide-react";

export function PaymentHistory({ payments, formatDate }: { payments: any[]; formatDate: (dateStr: string) => string }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" /> Ledger History
      </h2>
      {payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left pb-2 font-semibold">Amount</th>
                <th className="text-left pb-2 font-semibold">Date</th>
                <th className="text-left pb-2 font-semibold hidden sm:table-cell">UTR</th>
                <th className="text-right pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pmt) => (
                <tr key={pmt.id} className="border-b last:border-0">
                  <td className="py-2.5 font-semibold">₹ {pmt.amountPaid.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 text-muted-foreground">{formatDate(pmt.createdAt)}</td>
                  <td className="py-2.5 text-muted-foreground hidden sm:table-cell max-w-24 truncate">{pmt.transactionRefNo || "—"}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={
                        pmt.paymentStatus === "PENDING"
                          ? "inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[9px] font-bold text-yellow-800 uppercase dark:bg-yellow-900/30 dark:text-yellow-400"
                          : pmt.paymentStatus === "PAID"
                          ? "inline-block rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-800 uppercase dark:bg-green-900/30 dark:text-green-400"
                          : "inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 uppercase dark:bg-amber-900/30 dark:text-amber-400"
                      }
                    >
                      {pmt.paymentStatus === "PENDING" ? "Verifying" : pmt.paymentStatus === "PAID" ? "Settled" : "Partial"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">No payment records found.</p>
      )}
    </div>
  );
}
