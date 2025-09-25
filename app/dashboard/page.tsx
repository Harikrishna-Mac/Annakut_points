'use client';
import { useState, useRef, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'add' | 'deduct' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin';

  const startScanner = async (type: 'add' | 'deduct') => {
    setScanType(type);
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
      setMessage('Unable to access camera');
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
    setScanType(null);
  };

  const handleScan = async (qrData: string) => {
    if (!qrData || isLoading) return;

    setIsLoading(true);
    stopScanner();

    try {
      const endpoint = scanType === 'add' ? '/api/add-points' : '/api/deduct-points';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCode: qrData,
          points: 10
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Successfully ${scanType === 'add' ? 'added' : 'deducted'} 10 points! New balance: ${result.newPoints}`);
      } else {
        setMessage(`❌ ${result.error || 'Operation failed'}`);
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hidden canvas for QR processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* QR Scanner Modal */}
        {isScanning && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  📱 Scan QR Code
                </h3>
                <p className="text-slate-600">
                  {scanType === 'add' ? 'Adding' : 'Deducting'} 10 points
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
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg animate-pulse"></div>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-700 font-medium">Processing transaction...</p>
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
              Scan QR codes to manage seva points efficiently. Every contribution counts towards our spiritual journey.
            </p>
          </div>
        </div> */}

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Add Points Button */}
          <div className="group">
            <button
              onClick={() => startScanner('add')}
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
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Add Points</h3>
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
              onClick={() => startScanner('deduct')}
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
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Deduct Points</h3>
                    <p className="text-slate-600">Scan QR to deduct 10 points</p>
                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                      -10 Points
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {/* <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-8 border border-white/20">
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">Today's Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 mb-1">--</div>
              <div className="text-slate-600 text-sm">Points Added</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 mb-1">--</div>
              <div className="text-slate-600 text-sm">Points Deducted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1">--</div>
              <div className="text-slate-600 text-sm">Attendance Marked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600 mb-1">--</div>
              <div className="text-slate-600 text-sm">Total Transactions</div>
            </div>
          </div>
        </div> */}

        {/* Spiritual Quote */}
        {/* <div className="text-center mt-12">
          <div className="max-w-2xl mx-auto">
            <blockquote className="text-xl font-light text-slate-700 italic leading-relaxed">
              "सेवा परमो धर्म: - Service is the highest dharma"
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