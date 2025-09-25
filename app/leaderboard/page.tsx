"use client";
import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

interface SevakData {
  id: number;
  sevak_id: string;
  name: string;
  points: number;
  is_active: boolean;
  created_at: string;
  total_transactions: number;
  total_attendance_days: number;
  total_added: number;
  total_deducted: number;
  attendance_points: number;
  on_time_days: number;
  late_days: number;
  rank_position: number;
}

// import { getUserRole, isAdmin } from '@/lib/roles';

export default function LeaderboardPage() {
  const { user, isLoaded } = useUser();
  const [sevaks, setSevaks] = useState<SevakData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "points" | "attendance" | "transactions"
  >("points");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check if user is admin using our utility function
  const isAdmin = user?.publicMetadata?.role === "admin";

  // Redirect if not admin
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
      fetchLeaderboard();
    }
  }, [isLoaded, isAdmin]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/leaderboard");
      const result = await response.json();

      if (response.ok) {
        setSevaks(result.sevaks || []);
      } else {
        setMessage(`❌ ${result.error || "Failed to load leaderboard"}`);
      }
    } catch (error) {
      console.error("Fetch leaderboard error:", error);
      setMessage("❌ Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSevak = async (sevakId: string, sevakName: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `⚠️ DELETE CONFIRMATION\n\n` +
        `Are you sure you want to delete "${sevakName}" (${sevakId})?\n\n` +
        `This will:\n` +
        `• Mark the sevak as inactive\n` +
        `• Hide them from future scans\n` +
        `• Keep all transaction history\n\n` +
        `This action cannot be easily undone.\n\n` +
        `Type "DELETE" in the next prompt to confirm.`
    );

    if (!confirmed) {
      return;
    }

    // Additional confirmation
    const confirmText = prompt(
      `To confirm deletion of "${sevakName}", please type "DELETE" (all caps):`
    );

    if (confirmText !== "DELETE") {
      setMessage("❌ Deletion cancelled - confirmation text did not match");
      return;
    }

    setDeletingId(sevakId);

    try {
      console.log(`Attempting to delete sevak: ${sevakId}`);

      const response = await fetch("/api/delete-sevak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sevakId: sevakId }),
      });

      console.log(`Delete API response status: ${response.status}`);
      const result = await response.json();
      console.log("Delete API result:", result);

      if (response.ok) {
        setMessage(`✅ Successfully deleted ${sevakName} (${sevakId})`);
        // Remove from local state immediately
        setSevaks((prevSevaks) =>
          prevSevaks.filter((s) => s.sevak_id !== sevakId)
        );
        // Also refresh from server
        setTimeout(() => fetchLeaderboard(), 1000);
      } else {
        setMessage(`❌ Failed to delete: ${result.error || "Unknown error"}`);
        console.error("Delete failed:", result);
      }
    } catch (error) {
      console.error("Delete sevak network error:", error);
      setMessage("❌ Network error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadQRCode = async (sevakId: string, sevakName: string) => {
    try {
      const response = await fetch("/api/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sevakId,
          sevakName,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        // 👇 Correct extension
        a.download = `${sevakId}_${sevakName.replace(/\s+/g, "_")}_QRCode.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setMessage(`✅ QR code downloaded for ${sevakName}!`);
      } else {
        const result = await response.json();
        setMessage(`❌ ${result.error || "Failed to generate QR code"}`);
      }
    } catch (error) {
      console.error("QR download error:", error);
      setMessage("❌ Failed to download QR code");
    }
  };

  // Filter and sort sevaks
  const filteredAndSortedSevaks = sevaks
    .filter(
      (sevak) =>
        sevak.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sevak.sevak_id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "attendance":
          return b.total_attendance_days - a.total_attendance_days;
        case "transactions":
          return b.total_transactions - a.total_transactions;
        default:
          return b.points - a.points;
      }
    });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  const getPointsColor = (points: number) => {
    if (points >= 200) return "text-green-600";
    if (points >= 150) return "text-blue-600";
    if (points >= 100) return "text-orange-600";
    return "text-slate-600";
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
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-10 h-10",
                  },
                }}
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
              className="py-4 px-2 border-b-2 border-orange-500 text-orange-600 font-medium whitespace-nowrap"
            >
              🏆 Leaderboard
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
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🏆</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Sevak Leaderboard
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Complete overview of all sevaks with their points, attendance, and
            activity details.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800"
              />
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-slate-700">
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
              >
                <option value="points">Points</option>
                <option value="attendance">Attendance</option>
                <option value="transactions">Transactions</option>
              </select>

              <button
                onClick={fetchLeaderboard}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? "⟳" : "🔄"} Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {sevaks.length}
            </div>
            <div className="text-slate-600 text-sm">Total Sevaks</div>
          </div>
          {/* <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {sevaks.reduce((sum, s) => sum + s.points, 0)}
            </div>
            <div className="text-slate-600 text-sm">Total Points</div>
          </div> */}
          {/* <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {sevaks.reduce((sum, s) => sum + s.total_attendance_days, 0)}
            </div>
            <div className="text-slate-600 text-sm">Total Attendance</div>
          </div> */}
          {/* <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {sevaks.reduce((sum, s) => sum + s.total_transactions, 0)}
            </div>
            <div className="text-slate-600 text-sm">Total Transactions</div>
          </div> */}
        </div>

        {/* Leaderboard Table */}
        {isLoading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading leaderboard...</p>
          </div>
        ) : filteredAndSortedSevaks.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <span className="text-4xl mb-4 block">😔</span>
            <p className="text-slate-600">
              {searchTerm
                ? "No sevaks found matching your search."
                : "No sevaks found."}
            </p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Sevak
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                      Points
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                      Attendance
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                      Transactions
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedSevaks.map((sevak, index) => (
                    <tr
                      key={sevak.id}
                      className="border-b hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-2xl">{getRankIcon(index)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-slate-800">
                            {sevak.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {sevak.sevak_id}
                          </div>
                          <div className="text-xs text-slate-400">
                            Created:{" "}
                            {new Date(sevak.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div
                          className={`text-2xl font-bold ${getPointsColor(
                            sevak.points
                          )}`}
                        >
                          {sevak.points}
                        </div>
                        <div className="text-xs text-green-600">
                          +{sevak.total_added}
                        </div>
                        <div className="text-xs text-red-600">
                          -{sevak.total_deducted}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-lg font-semibold text-slate-800">
                          {sevak.total_attendance_days}
                        </div>
                        <div className="text-xs text-green-600">
                          On time: {sevak.on_time_days}
                        </div>
                        <div className="text-xs text-yellow-600">
                          Late: {sevak.late_days}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-lg font-semibold text-slate-800">
                          {sevak.total_transactions}
                        </div>
                        <div className="text-xs text-blue-600">
                          +{sevak.attendance_points} attendance
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() =>
                              downloadQRCode(sevak.sevak_id, sevak.name)
                            }
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors duration-200"
                            title="Download QR Code"
                          >
                            🆔
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSevak(sevak.sevak_id, sevak.name)
                            }
                            disabled={deletingId === sevak.sevak_id}
                            className="px-3 py-1 bg-white hover:bg-gray-200 disabled:bg-red-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors duration-200 flex items-center space-x-1"
                            title="Delete Sevak"
                          >
                            {deletingId === sevak.sevak_id ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span>❌</span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          Showing {filteredAndSortedSevaks.length} of {sevaks.length} sevaks
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>
    </div>
  );
}
