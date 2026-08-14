import React from "react";

export default function LoadingScreen({ message = "Loading your cashbook..." }) {
  return (
    <div className="min-h-screen bg-bgMain text-textMain flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
      
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brandBlue/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
        
        {/* Animated Brand Icon & Spinner Container */}
        <div className="relative flex justify-center items-center mb-6">
          {/* Outer Rotating Ring */}
          <div className="w-20 h-20 rounded-full border-4 border-brandBlue/20 border-t-brandBlue animate-spin" />
          
          {/* Inner Pulsing Ledger Icon */}
          <div className="absolute inset-0 flex justify-center items-center text-3xl animate-bounce">
            📖
          </div>
        </div>

        {/* Loading Message */}
        <h3 className="text-lg font-bold text-textMain mb-1 tracking-wide">
          {message}
        </h3>
        <p className="text-xs text-textMuted m-0 animate-pulse">
          Syncing your financial entries safely...
        </p>

        {/* Skeleton Card Placeholder Preview */}
        <div className="w-full mt-8 p-4 bg-white/5 rounded-2xl border border-borderLight/40 flex flex-col gap-3 shadow-lg">
          <div className="h-4 bg-white/10 rounded-md w-3/4 animate-pulse" />
          <div className="h-8 bg-white/10 rounded-lg w-full animate-pulse" />
          <div className="flex gap-2 mt-1">
            <div className="h-6 bg-white/10 rounded-md w-1/2 animate-pulse" />
            <div className="h-6 bg-white/10 rounded-md w-1/2 animate-pulse" />
          </div>
        </div>

      </div>
    </div>
  );
}
