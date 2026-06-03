export default function KitchenPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Kitchen Display (KDS)</h2>
        <p className="mt-2 text-slate-600">
          Senarai pesanan aktif mengikut status: baharu, sedang disediakan, siap.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Baharu", "Sedang disediakan", "Siap"].map((status) => (
            <div
              key={status}
              className="min-h-[200px] rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="font-medium text-slate-700">{status}</h3>
              <p className="mt-4 text-center text-sm text-slate-400">
                Tiada pesanan — akan datang
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
