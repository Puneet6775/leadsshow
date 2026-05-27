'use client';

import { useState, useEffect, useRef } from 'react';

type Lead = {
  id: string;
  businessName: string;
  primaryCategory?: string | null;
  phonePrimary?: string | null;
  websiteUrl?: string | null;
  addressLine1?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  googleMapsUrl?: string | null;
  leadScore?: number | null;
};

export default function SearchForm() {
  const [form, setForm] = useState({
    category: '',
    city: '',
    state: '',
    country: 'India',
  });

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchJobId, setSearchJobId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    category: string[];
    city: string[];
    state: string[];
  }>({ category: [], city: [], state: [] });
  const [activeSuggestion, setActiveSuggestion] = useState<'category' | 'city' | 'state' | null>(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState('');
  const suggestionsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Set current date
  useEffect(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDate(date.toLocaleDateString('en-US', options));
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('input') && !target.closest('[class*="suggestion"]')) {
        setActiveSuggestion(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch suggestions when user types
  useEffect(() => {
    const fetchSuggestions = async (field: 'category' | 'city' | 'state', value: string) => {
      if (!value || value.length < 1) {
        setSuggestions((prev) => ({ ...prev, [field]: [] }));
        return;
      }

      try {
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(value)}&type=${field}`);
        const data = await response.json();
        setSuggestions((prev) => ({ ...prev, [field]: data }));
      } catch (err) {
        console.error(`Failed to fetch ${field} suggestions:`, err);
      }
    };

    const timer = setTimeout(() => {
      if (form.category) fetchSuggestions('category', form.category);
      if (form.city) fetchSuggestions('city', form.city);
      if (form.state) fetchSuggestions('state', form.state);
    }, 300);

    return () => clearTimeout(timer);
  }, [form.category, form.city, form.state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client-side validation to avoid sending requests that will 400
    if (form.category.trim().length < 2 || form.city.trim().length < 2) {
      setError('Please enter at least 2 characters for both category and city');
      return;
    }

    setLoading(true);
    setCurrentPage(1);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search leads');
      }

      setLeads(data.leads || []);
      setTotalLeads(data.total || 0);
      setSearchJobId(data.searchJobId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const handleSuggestionSelect = (field: 'category' | 'city' | 'state', value: string) => {
    setForm({ ...form, [field]: value });
    setActiveSuggestion(null);
    setSuggestions((prev) => ({ ...prev, [field]: [] }));
  };

  const handleInputChange = (field: 'category' | 'city' | 'state', value: string) => {
    setForm({ ...form, [field]: value });
    setActiveSuggestion(field);
  };

  const handlePageChange = async (newPage: number) => {
    setError(null);

    if (form.category.trim().length < 2 || form.city.trim().length < 2) {
      setError('Please enter at least 2 characters for both category and city');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, page: newPage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch page');
      }

      setLeads(data.leads || []);
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!searchJobId) {
      setError('No search results to download. Please run a search first.');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exports/search?searchJobId=${encodeURIComponent(searchJobId)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download Excel file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `leads-${Date.now()}.xlsx`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download Excel file');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-4"
      >
        <div className="relative">
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="E.g. Skin, Gym, Restaurant"
            value={form.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
          />
          {activeSuggestion === 'category' && suggestions.category.length > 0 && (
            <div
              ref={(el) => { suggestionsRef.current['category'] = el; }}
              className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-slate-600 bg-slate-900 shadow-lg"
            >
              {suggestions.category.map((sugg, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionSelect('category', sugg)}
                  className="cursor-pointer border-b border-slate-700 px-4 py-2 hover:bg-slate-800"
                >
                  {sugg}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="City"
            value={form.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
          />
          {activeSuggestion === 'city' && suggestions.city.length > 0 && (
            <div
              ref={(el) => { suggestionsRef.current['city'] = el; }}
              className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-slate-600 bg-slate-900 shadow-lg"
            >
              {suggestions.city.map((sugg, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionSelect('city', sugg)}
                  className="cursor-pointer border-b border-slate-700 px-4 py-2 hover:bg-slate-800"
                >
                  {sugg}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <input
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="State"
            value={form.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
          />
          {activeSuggestion === 'state' && suggestions.state.length > 0 && (
            <div
              ref={(el) => { suggestionsRef.current['state'] = el; }}
              className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-slate-600 bg-slate-900 shadow-lg"
            >
              {suggestions.state.map((sugg, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionSelect('state', sugg)}
                  className="cursor-pointer border-b border-slate-700 px-4 py-2 hover:bg-slate-800"
                >
                  {sugg}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search Leads'}
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Results {totalLeads > 0 && `(${totalLeads} total)`}
          </h2>
          {currentDate && (
            <p className="text-sm text-slate-400 mt-1">{currentDate}</p>
          )}
        </div>

        {totalLeads > 0 && (
          <button
            onClick={handleDownloadExcel}
            disabled={downloading || !searchJobId}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? 'Downloading...' : '📥 Download Excel'}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Score</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-medium">
                    {lead.googleMapsUrl ? (
                      <a
                        href={lead.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-cyan-300"
                      >
                        {lead.businessName}
                      </a>
                    ) : (
                      lead.businessName
                    )}
                  </td>
                  <td className="px-4 py-3">{lead.primaryCategory || '-'}</td>
                  <td className="px-4 py-3">{lead.phonePrimary || '-'}</td>
                  <td className="px-4 py-3">
                    {lead.websiteUrl ? (
                      <a
                        href={lead.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300"
                      >
                        Visit
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">{lead.addressLine1 || '-'}</td>
                  <td className="px-4 py-3">
                    {lead.rating || '-'} {lead.reviewCount ? `(${lead.reviewCount})` : ''}
                  </td>
                  <td className="px-4 py-3">{lead.leadScore || '-'}</td>
                </tr>
              ))}

              {!leads.length && (
                <tr>
                  <td className="px-4 py-8 text-slate-400" colSpan={7}>
                    No leads yet. Run a search to load businesses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {leads.length > 0 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-slate-400">
            Page {currentPage} of {Math.ceil(totalLeads / 10000)}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage * 10000 >= totalLeads || loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}