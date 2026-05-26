import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
            Local Business Lead Finder
          </p>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Search city-wise business leads and export them to Excel.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Use Google Places powered search to find businesses by category and city,
            save them to your database, and download agency-ready lead sheets.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 hover:bg-cyan-400"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}