'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { IoCheckmark, IoClose } from "react-icons/io5";
import GradientText from '../mainlanding/ui/GradientText';

interface Plan {
  name: string;
  features: string[];
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'BASIC',
    features: [
      '1 Active Election (Max: 50 elections)',
      'Up to 200 Voters',
      'Standard Encryption',
      'Simple Filing, Voting, and Results',
      'Predefined Theme',
      'Monthly Price: ₱85',
    ],
  },
  {
    name: 'STANDARD',
    features: [
      '3 Active Elections (Max: 200 elections)',
      'Up to 500 Voters',
      'Role-Based Management',
      'Screening and Appeals',
      'Customizable Public Election Space',
      'Monthly Price: ₱170',
    ],
  },
  {
    name: 'ENTERPRISE',
    features: [
      '5 Active Elections (Max: 500 elections)',
      'Unlimited Voters',
      'Audit Log System',
      'Candidate Publication',
      'Customizable Public Election Space',
      'Monthly Price: ₱270',
    ],
  },
];

// Mock QR Code Base64
const MOCK_QR_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWAQMAAAAGzYrqAAAABlBMVEX///8AAABVwtN+AAAAAXRSTlMAQObYZgAAADdJREFUeF7twTEOACAMw7Bw+P9f86YpEkM62YpI7H0pSkYpKSV/V0pGKSklpZSUklJKSikppb6H6wU82UAnvAAAAABJRU5ErkJggg==";

const PlanCard: React.FC<{
  plan: Plan;
  isSelected: boolean;
  onSelect: (name: string) => void;
  onShowQR: (planName: string, price: string) => void;
}> = ({
  plan,
  isSelected,
  onSelect,
  onShowQR
}) => {
    return (
      <div
        className={`group relative transition-all duration-300 ease-in-out cursor-pointer w-full max-w-[320px] p-8 min-h-[400px] flex flex-col rounded-3xl ${isSelected
          ? 'border-2 border-[#5D44F8] shadow-[0_0_40px_rgba(93,68,248,0.8),0_0_80px_rgba(93,68,248,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] transform scale-105 bg-white/10 backdrop-blur-xl'
          : 'border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.4)] hover:border-[#5D44F8]/60 hover:shadow-[0_0_25px_rgba(93,68,248,0.5),0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.5)] hover:transform hover:scale-102 bg-white/5 backdrop-blur-lg'
          }`}
        style={{
          backdropFilter: isSelected ? 'blur(20px)' : 'blur(12px)',
          WebkitBackdropFilter: isSelected ? 'blur(20px)' : 'blur(12px)',
          background: isSelected
            ? 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%), rgba(93,68,248,0.1)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
          boxShadow: isSelected
            ? '0 0 40px rgba(93,68,248,0.8), 0 0 80px rgba(93,68,248,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.1), inset 0 0 8px 4px rgba(255,255,255,0.15)'
            : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.1), inset 0 0 4px 2px rgba(255,255,255,0.1)'
        }}
        onClick={() => onSelect(plan.name)}
      >
        {/* Glass reflection effect */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
            opacity: isSelected ? 0.8 : 0.5
          }}
        />

        <h3 className="relative z-10 text-2xl text-center mb-6 font-montserrat font-bold">
          <GradientText
            colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
            animationSpeed={8}
          >
            {plan.name}
          </GradientText>
        </h3>

        <div className="relative z-10 flex-1">
          {plan.features.map((feature, index) => {
            const isPrice = feature.includes('Monthly Price');
            return (
              <div
                key={index}
                className={`flex items-center mb-6 text-base font-source-sans transition-all duration-200 ${isPrice
                  ? 'text-[#9686F8] font-bold underline underline-offset-4 decoration-dotted hover:text-white cursor-help drop-shadow-sm'
                  : 'text-white/95 font-medium drop-shadow-sm'
                  }`}
                onClick={(e) => {
                  if (isPrice) {
                    e.stopPropagation();
                    onShowQR(plan.name, feature.split(': ')[1]);
                  }
                }}
              >
                <IoCheckmark
                  size={20}
                  className={`mr-3 flex-shrink-0 transition-colors duration-200 ${isSelected ? 'text-[#5D44F8] drop-shadow-sm' : 'text-white/70'
                    }`}
                />
                <span>{feature}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

export default function PlanSubscription({ onContinue, onBack }: { onContinue: (plan: string) => void; onBack?: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ show: boolean; plan: string; price: string }>({
    show: false,
    plan: '',
    price: ''
  });

  return (
    <div
      className="relative min-h-screen w-full"
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
            className="glass-card relative w-full max-w-md p-10 rounded-[40px] text-center animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              onClick={() => setQrModal({ ...qrModal, show: false })}
            >
              <IoClose size={30} />
            </button>

            <h3 className="text-2xl text-white font-semibold mb-2 font-montserrat">Scan to Subscribe</h3>
            <p className="text-[#9686F8] font-medium text-lg mb-8 font-source-sans">{qrModal.plan} Plan — {qrModal.price}</p>

            <div className="inline-block bg-white p-5 rounded-3xl shadow-[0_0_30px_rgba(93,68,248,0.4)]">
              <img src={MOCK_QR_BASE64} alt="QR Code" style={{ width: '200px', height: '200px' }} />
            </div>

            <div className="mt-8 space-y-2">
              <p className="text-white/80 text-sm font-source-sans">Please scan using your GCash or Maya app.</p>
              <p className="text-white/40 text-xs italic font-source-sans">Reference: DECTA_POLLS_{qrModal.plan.toUpperCase()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header - Fixed at top */}
      <header className="w-full p-6 md:p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/DECTALogo/DECTAPolls_Logo.svg" alt="Logo" width={60} height={60} />
            <h1 className="text-[#F1F0F3] font-montserrat text-2xl font-medium m-0">D.E.C.T.A Polls</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                window.location.href = '/';
              }
            }}
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mr-8"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Body - Main content area */}
      <main className="flex flex-col items-center justify-center px-6 md:px-10 pb-10 pt-0">
        <h2 className="text-white font-light text-center tracking-tight max-w-2xl text-3xl font-montserrat mb-8 -mt-8">
          Select a plan for your Organization
        </h2>

        {/* Grid */}
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-7xl mb-12">
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
          className={`inline-flex items-center justify-center px-8 py-0 h-12 rounded-xl font-montserrat text-white text-xl font-semibold cursor-pointer transition-all duration-300 leading-tight ${selectedPlan
            ? 'hover:bg-[#4c35d1] hover:shadow-[0_0_40px_rgba(93,68,248,0.4)] transform hover:-translate-y-1'
            : 'cursor-not-allowed'
            }`}
          style={{
            background: selectedPlan ? '#5D44F8' : 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            boxShadow: selectedPlan ? '0 4px 12px rgba(93, 68, 248, 0.3)' : 'none',
            color: selectedPlan ? 'white' : 'rgba(255, 255, 255, 0.2)'
          }}
        >
          Continue →
        </button>
      </main>
    </div>
  );
}