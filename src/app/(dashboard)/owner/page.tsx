export default function OwnerPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Dashboard Pemilik</h2>
        <p className="mt-2 text-slate-600">
          Urus menu, staf, jadual, inventori, dan laporan jualan outlet anda.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Menu", "Staf", "Laporan", "Tetapan"].map((item) => (
            <li
              key={item}
              className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
            >
              {item} — akan datang
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
