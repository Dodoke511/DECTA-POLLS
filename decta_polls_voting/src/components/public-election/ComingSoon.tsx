import React from 'react';
import { Layout as LayoutIcon, Clock, Bell } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  banner?: string;
  primaryColor?: string;
}

export default function ComingSoon({ title, banner, primaryColor = '#5D44F8' }: ComingSoonProps) {
  return (
    <div className="relative min-h-screen bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* Background Accents */}
      <div 
        className="absolute top-0 right-0 w-[500px] h-[500px] opacity-5 rounded-full blur-[100px]"
        style={{ backgroundColor: primaryColor }}
      />
      <div 
        className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-5 rounded-full blur-[100px]"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center space-y-12">
        {/* Banner Preview */}
        <div className="relative w-32 h-32 mx-auto">
          <div 
            className="absolute inset-0 rounded-3xl rotate-6 opacity-20"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="relative w-full h-full bg-slate-50 border border-slate-100 rounded-3xl shadow-xl flex items-center justify-center overflow-hidden">
            {banner ? (
              <img src={banner} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <LayoutIcon className="w-10 h-10 text-slate-300" />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Coming Soon</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Final preparations are underway. The official election site will be live very soon. Stay tuned for the launch!
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="h-px w-24 bg-slate-200" />
          <div className="flex items-center gap-3 text-slate-400">
            <Bell className="w-5 h-5" />
            <span className="text-sm font-medium">Notifications will be sent once active.</span>
          </div>
        </div>
      </div>
      
      {/* Branding Footer */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">
          Powered by DECTA-POLLS
        </p>
      </div>
    </div>
  );
}
