import React from 'react'
import Image from "next/image";

const Footer = () => {
  return (
    <div>
     <footer className="bg-gradient-to-r from-orange-100 via-amber-100 to-red-100 border-t border-orange-200/50 shadow-inner">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        
        {/* Left Section with Logo + Title */}
        <div className="flex items-center space-x-3 text-center md:text-left">
          <Image
            src="/baps-logo.webp"
            alt="Annakut Logo"
            width={36}
            height={36}
            className="rounded-lg shadow-sm"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Annakut Point System
            </h2>
            
          </div>
        </div>

        

        {/* Right Section */}
        <div className="text-center md:text-right text-slate-500 text-sm">
          © {new Date().getFullYear()} BAPS Swaminarayan Mandir, Pune
        </div>
      </div>
    </footer>
    </div>
  )
}

export default Footer
