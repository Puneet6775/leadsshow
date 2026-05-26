import SearchForm from '@/components/search-form';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.24em] text-cyan-300">
            Dashboard
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Lead Finder</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Search businesses by category and city, store the results, and export your
            lead sheet in Excel format.
          </p>
        </div>

        <SearchForm />
      </div>
    </main>
  );
}