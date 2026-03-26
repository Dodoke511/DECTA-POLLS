'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { IoCheckmark } from "react-icons/io5";

interface Plan {
  name: string;
  features: string[];
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'BASIC',
    features: ['Standard Encryption', 'Simple Signup', 'Generic Theme'],
  },
  {
    name: 'STANDARD',
    features: [
      'Role-Based Verification',
      'Document Workflow',
      'Custom White-Labeling',
    ],
  },
  {
    name: 'ENTERPRISE',
    features: [
      'Full Forensic Audit Logs',
      'Enhanced Screening Rules',
      'Custom White-Labeling',
    ],
  },
];

const PlanCard: React.FC<{ 
  plan: Plan; 
  isSelected: boolean; // Added this to track the clicked state
  onSelect: (name: string) => void 
}> = ({
  plan,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      className="group transition-all duration-300 ease-in-out"
      style={{
        width: '100%',
        maxWidth: '320px',
        borderRadius: '20px',
        // Change background based on Selection or Popularity
        background: isSelected 
            ? 'rgba(15, 23, 42, 0.9)' 
            : 'rgba(255, 255, 255, 0.08)',
        
        // Shadow effect from your image
        boxShadow: isSelected
            ? '0 0 20px rgba(93, 68, 248, 0.4), inset 0 0 12px rgba(93, 68, 248, 0.6)'
            : '0 8px 20px rgba(0, 0, 0, 0.15)',
        
        backdropFilter: 'blur(8px)',
        
        // Border colors
        border: isSelected
            ? '2px solid #5D44F8' 
            : '1px solid rgba(255, 255, 255, 0.2)',
        
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        minHeight: '400px',
      }}
      onClick={() => onSelect(plan.name)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.border = '2px solid #5D44F8';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(93, 68, 248, 0.4), inset 0 0 12px rgba(93, 68, 248, 0.6)';
        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'; // Darker fill like your image
      }}
      onMouseLeave={(e) => {
        // Return to original state if not selected
        if (!isSelected) {
          e.currentTarget.style.transform = plan.isPopular ? 'scale(1.05)' : 'scale(1)';
          e.currentTarget.style.border = plan.isPopular ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.boxShadow = plan.isPopular ? '0 8px 32px rgba(99, 102, 241, 0.25)' : '0 8px 20px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.background = plan.isPopular ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)';
        }
      }}
    >
      <h3
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '25px',
          fontWeight: '500',
          textDecoration: 'underline',
          background: 'radial-gradient(345.57% 129.71% at 7.82% 15.88%, #9686F8 6.3%, #D0C8FF 54.03%, #FA99F5 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        {plan.name}
      </h3>

      <div style={{ flex: 1 }}>
        {plan.features.map((feature, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              fontSize: '16px',
              color: '#e0e7ff',
              fontWeight: '500',
            }}
          >
            {/* 1. Removed the <span> wrapper entirely */}
            <IoCheckmark 
              size={20} 
              style={{ 
                marginRight: '12px', 
                color: isSelected ? '#6366f1' : '#94a3b8', // Icon changes color when card is selected
                flexShrink: 0 
              }} 
            />
            
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PlanSubscription({ onContinue }: { onContinue: (plan: string) => void }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedPlan) {
      onContinue(selectedPlan); // This triggers the switch in page.tsx
    }
  };

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
    console.log(`Selected plan: ${plan}`);
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full p-6 md:p-10"
      style={{
        background: 'radial-gradient(circle at top, #3641b5 0%, #0a0f2c 45%, #03070f 100%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header: Centered on small screens, Pinned to top-left on large (lg) screens */}
      <div className="flex items-center gap-3 mb-10 lg:absolute lg:top-10 lg:left-10 lg:mb-0">
        <Image 
          src="/DECTALogo/DECTAPolls_Logo.svg" 
          alt="DECTA Polls Logo" 
          width={60} 
          height={60} 
        />
        <h1 className="text-[#F1F0F3] font-montserrat text-2xl font-medium m-0">
          D.E.C.T.A Polls
        </h1>
      </div>

      {/* Title */}
      {/* Title - Edit this section */}
    <h2 
    className="text-white font-light text-center tracking-tight max-w-2xl"
    style={{
        fontSize: '30px', 
        color: '#ffffff',
        marginBottom: '30px',
        fontFamily: 'Montserrat, sans-serif',
        letterSpacing: '1px',
        wordSpacing: '2px',
    }}
    >
    Select a plan for your Organization
    </h2>

      {/* Plans Grid */}
    <div className="flex flex-wrap justify-center gap-8 w-full max-w-7xl mb-10">
    {plans.map((plan) => (
        <PlanCard
        key={plan.name}
        plan={plan}
        // Check if this card is the one the user selected
        isSelected={selectedPlan === plan.name} 
        onSelect={handleSelectPlan}
        />
    ))}
    </div>

      {/* Global Continue Button */}
      <button
        disabled={!selectedPlan}
        onClick={handleContinue}
        style={{
          display: 'flex',
          width: '300px',
          padding: '20px 10px',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          borderRadius: '20px',
          border: '1px solid #372892',
          background: selectedPlan ? '#5D44F8' : '#334155', 
          color: '#FFFFFF',
          fontSize: '16px',
          fontWeight: '500',
          cursor: selectedPlan ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          opacity: selectedPlan ? 1 : 0.6,
          boxShadow: selectedPlan ? '0 10px 25px -5px rgba(93, 68, 248, 0.4)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (selectedPlan) e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          if (selectedPlan) e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        Continue →
      </button>
    </div>
  );
}