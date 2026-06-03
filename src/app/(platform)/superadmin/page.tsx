export default function SuperadminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Dashboard Platform</h2>
        <p className="mt-2 text-slate-600">
          Urus kedai berdaftar, langganan, dan tetapan sistem seluruh platform.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {["Kedai", "Langganan", "Pengguna"].map((item) => (
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
