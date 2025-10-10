"use client";
import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

interface SevakWithFeedback {
  sevak_internal_id: number;
  sevak_id: string;
  sevak_name: string;
  sevak_gender: 'male' | 'female';
  sevak_points: number;
  feedback_count: number;
  latest_feedback_time: string;
}

interface FeedbackDetail {
  id: number;
  sevak_id: number;
  reviewer_email: string;
  reviewer_name: string;
  reviewer_role: 'admin' | 'inspector';
  feedback_text: string;
  device_timestamp: string;
  created_at: string;
  sevak_name: string;
  sevak_qr_id: string;
  sevak_gender: 'male' | 'female';
  sevak_points: number;
}

interface FeedbackStats {
  total_feedback: number;
  total_sevaks_with_feedback: number;
  male_sevaks_feedback: number;
  female_sevaks_feedback: number;
}

interface FeedbackModalProps {
  sevak: SevakWithFeedback | null;
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ sevak, isOpen, onClose }) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && sevak) {
      fetchFeedbackDetails();
    }
  }, [isOpen, sevak]);

  const fetchFeedbackDetails = async () => {
    if (!sevak) return;

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/get-feedback?sevakId=${sevak.sevak_id}`);
      const result = await response.json();

      if (response.ok) {
        setFeedbacks(result.feedback || []);
      } else {
        setError(result.error || "Failed to load feedback");
      }
    } catch (error) {
      console.error("Fetch feedback error:", error);
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const exportToCSV = () => {
    if (!sevak || feedbacks.length === 0) return;

    const csvData = feedbacks.map((f) => ({
      Date: formatDate(f.device_timestamp),
      Reviewer: f.reviewer_name,
      Role: f.reviewer_role,
      Feedback: f.feedback_text.replace(/"/g, '""'),
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sevak.sevak_name}_${sevak.sevak_id}_feedback.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">
                Feedback for {sevak?.sevak_name}
              </h3>
              <p className="text-slate-600">
                {sevak?.sevak_id} • {sevak?.sevak_gender === 'male' ? '👨 Male' : '👩 Female'} • Points: {sevak?.sevak_points}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {feedbacks.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                  title="Export to CSV"
                >
                  📊 Export
                </button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-slate-600">Loading feedback...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <span className="text-4xl mb-4 block">❌</span>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <span className="text-4xl mb-4 block">💬</span>
                <p className="text-slate-600">No feedback found</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-6 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-purple-50 rounded-xl">
                  <span className="text-2xl font-bold text-purple-600 mr-2">
                    {feedbacks.length}
                  </span>
                  <span className="text-sm text-purple-700">
                    Total Feedback{feedbacks.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">
                            {feedback.reviewer_role === 'admin' ? '👑' : '👤'}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">
                            {feedback.reviewer_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {feedback.reviewer_role.toUpperCase()} • {formatDate(feedback.device_timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {feedback.feedback_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-4 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              {feedbacks.length > 0 && `Showing ${feedbacks.length} feedback${feedbacks.length > 1 ? 's' : ''}`}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SevakFeedbackPage() {
  const { user, isLoaded } = useUser();
  const [sevaks, setSevaks] = useState<SevakWithFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [selectedSevak, setSelectedSevak] = useState<SevakWithFeedback | null>(null);

  const isAdmin = user?.publicMetadata?.role === "admin";

  if (isLoaded && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600 mb-4">Only admins can access this page.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (isLoaded && isAdmin) {
      fetchFeedback();
      fetchStats();
    }
  }, [isLoaded, isAdmin, genderFilter]);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const url = genderFilter === 'all'
        ? '/api/get-feedback'
        : `/api/get-feedback?gender=${genderFilter}`;

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setSevaks(result.sevaks || []);
      } else {
        setMessage(`❌ ${result.error || "Failed to load feedback"}`);
      }
    } catch (error) {
      console.error("Fetch feedback error:", error);
      setMessage("❌ Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/get-feedback?stats=true');
      const result = await response.json();

      if (response.ok) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Fetch stats error:", error);
    }
  };

  const filteredSevaks = sevaks.filter((sevak) =>
    sevak.sevak_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sevak.sevak_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Annakut Point System</h1>
              <p className="text-slate-600">Welcome, {user?.firstName} • Role: Admin</p>
            </div>
            <div className="flex items-center space-x-4">
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10" } }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto">
            <Link href="/dashboard" className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors">
              🏠 Home
            </Link>
            <Link href="/attendance" className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors">
              ⏰ Mark Attendance
            </Link>
            <Link href="/add-sevak" className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors">
              👥 Add Sevak
            </Link>
            <Link href="/leaderboard" className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors">
              🏆 Leaderboard
            </Link>
            <Link href="/inspector-activity" className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors">
              👁️ User Activity
            </Link>
            <Link href="/sevak-feedback" className="py-4 px-2 border-b-2 border-orange-500 text-orange-600 font-medium whitespace-nowrap">
              💬 Sevak Feedback
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className="mb-8">
            <div className={`p-4 rounded-2xl border ${message.includes("✅") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{message}</p>
                <button onClick={() => setMessage("")} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-3xl">💬</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Sevak Feedback</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">View all feedback and reviews submitted for sevaks.</p>
        </div>

        {/* {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
              <div className="text-2xl font-bold text-purple-600 mb-1">{stats.total_feedback}</div>
              <div className="text-slate-600 text-sm">Total Feedback</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
              <div className="text-2xl font-bold text-blue-600 mb-1">{stats.total_sevaks_with_feedback}</div>
              <div className="text-slate-600 text-sm">Sevaks with Feedback</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
              <div className="text-2xl font-bold text-cyan-600 mb-1">{stats.male_sevaks_feedback}</div>
              <div className="text-slate-600 text-sm">Male Sevaks</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
              <div className="text-2xl font-bold text-pink-600 mb-1">{stats.female_sevaks_feedback}</div>
              <div className="text-slate-600 text-sm">Female Sevaks</div>
            </div>
          </div>
        )} */}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white/20">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                genderFilter === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Sevaks
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                genderFilter === 'male'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                genderFilter === 'female'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Female
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-slate-800"
              />
            </div>

            <button
              onClick={fetchFeedback}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {isLoading ? "⟳" : "🔄"} Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading feedback...</p>
          </div>
        ) : filteredSevaks.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <span className="text-4xl mb-4 block">💬</span>
            <p className="text-slate-600">
              {searchTerm ? "No sevaks found matching your search." : "No feedback submitted yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSevaks.map((sevak) => (
              <div
                key={sevak.sevak_internal_id}
                onClick={() => setSelectedSevak(sevak)}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">
                        {sevak.sevak_gender === 'male' ? '👨' : '👩'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{sevak.sevak_name}</h3>
                      <p className="text-sm text-slate-500">{sevak.sevak_id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Points:</span>
                    <span className="font-semibold text-slate-800">{sevak.sevak_points}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Feedback Count:</span>
                    <span className="font-bold text-purple-600 text-lg">{sevak.feedback_count}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    Latest: {formatDate(sevak.latest_feedback_time)}
                  </div>
                </div>

                <button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                  <span>View Feedback</span>
                  <span>→</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-slate-500 text-sm">
          Showing {filteredSevaks.length} of {sevaks.length} sevaks with feedback
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>

      <FeedbackModal
        sevak={selectedSevak}
        isOpen={selectedSevak !== null}
        onClose={() => setSelectedSevak(null)}
      />
    </div>
  );
}