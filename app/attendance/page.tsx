'use client';
import { useState, useRef, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function AttendancePage() {
  const { user, isLoaded } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin';

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const startScanner = async () => {
    setIsScanning(true);
    setMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start QR code scanning
        scanIntervalRef.current = setInterval(() => {
          scanQRCode();
        }, 500); // Scan every 500ms
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage('❌ Unable to access camera');
      setIsScanning(false);
    }
  };

  const scanQRCode = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      
      if (imageData && window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleScan(code.data);
        }
      }
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScan = async (qrData: string) => {
    if (!qrData || isLoading) return;

    setIsLoading(true);
    stopScanner();

    try {
      const response = await fetch('/api/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCode: qrData
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        const timeStatus = result.isOnTime ? '🟢 On Time' : '🟡 Late';
        setMessage(`✅ Attendance marked! ${timeStatus} - +${result.pointsAwarded} points. New balance: ${result.newPoints}`);
      } else {
        setMessage(`❌ ${result.error || 'Failed to mark attendance'}`);
      }
    } catch (error) {
      console.error('API call failed:', error);
      setMessage('❌ Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Load jsQR library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Get current time info
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const isCurrentlyOnTime = currentHour < 8 || (currentHour === 8 && currentMinute <= 30);
  const timeDisplay = currentTime.toLocaleTimeString();

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
                Welcome, {user?.firstName} • Role: {isAdmin ? 'Admin' : 'Inspector'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-10 h-10"
                  }
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
        {/* Hidden canvas for QR processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
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
              
              <div className="relative bg-black rounded-2xl overflow-hidden mb-6">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Scanner overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Scanning instruction */}
                <div className="absolute bottom-4 left-0 right-0">
                  <div className="bg-black/70 text-white text-sm p-3 mx-4 rounded-lg text-center">
                    📋 Point your camera at the QR code
                  </div>
                </div>
              </div>
              
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-700 font-medium">Marking attendance...</p>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="mb-8">
            <div className={`p-4 rounded-2xl border ${
              message.includes('✅') 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{message}</p>
                <button
                  onClick={() => setMessage('')}
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
            <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg ${
              isCurrentlyOnTime 
                ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                : 'bg-gradient-to-br from-yellow-500 to-orange-500'
            }`}>
              <span className="text-3xl">⏰</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Mark Attendance
            </h2>
            <div className="space-y-2 mb-6">
              <p className="text-lg text-slate-600">
                Current Time: <span className="font-semibold">{timeDisplay}</span>
              </p>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                isCurrentlyOnTime 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isCurrentlyOnTime ? '🟢 On Time Period' : '🟡 Late Period'}
              </div>
            </div>
            {/* <p className="text-slate-600 max-w-2xl mx-auto">
              Scan a sevak's QR code to mark their attendance. 
              <strong className="text-green-600"> +50 points</strong> for attendance before 8:30 AM,
              <strong className="text-yellow-600"> +25 points</strong> after 8:30 AM.
            </p> */}
          </div>
        </div>

        {/* Attendance Rules Card */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">📋 Attendance Rules</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">50</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">On Time (Before 8:30 AM)</h4>
                <p className="text-slate-600 text-sm">Sevaks who arrive before 8:30 AM get full attendance points</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-600 font-bold">25</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Late (After 8:30 AM)</h4>
                <p className="text-slate-600 text-sm">Sevaks who arrive after 8:30 AM get reduced points</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">1×</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Once Per Day</h4>
                <p className="text-slate-600 text-sm">Each sevak can only mark attendance once per day</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">📱</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">QR Code Required</h4>
                <p className="text-slate-600 text-sm">Valid sevak QR code must be scanned for attendance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Button */}
        <div className="text-center">
          <button
            onClick={startScanner}
            disabled={isLoading || isScanning}
            className="inline-flex items-center px-12 py-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xl rounded-3xl shadow-2xl hover:shadow-3xl transform transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed space-x-4"
          >
            <span className="text-3xl">📱</span>
            <span>Scan QR for Attendance</span>
          </button>
        </div>

        {/* Today's Attendance Summary */}
        {/* <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-8 border border-white/20">
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">Today's Attendance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">--</div>
              <div className="text-slate-600 text-sm">On Time</div>
              <div className="text-xs text-green-600 font-medium">+50 points each</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600 mb-2">--</div>
              <div className="text-slate-600 text-sm">Late Arrivals</div>
              <div className="text-xs text-yellow-600 font-medium">+25 points each</div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-3xl font-bold text-blue-600 mb-2">--</div>
              <div className="text-slate-600 text-sm">Total Attendance</div>
              <div className="text-xs text-blue-600 font-medium">Today's count</div>
            </div>
          </div>
        </div> */}

        {/* Spiritual Quote */}
        {/* <div className="text-center mt-12">
          <div className="max-w-2xl mx-auto">
            <blockquote className="text-xl font-light text-slate-700 italic leading-relaxed">
              "समयनिष्ठा सफलता की कुंजी है - Punctuality is the key to success"
            </blockquote>
            <div className="mt-6 flex items-center justify-center space-x-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}