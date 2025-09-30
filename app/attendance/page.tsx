"use client";
import { useState, useRef, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  ATTENDANCE_CONFIG,
  isOnTimeWithClientTime,
  getFormattedCutoffTime,
} from "@/lib/config";

declare global {
  interface Window {
    Html5QrcodeScanner: any;
  }
}

export default function AttendancePage() {
  const { user, isLoaded } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const qrScannerRef = useRef<any>(null);

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === "admin";

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const startScanner = () => {
    setIsScanning(true);
    setMessage("");

    const tryStart = () => {
      const qrElement = document.getElementById("qr-reader");
      if (!qrElement) {
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
            (decodedText: string) => handleScan(decodedText),
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

    tryStart();
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
  };

  const handleScan = async (qrData: string) => {
    if (!qrData || isLoading) return;

    console.log("Processing QR data:", qrData);
    setIsLoading(true);
    stopScanner();

    try {
      // Get client's local time
      const clientTime = new Date();
      const clientTimeISO = clientTime.toISOString();
      const clientHour = clientTime.getHours();
      const clientMinute = clientTime.getMinutes();

      console.log(`Client time: ${clientHour}:${clientMinute}`);

      const response = await fetch("/api/mark-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qrCode: qrData,
          clientTime: clientTimeISO, // Send client's time
          clientHour: clientHour, // Send parsed hour
          clientMinute: clientMinute, // Send parsed minute
        }),
      });

      const result = await response.json();
      console.log("API Response:", result);

      if (response.ok) {
        const timeStatus = result.isOnTime ? "🟢 On Time" : "🟡 Late";
        setMessage(
          `✅ Attendance marked for ${qrData}! ${timeStatus} - +${result.pointsAwarded} points. New balance: ${result.newPoints}`
        );
      } else {
        setMessage(`❌ ${result.error || "Failed to mark attendance"}`);
      }
    } catch (error) {
      console.error("API call failed:", error);
      setMessage("❌ Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const clientHour = currentTime.getHours();
  const clientMinute = currentTime.getMinutes();
  const isCurrentlyOnTime = isOnTimeWithClientTime(clientHour, clientMinute);

  const timeDisplay = currentTime.toLocaleTimeString();
  const cutoffTime = getFormattedCutoffTime();

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
              className="py-4 px-2 border-b-2 border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 font-medium whitespace-nowrap transition-colors"
            >
              🏠 Home
            </Link>
            <Link
              href="/attendance"
              className="py-4 px-2 border-b-2 border-orange-500 text-orange-600 font-medium whitespace-nowrap"
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* QR Scanner Modal */}
        {isScanning && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  📱 Scan for Attendance
                </h3>
                <p className="text-slate-600">
                  Scan sevak's QR code to mark attendance
                </p>
              </div>

              <div id="qr-reader" className="mb-6"></div>

              <div className="space-y-3">
                <button
                  onClick={stopScanner}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 px-6 rounded-xl font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Modal */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-700 font-medium">
                Marking attendance...
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

        {/* Time Info Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-white/20">
          <div className="text-center">
            <div
              className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg ${
                isCurrentlyOnTime
                  ? "bg-gradient-to-br from-green-500 to-emerald-500"
                  : "bg-gradient-to-br from-yellow-500 to-orange-500"
              }`}
            >
              <span className="text-3xl">⏰</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Mark Attendance
            </h2>
            <div className="space-y-2 mb-6">
              <p className="text-lg text-slate-600">
                Current Time:{" "}
                <span className="font-semibold">{timeDisplay}</span>
              </p>
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  isCurrentlyOnTime
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {isCurrentlyOnTime ? "🟢 On Time Period" : "🟡 Late Period"}
              </div>
              <p className="text-slate-600 text-sm mt-4">
                Cutoff Time:{" "}
                <span className="font-semibold">{cutoffTime} AM</span>
              </p>
            </div>

            {/* Scan Button */}
            <div className="text-center m-7">
              <button
                onClick={startScanner}
                disabled={isLoading || isScanning}
                className="inline-flex items-center px-12 py-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xl rounded-3xl shadow-2xl hover:shadow-3xl transform transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed space-x-4"
              >
                <span className="text-3xl">📱</span>
                <span>{isScanning ? "Scanner Active..." : "Scan QR"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
