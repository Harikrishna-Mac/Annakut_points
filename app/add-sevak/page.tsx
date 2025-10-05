"use client";
import { useState, useRef } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

// import { getUserRole, isAdmin } from '@/lib/roles';

export default function AddSevakPage() {
  const { user, isLoaded } = useUser();
  const [sevakName, setSevakName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [lastCreatedSevak, setLastCreatedSevak] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sevakGender, setSevakGender] = useState<"male" | "female">("male");
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

  // Update the handleSingleSevakSubmit function in app/add-sevak/page.tsx

  const handleSingleSevakSubmit = async () => {
    if (!sevakName.trim()) {
      setMessage("❌ Please enter a sevak name");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      // Capture device time
      const deviceTime = new Date().toISOString();

      const response = await fetch("/api/create-sevak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sevakName.trim(),
          gender: sevakGender,
          deviceTime: deviceTime,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(
          `✅ Successfully created sevak: ${result.sevak.name} (ID: ${result.sevak.sevak_id})`
        );
        setLastCreatedSevak(result.sevak);
        setSevakName("");
      } else {
        setMessage(`❌ ${result.error || "Failed to create sevak"}`);
      }
    } catch (error) {
      console.error("Create sevak error:", error);
      setMessage("❌ Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      setMessage("❌ Please select a file to upload");
      return;
    }

    // Validate file type
    if (
      !bulkFile.name.endsWith(".csv") &&
      !bulkFile.name.endsWith(".xlsx") &&
      !bulkFile.name.endsWith(".xls")
    ) {
      setMessage("❌ Please upload a CSV or Excel file");
      return;
    }

    setIsBulkUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", bulkFile);

      const response = await fetch("/api/bulk-create-sevaks", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(
          `✅ Successfully created ${result.createdCount} sevaks! Failed: ${
            result.failedCount || 0
          }`
        );
        setBulkFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setMessage(`❌ ${result.error || "Failed to upload sevaks"}`);
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      setMessage("❌ Network error occurred during bulk upload");
    } finally {
      setIsBulkUploading(false);
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
        a.download = `${sevakId}_${sevakName.replace(/\s+/g, "_")}_QR.pdf`;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkFile(file);
    }
  };

  const downloadSampleFile = () => {
  const csvContent = `name,gender
Rajesh Kumar,male
Priya Sharma,female
Amit Patel,male
Sunita Devi,female
Mohan Singh,male
Geeta Kumari,female
Ravi Shankar,male
Sita Ram,female
Krishna Dev,male
Radha Rani,female`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "sample_sevaks.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setMessage("✅ Sample CSV file downloaded! Check your downloads folder.");
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
              className="py-4 px-2 border-b-2 border-orange-500 text-orange-600 font-medium whitespace-nowrap"
            >
              👥 Add Sevak
            </Link>
            <Link
              href="/leaderboard"
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              🏆 Leaderboard
            </Link>
            <Link href="/inspector-activity" className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors">
              👁️ Inspector Activity
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
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
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-3xl">👥</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Add New Sevak
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Create new sevak profiles individually or upload multiple sevaks
            using a CSV/Excel file.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Single Sevak Creation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="mr-3">👤</span>
              Add Single Sevak
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sevak Name *

                </label>
                <br />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gender *
                  </label>
                  <div className="flex text-black space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="male"
                        checked={sevakGender === "male"}
                        onChange={(e) => setSevakGender("male")}
                        className="mr-2"
                      />
                      Male
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="female"
                        checked={sevakGender === "female"}
                        onChange={(e) => setSevakGender("female")}
                        className="mr-2"
                      />
                      Female
                    </label>
                  </div>
                </div>
                <input
                  type="text"
                  value={sevakName}
                  onChange={(e) => setSevakName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800"
                  placeholder="Enter sevak's full name"
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleSingleSevakSubmit()
                  }
                />
              </div>

              <button
                onClick={handleSingleSevakSubmit}
                disabled={isLoading || !sevakName.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Sevak...</span>
                  </div>
                ) : (
                  "➕ Create Sevak"
                )}
              </button>
            </div>
          </div>

          {/* Bulk Upload */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="mr-3">📂</span>
              Bulk Upload Sevaks
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload CSV/Excel File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-slate-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Supported formats: CSV, XLSX, XLS
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={downloadSampleFile}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
                >
                  📥 Download Sample
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={isBulkUploading || !bulkFile}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkUploading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : (
                    "⬆️ Upload"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Last Created Sevak */}
        {lastCreatedSevak && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6">
            <h4 className="font-semibold text-green-800 mb-4 flex items-center">
              <span className="mr-2">🎉</span>
              Last Created Sevak
            </h4>
            <div className="bg-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {lastCreatedSevak.name}
                </p>
                <p className="text-slate-600">
                  ID: {lastCreatedSevak.sevak_id}
                </p>
                <p className="text-green-600 text-sm">
                  Points: {lastCreatedSevak.points}
                </p>
              </div>
              <button
                onClick={() =>
                  downloadQRCode(
                    lastCreatedSevak.sevak_id,
                    lastCreatedSevak.name
                  )
                }
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <span>📱</span>
                <span>Download QR</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
