"use client";
import React from 'react';
import Image from "next/image";
import { Heart, Smile, Star } from 'lucide-react';
import { Client } from '@clerk/nextjs/server';

const AppCloser = () => {
  const handleFeedback = () => {
    // Add your feedback logic here
    console.log('Feedback clicked');
  };

  const handleReopen = () => {
    // Add your reopen app logic here
    window.location.href = '/'; // Redirect to home or dashboard
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-100 to-red-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 md:p-12 text-center animate-fadeIn">
        
        
        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
          Thank You!
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-slate-600 mb-6 font-medium">
          We appreciate your dedication to Annakut Point System
        </p>

        {/* Message */}
        <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-8 max-w-lg mx-auto">
          Your contribution and participation have been wonderful. We hope this system helped organize and celebrate the sacred Annakut festival. May you be blessed with joy and prosperity!
        </p>

        
        {/* Footer */}
        <div className="pt-6 border-t border-slate-200">
          <p className="text-slate-500 text-sm mb-3">
            Jai Swaminarayan 🙏
          </p>
          <p className="text-slate-400 text-xs">
            © {new Date().getFullYear()} BAPS Swaminarayan Mandir, Pune
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AppCloser;