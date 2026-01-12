"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/NavBar';
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/reports?page=${page}&limit=10&search=${encodeURIComponent(debouncedSearch)}`);
        if (!res.ok) {
          if (res.status === 403) {
            setError("Access Denied. You are not an admin.");
            setTimeout(() => router.push('/dashboard'), 3000);
          } else {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch reports: ${res.status}`);
          }
          return;
        }
        const data = await res.json();
        setReports(data.reports);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [status, router, page, debouncedSearch]);

  const handleAction = async (reportId, action) => {
    let confirmMessage = 'Dismiss this report?';
    if (action === 'delete_content') confirmMessage = 'Are you sure you want to delete the content? This cannot be undone.';
    if (action === 'ban_user') confirmMessage = 'Are you sure you want to BAN this user? They will be unable to post or comment.';
    if (action === 'unban_user') confirmMessage = 'Are you sure you want to UNBAN this user?';

    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/admin/reports?id=${reportId}&action=${action}`, { method: 'DELETE' });
      if (res.ok) {
        if (action === 'ban_user' || action === 'unban_user') {
          alert(action === 'ban_user' ? "User has been banned." : "User has been unbanned.");
          // Refresh the list to update the banned status in UI
          window.location.reload();
        } else {
          setReports(reports.filter(r => r.id !== reportId));
        }
      } else {
        const data = await res.json();
        alert(data.message || "Failed to perform action");
      }
    } catch (err) {
      console.error(err);
      alert("Error performing action");
    }
  };

  if (loading && page === 1 && !reports.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100">
        <div className="flex flex-col items-center">
          <ConnectifyLogo width={350} height={350} className="mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
        <Navbar session={session} router={router} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 font-sans text-gray-900 dark:text-slate-100">
      <Navbar session={session} router={router} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Reported Content
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
                Review and manage user reports.
              </p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
              </div>
              <div className="text-sm text-gray-500 whitespace-nowrap">
                Page {page} of {totalPages}
              </div>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-slate-400">
              {debouncedSearch ? 'No reports found matching your search.' : 'No pending reports. Good job!'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {reports.map((report) => (
                <li key={report.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition duration-150 ease-in-out">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {report.targetType}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          Reported by <span className="font-medium text-gray-900 dark:text-white">{report.reporter?.name || 'Unknown'}</span>
                        </span>
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          • {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Reason:</h4>
                        <p className="text-sm text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 p-2 rounded">
                          {report.reason || "No reason provided"}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Content:</h4>
                        <div className="text-sm text-gray-800 dark:text-slate-200 border-l-4 border-gray-300 dark:border-slate-600 pl-3 py-1">
                          {report.targetContent ? (
                            <p className="whitespace-pre-wrap line-clamp-3">{report.targetContent}</p>
                          ) : (
                            <p className="italic text-gray-500">Content not found or deleted</p>
                          )}
                          {report.targetAuthor && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">
                                Author: <span className="font-medium">{report.targetAuthor.name}</span> ({report.targetAuthor.email})
                              </p>
                              {report.targetAuthor.isBanned && (
                                <span className="text-xs text-red-600 font-bold uppercase">BANNED</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 justify-center sm:justify-start min-w-[140px]">
                      <button
                        onClick={() => handleAction(report.id, 'dismiss')}
                        className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <i className="fas fa-check mr-2 text-green-500"></i>
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAction(report.id, 'delete_content')}
                        className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <i className="fas fa-trash-alt mr-2"></i>
                        Delete Content
                      </button>
                      {report.targetAuthor && (
                        report.targetAuthor.isBanned ? (
                          <button
                            onClick={() => handleAction(report.id, 'unban_user')}
                            className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <i className="fas fa-user-check mr-2"></i>
                            Unban User
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(report.id, 'ban_user')}
                            className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            <i className="fas fa-ban mr-2"></i>
                            Ban User
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}