"use client";
import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

// Update the interface at the top:
interface InspectorActivity {
  user_email: string;
  user_name: string;
  user_role: string;
  first_activity_date: string; // Changed from activity_date
  last_activity_date: string; // New field
  unique_sevaks: number;
  total_transactions: number;
  total_added: number;
  total_deducted: number;
  attendance_points: number;
}

interface InspectorTransaction {
  id: number;
  sevak_id: string;
  sevak_name: string;
  sevak_gender: string;
  transaction_type: string;
  points_change: number;
  points_before: number;
  points_after: number;
  description: string;
  device_timestamp: string;
}

export default function InspectorActivityPage() {
  const { user, isLoaded } = useUser();
  const [activities, setActivities] = useState<InspectorActivity[]>([]);
  const [selectedInspector, setSelectedInspector] = useState<string | null>(
    null
  );
  const [inspectorTransactions, setInspectorTransactions] = useState<
    InspectorTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const isAdmin = user?.publicMetadata?.role === "admin";

  if (isLoaded && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">
            Access Denied
          </h1>
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
      fetchInspectorActivity();
    }
  }, [isLoaded, isAdmin]);

  const fetchInspectorActivity = async () => {
    setIsLoading(true);
    try {
      let url = "/api/inspector-activity";
      const params = new URLSearchParams();

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setActivities(result.activities || []);
      } else {
        setMessage(`❌ ${result.error || "Failed to load inspector activity"}`);
      }
    } catch (error) {
      console.error("Fetch inspector activity error:", error);
      setMessage("❌ Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInspectorTransactions = async (inspectorEmail: string) => {
    setIsLoadingTransactions(true);
    setSelectedInspector(inspectorEmail);

    try {
      let url = `/api/inspector-activity?inspectorEmail=${encodeURIComponent(
        inspectorEmail
      )}`;
      const params = new URLSearchParams();

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      if (params.toString()) url += `&${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setInspectorTransactions(result.transactions || []);
      } else {
        setMessage(`❌ ${result.error || "Failed to load transactions"}`);
      }
    } catch (error) {
      console.error("Fetch transactions error:", error);
      setMessage("❌ Network error occurred");
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "ADD":
        return "➕";
      case "DEDUCT":
        return "➖";
      case "ATTENDANCE":
        return "⏰";
      case "INITIAL":
        return "🎯";
      default:
        return "📝";
    }
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
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Annakut Point System
              </h1>
              <p className="text-slate-600">
                Welcome, {user?.firstName} • Role: Admin
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <UserButton
                appearance={{ elements: { userButtonAvatarBox: "w-10 h-10" } }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white/60 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto">
            <Link
              href="/dashboard"
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              🏠 Home
            </Link>
            <Link
              href="/attendance"
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              ⏰ Mark Attendance
            </Link>
            <Link
              href="/add-sevak"
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              👥 Add Sevak
            </Link>
            <Link
              href="/leaderboard"
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              🏆 Leaderboard
            </Link>
            <Link
              href="/inspector-activity"
              className="py-4 px-2 border-b-2 border-orange-500 text-orange-600 font-medium whitespace-nowrap"
            >
              👁️ User Activity
            </Link>
            <Link
              href="/sevak-feedback"
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              💬 Sevak Feedback
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Message Display */}
        {message && (
          <div className="mb-8">
            <div
              className={`p-4 rounded-2xl border ${
                message.includes("✅")
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{message}</p>
                <button
                  onClick={() => setMessage("")}
                  className="text-slate-400 hover:text-slate-600 text-xl"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-3xl">👁️</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            User Activity Dashboard
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Monitor all User activities and track point transactions across
            the system.
          </p>
        </div>

        {/* Date Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchInspectorActivity}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? "⟳" : "🔍"} Apply Filter
              </button>
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  fetchInspectorActivity();
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors duration-200"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Inspector Activity Summary */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">
            User Summary
          </h3>
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading inspector activity...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
              <span className="text-4xl mb-4 block">📊</span>
              <p className="text-slate-600">
                No inspector activity found for the selected period.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity, index) => (
                <div
                  key={activity.user_email}
                  className={`backdrop-blur-sm rounded-xl shadow-lg p-6 border hover:shadow-xl transition-shadow cursor-pointer ${
                    activity.user_role === "admin"
                      ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200"
                      : "bg-white/80 border-white/20"
                  }`}
                  onClick={() =>
                    fetchInspectorTransactions(activity.user_email)
                  }
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        activity.user_role === "admin"
                          ? "bg-orange-100"
                          : "bg-purple-100"
                      }`}
                    >
                      <span className="text-2xl">
                        {activity.user_role === "admin" ? "👑" : "👤"}
                      </span>
                    </div>
                    <div className="text-right">
                      {activity.first_activity_date ===
                      activity.last_activity_date ? (
                        <span className="text-xs text-slate-500">
                          {formatDate(activity.first_activity_date)}
                        </span>
                      ) : (
                        <div className="text-xs text-slate-500">
                          <div>{formatDate(activity.first_activity_date)}</div>
                          <div>to</div>
                          <div>{formatDate(activity.last_activity_date)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-bold text-slate-800 truncate">
                      {activity.user_name}
                    </h4>
                    {activity.user_role === "admin" && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-4 truncate">
                    {activity.user_email}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">
                        Sevaks Affected:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {activity.unique_sevaks}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">
                        Total Transactions:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {activity.total_transactions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">
                        Points Added:
                      </span>
                      <span className="font-semibold text-green-600">
                        +{activity.total_added}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600">
                        Points Deducted:
                      </span>
                      <span className="font-semibold text-red-600">
                        -{activity.total_deducted}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-600">
                        Attendance Points:
                      </span>
                      <span className="font-semibold text-blue-600">
                        +{activity.attendance_points}
                      </span>
                    </div>
                  </div>

                  <button
                    className={`mt-4 w-full px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                      activity.user_role === "admin"
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-purple-500 hover:bg-purple-600"
                    }`}
                  >
                    View Details →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Transactions */}
        {selectedInspector && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                Detailed Transactions for {selectedInspector}
              </h3>
              <button
                onClick={() => {
                  setSelectedInspector(null);
                  setInspectorTransactions([]);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {isLoadingTransactions ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading transactions...</p>
              </div>
            ) : inspectorTransactions.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <span className="text-4xl mb-4 block">📝</span>
                <p className="text-slate-600">No transactions found.</p>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                          Time
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                          Sevak
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          Type
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          Points Change
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          Before → After
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectorTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-600">
                              {formatDateTime(transaction.device_timestamp)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-semibold text-slate-800">
                                {transaction.sevak_name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {transaction.sevak_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center space-x-1">
                              <span>
                                {getTransactionIcon(
                                  transaction.transaction_type
                                )}
                              </span>
                              <span className="text-sm font-medium text-slate-700">
                                {transaction.transaction_type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`text-lg font-bold ${
                                transaction.points_change > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.points_change > 0 ? "+" : ""}
                              {transaction.points_change}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-slate-600">
                              {transaction.points_before} →{" "}
                              {transaction.points_after}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
