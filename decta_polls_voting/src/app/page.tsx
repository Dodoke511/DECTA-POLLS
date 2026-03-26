'use client';

import { useState } from "react";
import PlanSubscription from "../components/auth/registration/PlanSubscription"; 
import RegisterOrganization from "../components/auth/registration/RegisterOrganization";
import RegisterAdmin from "../components/auth/registration/RegisterAdmin"; 
// 1. Import your LogInPage component
import LogInPage from "../components/auth/registration/LogInPage"; 

export default function Home() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<any>(null);

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    setStep(2); 
  };

  const handleRegisterOrg = (data: any) => {
    setOrgData(data);
    setStep(3);
  };

  // 2. This now triggers the final step change
  const handleRegisterAdmin = (adminData: any) => {
    console.log("Registration Complete", { orgData, adminData });
    setStep(4); // Move to Login Step
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else if (step === 4) setStep(3); // Optional: allow back from login
  };

  return (
    <div className="min-h-screen w-full font-sans">
      <main className="flex min-h-screen w-full flex-col">
        {step === 1 && (
          <PlanSubscription onContinue={handleSelectPlan} />
        )}
        
        {step === 2 && (
          <RegisterOrganization 
            plan={selectedPlan} 
            onBack={handleBack} 
            onContinue={handleRegisterOrg} 
          />
        )}

        {step === 3 && (
          <RegisterAdmin
            plan={selectedPlan}
            onBack={handleBack}
            onContinue={handleRegisterAdmin}
          />
        )}

        {/* 3. Render the LogInPage when step is 4 */}
        {step === 4 && (
          <LogInPage />
        )}
      </main>
    </div>
  );
}