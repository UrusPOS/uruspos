export default function CashierPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">POS Kaunter</h2>
        <p className="mt-2 text-slate-600">
          Ambil pesanan, tambah item, terima bayaran tunai atau digital, dan cetak
          resit.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Grid menu &amp; pesanan — akan datang
          </div>
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Ringkasan bil — akan datang
          </div>
        </div>
      </section>
    </div>
  );
}
