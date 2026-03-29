'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { IoCheckmark, IoClose } from "react-icons/io5";

interface Plan {
  name: string;
  features: string[];
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'BASIC',
    features: ['Standard Encryption', 'Simple Signup', 'Generic Theme', 'Monthly Price: ₱279'],
  },
  {
    name: 'STANDARD',
    features: [
      'Role-Based Verification',
      'Document Workflow',
      'Custom White-Labeling',
      'Monthly Price: ₱449',
    ],
  },
  {
    name: 'ENTERPRISE',
    features: [
      'Full Forensic Audit Logs',
      'Enhanced Screening Rules',
      'Custom White-Labeling',
      'Monthly Price: ₱619',
    ],
  },
];

// Mock QR Code Base64
const MOCK_QR_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWAQMAAAAGzYrqAAAABlBMVEX///8AAABVwtN+AAAAAXRSTlMAQObYZgAAADdJREFUeF7twTEOACAMw7Bw+P9f86YpEkM62YpI7H0pSkYpKSV/V0pGKSklpZSUklJKSikppb6H6wU82UAnvAAAAABJRU5ErkJggg==";

const PlanCard: React.FC<{ 
  plan: Plan; 
  isSelected: boolean; 
  onSelect: (name: string) => void;
  onShowQR: (planName: string, price: string) => void; // New prop to trigger global modal
}> = ({
  plan,
  isSelected,
  onSelect,
  onShowQR
}) => {
  return (
    <div
      className="group relative transition-all duration-300 ease-in-out"
      style={{
        width: '100%',
        maxWidth: '320px',
        borderRadius: '20px',
        background: isSelected ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.08)',
        boxShadow: isSelected
            ? '0 0 20px rgba(93, 68, 248, 0.4), inset 0 0 12px rgba(93, 68, 248, 0.6)'
            : '0 8px 20px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(8px)',
        border: isSelected ? '2px solid #5D44F8' : '1px solid rgba(255, 255, 255, 0.2)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        minHeight: '400px',
      }}
      onClick={() => onSelect(plan.name)}
    >
      <h3 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '25px',
          fontWeight: '500',
          background: 'radial-gradient(345.57% 129.71% at 7.82% 15.88%, #9686F8 6.3%, #D0C8FF 54.03%, #FA99F5 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
        {plan.name}
      </h3>

      <div style={{ flex: 1 }}>
        {plan.features.map((feature, index) => {
          const isPrice = feature.includes('Monthly Price');
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
                fontSize: '16px',
                color: isPrice ? '#9686F8' : '#e0e7ff',
                fontWeight: isPrice ? '700' : '500',
              }}
              onClick={(e) => {
                if (isPrice) {
                  e.stopPropagation();
                  onShowQR(plan.name, feature.split(': ')[1]);
                }
              }}
            >
              <IoCheckmark size={20} style={{ marginRight: '12px', color: isSelected ? '#6366f1' : '#94a3b8', flexShrink: 0 }} />
              <span className={isPrice ? "underline underline-offset-4 decoration-dotted hover:text-white transition-all cursor-help" : ""}>
                {feature}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function PlanSubscription({ onContinue }: { onContinue: (plan: string) => void }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ show: boolean; plan: string; price: string }>({
    show: false,
    plan: '',
    price: ''
  });

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full p-6 md:p-10"
      style={{
        background: 'radial-gradient(circle at top, #3641b5 0%, #0a0f2c 45%, #03070f 100%)',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden'
      }}
    >
      {/* Global QR Modal Panel */}
      {qrModal.show && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setQrModal({ ...qrModal, show: false })}
        >
          <div 
            className="relative w-full max-w-md p-10 rounded-[40px] border border-white/20 bg-[#0a0f2c]/80 shadow-[0_0_50px_rgba(93,68,248,0.3)] text-center animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{ backdropFilter: 'blur(20px)' }}
          >
            <button 
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              onClick={() => setQrModal({ ...qrModal, show: false })}
            >
              <IoClose size={30} />
            </button>

            <h3 className="text-2xl text-white font-semibold mb-2">Scan to Subscribe</h3>
            <p className="text-[#9686F8] font-medium text-lg mb-8">{qrModal.plan} Plan — {qrModal.price}</p>
            
            <div className="inline-block bg-white p-5 rounded-3xl shadow-[0_0_30px_rgba(93,68,248,0.4)]">
              <img src={MOCK_QR_BASE64} alt="QR Code" style={{ width: '200px', height: '200px' }} />
            </div>

            <div className="mt-8 space-y-2">
              <p className="text-white/80 text-sm">Please scan using your GCash or Maya app.</p>
              <p className="text-white/40 text-xs italic">Reference: DECTA_POLLS_{qrModal.plan.toUpperCase()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-10 lg:absolute lg:top-10 lg:left-10 lg:mb-0">
        <Image src="/DECTALogo/DECTAPolls_Logo.svg" alt="Logo" width={60} height={60} />
        <h1 className="text-[#F1F0F3] font-montserrat text-2xl font-medium m-0">D.E.C.T.A Polls</h1>
      </div>

      <h2 className="text-white font-light text-center tracking-tight max-w-2xl"
        style={{
          fontSize: '30px',
          color: '#ffffff',
          marginBottom: '30px',
          fontFamily: 'Montserrat, sans-serif',
          letterSpacing: '1px',
          wordSpacing: '2px',
          fontWeight: '100',
        }}
      >
        Select a plan for your Organization
      </h2>

      {/* Grid */}
      <div className="flex flex-wrap justify-center gap-8 w-full max-w-7xl mb-10">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            isSelected={selectedPlan === plan.name} 
            onSelect={setSelectedPlan}
            onShowQR={(name, price) => setQrModal({ show: true, plan: name, price: price })}
          />
        ))}
      </div>

      {/* Continue Button */}
      <button
        disabled={!selectedPlan}
        onClick={() => selectedPlan && onContinue(selectedPlan)}
        style={{
          display: 'flex', width: '300px', padding: '20px 10px', justifyContent: 'center', alignItems: 'center',
          borderRadius: '20px', border: '1px solid #372892', background: selectedPlan ? '#5D44F8' : '#334155',
          color: '#FFFFFF', fontSize: '16px', fontWeight: '500', cursor: selectedPlan ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease', boxShadow: selectedPlan ? '0 10px 25px -5px rgba(93, 68, 248, 0.4)' : 'none'
        }}
      >
        Continue →
      </button>
    </div>
  );
}