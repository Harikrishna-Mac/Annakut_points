"use client";
import { useState, useRef, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

declare global {
  interface Window {
    Html5QrcodeScanner: any;
    Html5Qrcode: any;
  }
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<"add" | "deduct" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const qrScannerRef = useRef<any>(null);

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === "admin";

  // Load html5-qrcode library
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch((error: any) => {
          console.error("Cleanup error:", error);
        });
      }
    };
  }, []);

  const startScanner = (type: "add" | "deduct") => {
    setScanType(type);
    setIsScanning(true);
    setMessage("");

    const currentType = type;

    const tryStart = () => {
      const qrElement = document.getElementById("qr-reader");
      if (!qrElement) {
        // retry in next frame until element exists
        requestAnimationFrame(tryStart);
        return;
      }

      if (typeof window !== "undefined" && window.Html5Qrcode) {
        try {
          const html5Qrcode = new window.Html5Qrcode("qr-reader");
          qrScannerRef.current = html5Qrcode;

          html5Qrcode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => handleScan(decodedText, currentType),
            (errorMessage: string) =>
              console.debug("QR scan error:", errorMessage)
          );
        } catch (err) {
          console.error("Camera failed to start:", err);
          setMessage("❌ Unable to access camera. Please allow permissions.");
          setIsScanning(false);
        }
      } else {
        setMessage(
          "❌ QR scanner library not loaded. Please refresh the page."
        );
        setIsScanning(false);
      }
    };

    tryStart(); // start trying immediately
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        await qrScannerRef.current.clear();
        qrScannerRef.current = null;
        console.log("Scanner stopped successfully");
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScanning(false);
    setScanType(null);
  };

  const handleScan = async (qrData: string, action: "add" | "deduct") => {
    if (!qrData || isLoading) return;

    setIsLoading(true);
    stopScanner();

    try {
      const endpoint =
        action === "add" ? "/api/add-points" : "/api/deduct-points";

      // ✅ Capture device time
      const deviceTime = new Date().toISOString();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: qrData,
          points: 10,
          deviceTime: deviceTime, // ✅ Send device time
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage(
          `✅ Successfully ${
            action === "add" ? "added" : "deducted"
          } 10 points! New balance: ${result.newPoints}`
        );
      } else {
        setMessage(`❌ ${result.error || "Operation failed"}`);
      }
    } catch (error) {
      setMessage("❌ Network error occurred");
    } finally {
      setIsLoading(false);
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
                Welcome, {user?.firstName} • Role:{" "}
                {isAdmin ? "Admin" : "Inspector"}
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
              className="py-4 px-2 border-b-2 border-orange-500 text-orange-600 font-medium whitespace-nowrap"
            >
              🏠 Home
            </Link>
            <Link
              href="/attendance"
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              ⏰ Mark Attendance
            </Link>
            {isAdmin && (
              <>
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
                  className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
                >
                  👁️ Inspector Activity
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* QR Scanner Modal */}
        {isScanning && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  📱 Scan QR Code
                </h3>
                <p className="text-slate-600">
                  {scanType === "add" ? "Adding" : "Deducting"} 10 points
                </p>
              </div>

              <div id="qr-reader" className="mb-6"></div>

              <button
                onClick={stopScanner}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 px-6 rounded-xl font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading Modal */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-700 font-medium">
                Processing transaction...
              </p>
            </div>
          </div>
        )}

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

        {/* Welcome Card */}
        {/* <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-white/20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
              <span className="text-3xl">🙏</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Welcome to Seva Management
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Scan QR codes to manage seva points efficiently. Every
              contribution counts towards our spiritual journey.
            </p>
          </div>
        </div> */}

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Add Points Button */}
          <div className="group">
            <button
              onClick={() => startScanner("add")}
              disabled={isLoading || isScanning}
              className="w-full bg-white/80 backdrop-blur-sm hover:bg-white text-slate-800 border border-slate-200 hover:border-green-300 py-8 px-8 rounded-3xl shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-50/0 via-green-50/50 to-green-50/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative z-10">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-3xl">➕</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                      Add Points
                    </h3>
                    <p className="text-slate-600">Scan QR to add 10 points</p>
                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      +10 Points
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Deduct Points Button */}
          <div className="group">
            <button
              onClick={() => startScanner("deduct")}
              disabled={isLoading || isScanning}
              className="w-full bg-white/80 backdrop-blur-sm hover:bg-white text-slate-800 border border-slate-200 hover:border-red-300 py-8 px-8 rounded-3xl shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-50/0 via-red-50/50 to-red-50/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative z-10">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-3xl">➖</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                      Deduct Points
                    </h3>
                    <p className="text-slate-600">
                      Scan QR to deduct 10 points
                    </p>
                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                      -10 Points
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
