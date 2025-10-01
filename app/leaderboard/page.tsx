

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

interface TransactionHistory {
  device_timestamp: string;
  id: number;
  transaction_type: string;
  points_change: number;
  points_before: number;
  points_after: number;
  description: string;
  created_at: string;
  clerk_user_id: string;
  user_email?: string;
  user_name?: string;
}

interface HistoryModalProps {
  sevak: SevakData | null;
  isOpen: boolean;
  onClose: () => void;
}

interface QRModalProps {
  sevak: SevakData | null;
  isOpen: boolean;
  onClose: () => void;
}

const QRModal: React.FC<QRModalProps> = ({ sevak, isOpen, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && sevak) {
      generateQRCode();
    }
    return () => {
      if (qrCodeUrl) {
        URL.revokeObjectURL(qrCodeUrl);
      }
    };
  }, [isOpen, sevak]);

  const generateQRCode = async () => {
    if (!sevak) return;

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sevakId: sevak.sevak_id, sevakName: sevak.name }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setQrCodeUrl(url);
      } else {
        const result = await response.json();
        setError(result.error || "Failed to generate QR code");
      }
    } catch (error) {
      console.error("QR generation error:", error);
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!sevak || !qrCodeUrl) return;

    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `${sevak.sevak_id}_${sevak.name.replace(/\s+/g, "_")}_QRCode.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">
                QR Code
              </h3>
              <p className="text-slate-600">
                {sevak?.name} • {sevak?.sevak_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <span className="text-slate-600">Generating QR code...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="text-4xl mb-4">❌</span>
              <p className="text-red-600 text-center">{error}</p>
            </div>
          ) : qrCodeUrl ? (
            <div className="flex flex-col items-center">
              {/* QR Code Display */}
              <div className="bg-white p-4 rounded-xl border-2 border-slate-200 mb-6">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code for ${sevak?.name}`}
                  className="w-64 h-64"
                />
              </div>

              {/* Sevak Info */}
              <div className="text-center mb-6">
                <p className="text-lg font-semibold text-slate-800">
                  {sevak?.name}
                </p>
                <p className="text-sm text-slate-600">ID: {sevak?.sevak_id}</p>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadQRCode}
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>📥</span>
                <span>Download QR Code</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const HistoryModal: React.FC<HistoryModalProps> = ({
  sevak,
  isOpen,
  onClose,
}) => {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && sevak) {
      fetchTransactionHistory();
    }
  }, [isOpen, sevak]);

  const fetchTransactionHistory = async () => {
    if (!sevak) return;

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/sevak-history?sevakId=${sevak.sevak_id}`
      );
      const result = await response.json();

      if (response.ok) {
        setTransactions(result.transactions || []);
      } else {
        setError(result.error || "Failed to load transaction history");
      }
    } catch (error) {
      console.error("Fetch history error:", error);
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
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

  const getTransactionColor = (type: string, points: number) => {
    if (type === "DEDUCT" || points < 0) return "text-red-600";
    if (type === "ADD" || points > 0) return "text-green-600";
    if (type === "ATTENDANCE") return "text-blue-600";
    return "text-slate-600";
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
      timeZoneName: "short",
    });
  };

  const exportToCSV = () => {
    if (!sevak || transactions.length === 0) return;

    const csvData = transactions.map((t) => ({
      Date: formatDate(t.created_at),
      Type: t.transaction_type.replace("_", " "),
      "Points Change": t.points_change,
      "Points Before": t.points_before,
      "Points After": t.points_after,
      Description: t.description || "",
      "Modified By":
        t.user_email || t.user_name || `User ${t.clerk_user_id.slice(-8)}`,
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
    a.download = `${sevak.name}_${sevak.sevak_id}_history.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">
                Point History for {sevak?.name}
              </h3>
              <p className="text-slate-600">
                {sevak?.sevak_id} • Current Points: {sevak?.points}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {transactions.length > 0 && (
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-slate-600">Loading history...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <span className="text-4xl mb-4 block">❌</span>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <span className="text-4xl mb-4 block">📝</span>
                <p className="text-slate-600">No transactions found</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +
                    {transactions
                      .filter((t) => t.points_change > 0)
                      .reduce((sum, t) => sum + t.points_change, 0)}
                  </div>
                  <div className="text-sm text-green-700">Points Added</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {Math.abs(
                      transactions
                        .filter((t) => t.points_change < 0)
                        .reduce((sum, t) => sum + t.points_change, 0)
                    )}
                  </div>
                  <div className="text-sm text-red-700">Points Deducted</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      transactions.filter(
                        (t) => t.transaction_type === "ATTENDANCE"
                      ).length
                    }
                  </div>
                  <div className="text-sm text-blue-700">Attendance</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {transactions.length}
                  </div>
                  <div className="text-sm text-purple-700">
                    Total Transactions
                  </div>
                </div>
              </div>

              {/* Transaction List */}
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-slate-800">
                              {transaction.transaction_type.replace("_", " ")}
                            </span>
                            <span
                              className={`font-bold text-lg ${getTransactionColor(
                                transaction.transaction_type,
                                transaction.points_change
                              )}`}
                            >
                              {transaction.points_change > 0 ? "+" : ""}
                              {transaction.points_change}
                            </span>
                          </div>
                          {transaction.description && (
                            <p className="text-sm text-slate-600 mt-1">
                              {transaction.description}
                            </p>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            <b>Time:</b>{" "}
                            {formatDate(transaction.device_timestamp)}
                            <br />
                            <span className="text-blue-600">
                              By:{" "}
                              {transaction.user_name ||
                                "System"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600">
                          {transaction.points_before} →{" "}
                          {transaction.points_after}
                        </div>
                        <div className="text-xs text-slate-500">Points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              {transactions.length > 0 &&
                `Showing ${transactions.length} transactions`}
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
  const [selectedSevakForHistory, setSelectedSevakForHistory] =
    useState<SevakData | null>(null);
  const [selectedSevakForQR, setSelectedSevakForQR] =
    useState<SevakData | null>(null);

  // Check if user is admin
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
    const confirmed = window.confirm(
      `⚠️ DELETE CONFIRMATION\n\nAre you sure you want to delete "${sevakName}" (${sevakId})?\n\nThis will:\n• Mark the sevak as inactive\n• Hide them from future scans\n• Keep all transaction history\n\nThis action cannot be easily undone.\n\nType "DELETE" in the next prompt to confirm.`
    );

    if (!confirmed) return;

    const confirmText = prompt(
      `To confirm deletion of "${sevakName}", please type "DELETE" (all caps):`
    );

    if (confirmText !== "DELETE") {
      setMessage("❌ Deletion cancelled - confirmation text did not match");
      return;
    }

    setDeletingId(sevakId);

    try {
      const deviceTime = new Date().toISOString();

      const response = await fetch("/api/delete-sevak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sevakId: sevakId,
          deviceTime: deviceTime,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully deleted ${sevakName} (${sevakId})`);
        setSevaks((prevSevaks) =>
          prevSevaks.filter((s) => s.sevak_id !== sevakId)
        );
        setTimeout(() => fetchLeaderboard(), 1000);
      } else {
        setMessage(`❌ Failed to delete: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Delete sevak error:", error);
      setMessage("❌ Network error occurred while deleting");
    } finally {
      setDeletingId(null);
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
                            onClick={() => setSelectedSevakForHistory(sevak)}
                            className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors duration-200"
                            title="View Point History"
                          >
                            📊
                          </button>
                          <button
                            onClick={() => setSelectedSevakForQR(sevak)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors duration-200"
                            title="View QR Code"
                          >
                            🆔
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSevak(sevak.sevak_id, sevak.name)
                            }
                            disabled={deletingId === sevak.sevak_id}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors duration-200 flex items-center space-x-1"
                            title="Delete Sevak"
                          >
                            {deletingId === sevak.sevak_id ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span>🗑️</span>
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

      {/* History Modal */}
      <HistoryModal
        sevak={selectedSevakForHistory}
        isOpen={selectedSevakForHistory !== null}
        onClose={() => setSelectedSevakForHistory(null)}
      />

      {/* QR Modal */}
      <QRModal
        sevak={selectedSevakForQR}
        isOpen={selectedSevakForQR !== null}
        onClose={() => setSelectedSevakForQR(null)}
      />
    </div>
  );
}