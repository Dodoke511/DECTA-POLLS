import React from 'react';

interface TurnoutGaugeProps {
  percentage: number;
  primaryColor?: string;
}

export function TurnoutGauge({ percentage, primaryColor = '#5D44F8' }: TurnoutGaugeProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 80 80">
        <circle
          className="text-slate-100"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="40"
          cy="40"
        />
        <circle
          stroke={primaryColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="40"
          cy="40"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-black text-slate-900 leading-none">{percentage}%</span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Turnout</span>
      </div>
    </div>
  );
}
