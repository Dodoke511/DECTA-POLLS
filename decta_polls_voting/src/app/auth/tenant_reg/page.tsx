'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlanSubscription from "../../../components/registration/PlanSubscription";
import RegisterOrganization from "../../../components/registration/RegisterOrganization";
import RegisterAdmin from "../../../components/registration/RegisterAdmin";


export default function Home() {
    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [orgData, setOrgData] = useState<any>(null);
    const [adminData, setAdminData] = useState<any>(null);

    // OTP Specific states
    const [otp, setOtp] = useState('');
    const [otpHash, setOtpHash] = useState('');
    const [otpExpires, setOtpExpires] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    const router = useRouter();

    const handleLogin = () => {
        router.push("/auth/login_form");
    };

    const handleSelectPlan = (planName: string) => {
        setSelectedPlan(planName);
        setStep(2);
    };

    const handleRegisterOrg = (data: any) => {
        setOrgData(data);
        setStep(3);
    };

    // 2. This triggers OTP generation, not final registration
    const handleRegisterAdmin = async (data: any) => {
        setAdminData(data);
        setIsSendingOtp(true);
        console.log("Admin Data Collected", { orgData, adminData: data });

        try {
            const email = data.email || orgData?.email;
            const response = await fetch('/api/send_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const resData = await response.json();

            if (!response.ok) throw new Error(resData.error || 'Failed to send OTP');

            setOtpHash(resData.hash);
            setOtpExpires(resData.expires);
            setTimeLeft(60);
            setStep(4); // Move to OTP verification step
        } catch (error: any) {
            console.error("API Call Error:", error);
            alert("Failed to send OTP: " + (error.message || "Unknown error"));
        } finally {
            setIsSendingOtp(false);
        }
    };

    // OTP Timer countdown
    useEffect(() => {
        if (step === 4 && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [step, timeLeft]);

    const handleVerifyOtpAndRegister = async () => {
        if (!otp || otp.length !== 6) return;
        setIsVerifyingOtp(true);

        try {
            const email = adminData.email || orgData?.email;
            const password = orgData.password;

            // Verify OTP
            const verifyRes = await fetch('/api/verify_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, otp, hash: otpHash, expires: otpExpires })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'OTP Verification failed');

            // Set up FormData since OTP is verified
            const formData = new FormData();
            formData.append('organization', orgData.organizationName);
            formData.append('email', email);
            formData.append('type', orgData.organizationType);
            formData.append('subscription', selectedPlan || 'BASIC');
            if (orgData.verificationFile) formData.append('verification', orgData.verificationFile);
            formData.append('status', 'PENDING');
            formData.append('isVerified', 'false');
            formData.append('slug', orgData.tenantSlug);
            formData.append('main_color', orgData.main_Color);
            formData.append('second_color', orgData.secondary_Color);
            if (orgData.logoFile) formData.append('logo_url', orgData.logoFile);
            formData.append('first_name', adminData.firstName);
            if (adminData.middleName) formData.append('middle_name', adminData.middleName);
            formData.append('surname', adminData.lastName);
            if (adminData.birthDate) formData.append('birth_date', adminData.birthDate);
            if (adminData.contactNumber) formData.append('contact', adminData.contactNumber);
            formData.append('status', 'new');
            formData.append('auth_id', verifyData.user.id);

            // Proceed to final registration
            const regRes = await fetch('/api/register_tenant', {
                method: 'POST',
                body: formData
            });

            if (!regRes.ok) {
                const regError = await regRes.json();
                throw new Error(regError.error || 'Registration failed');
            }

            console.log("API Registration Success:", await regRes.json());
            handleLogin(); // Redirect to login form
        } catch (error: any) {
            console.error("Registration flow error:", error);
            alert("Error: " + (error.message || "An unknown error occurred"));
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleResendOtp = () => {
        if (adminData) handleRegisterAdmin(adminData);
    };

    const handleBack = () => {
        if (step === 3) setStep(2);
        else if (step === 2) setStep(1);
        else if (step === 4) setStep(3); // Go back from OTP
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

                {step === 4 && (
                    <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ background: 'radial-gradient(circle at top, #3641b5 0%, #0a0f2c 45%, #03070f 100%)' }}>
                        <div className="w-full max-w-[540px] rounded-3xl border border-white/20 bg-white/5 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl relative">
                            <h2 className="text-2xl font-semibold text-white mb-4 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>Verify Your Email</h2>
                            <p className="text-white/70 mb-8 text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>We've sent a 6-digit code to <strong>{adminData?.email || orgData?.email}</strong>. It expires in 60s.</p>

                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="------"
                                className="w-full text-center tracking-[1em] text-3xl rounded-xl border border-white/30 bg-white/10 px-4 py-4 text-white outline-none focus:border-[#5D44F8] transition mb-8"
                                style={{ fontFamily: 'monospace' }}
                            />

                            <button
                                onClick={handleVerifyOtpAndRegister}
                                disabled={otp.length !== 6 || isVerifyingOtp || timeLeft === 0}
                                className={`w-full py-4 rounded-xl font-medium transition ${otp.length === 6 && !isVerifyingOtp && timeLeft > 0 ? 'bg-[#5D44F8] text-white hover:bg-[#4a35cf] shadow-lg' : 'bg-[#334155] text-white/50 cursor-not-allowed'
                                    }`}
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                                {isVerifyingOtp ? 'Verifying...' : 'Verify & Complete Registration'}
                            </button>

                            <div className="mt-6 text-center text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                {timeLeft > 0 ? (
                                    <span className="text-white/50">Resend code in <strong className="text-white/80">{timeLeft}s</strong></span>
                                ) : (
                                    <button onClick={handleResendOtp} disabled={isSendingOtp} className="text-[#5D44F8] hover:text-[#7f6af9] font-medium transition">
                                        {isSendingOtp ? 'Sending...' : 'Resend Code'}
                                    </button>
                                )}
                            </div>

                            <div className="mt-8 text-center pt-6 border-t border-white/10">
                                <button onClick={handleBack} className="text-white/50 hover:text-white transition">← Back to Admin Details</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}