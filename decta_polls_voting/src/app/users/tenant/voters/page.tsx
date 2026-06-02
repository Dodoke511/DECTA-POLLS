"use client";

import React, { useState, useEffect, useRef } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Search, UserPlus, X, Upload } from "lucide-react";
import { isSubscriptionRestricted } from '@/lib/subscription-limits';

interface Voter {
  id: string;
  email: string;
  firstName?: string;
  first_name?: string;
  middleName?: string;
  middle_name?: string;
  surname?: string;
  contact?: string;
  birthDate?: string;
  birth_date?: string;
  status?: string;
  department?: string;
  created_at?: string;
  tenantID: string;
  user_type: string;
}

export default function TenantVotersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
    details?: string;
    count?: number;
  } | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<'BASIC' | 'STANDARD' | 'ENTERPRISE' | 'EXPIRED' | 'PENDING'>('BASIC');
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [roleCounts, setRoleCounts] = useState<{
    all: number;
    admin: number;
    "sub-admin": number;
    candidate: number;
    voter: number;
  }>({
    all: 0,
    admin: 0,
    "sub-admin": 0,
    candidate: 0,
    voter: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatRoleName = (role?: string) => {
    if (!role) return "Voter";
    const lower = role.toLowerCase();
    if (lower === "voter") return "Voter";
    if (lower === "candidate") return "Candidate";
    if (lower === "sub-admin") return "Sub-Admin";
    if (lower === "admin") return "Admin";
    return role;
  };

  const getRoleBadgeClass = (role?: string) => {
    const normalized = role?.toLowerCase() || "voter";
    switch (normalized) {
      case "admin":
        return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      case "sub-admin":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
      case "candidate":
        return "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30";
      case "voter":
      default:
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    }
  };

  // Debounce search query changes and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');
    const storedTenantId = sessionStorage.getItem('tenantUserId'); // Changed from 'tenantId' to 'tenantUserId'

    console.log('Auth check - Role:', role, 'Token match:', random === storedToken, 'Tenant ID:', storedTenantId);

    if (role !== 'tenant' || !random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    setToken(storedToken || '');

    if (storedTenantId) {
      setTenantId(storedTenantId);
      console.log('Tenant ID set:', storedTenantId);
      fetchSubscription(storedTenantId);
    } else {
      console.warn('No tenant ID found in session storage');
    }
  }, [router]);

  const fetchVoters = async (
    id: string,
    page: number,
    limit: number,
    search: string,
    role: string
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/get_tenant_voters?tenantId=${id}&page=${page}&limit=${limit}&search=${encodeURIComponent(
          search
        )}&role=${role}`
      );
      const result = await response.json();

      if (response.ok) {
        setVoters(result.data || []);
        setTotalCount(result.count || 0);
        if (result.roleCounts) {
          setRoleCounts(result.roleCounts);
        }
      } else {
        console.error("Error fetching voters:", result.error);
        setVoters([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching voters:", error);
      setVoters([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchVoters(tenantId, currentPage, pageSize, debouncedSearch, activeTab);
    }
  }, [tenantId, currentPage, pageSize, debouncedSearch, activeTab]);

  const fetchSubscription = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/get_tenant_subscription?tenantId=${tenantId}`);
      const result = await response.json();
      if (response.ok) {
        setSubscriptionPlan(result.subscription ?? 'BASIC');
        setTenantStatus(result.status ?? null);
        setIsRestricted(
          isSubscriptionRestricted(result.subscription, result.subscription_expires_at) ||
          result.status === 'PENDING'
        );
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  };

  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    // Accept .csv files or .txt files (which might contain CSV data)
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      setSelectedFile(file);
      setUploadResult(null);
      console.log('File accepted:', file.name);
    } else {
      setUploadResult({
        type: "error",
        title: "Unsupported file",
        message: "Please select a CSV or TXT file.",
      });
      console.log('File rejected - not a CSV or TXT file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    console.log('Upload clicked. Selected file:', selectedFile, 'Tenant ID:', tenantId);
    
    if (selectedFile && tenantId) {
      setIsUploading(true);
      setUploadResult(null);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('tenantId', tenantId);

        const response = await fetch('/api/upload_voters_csv', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          const count = Number(result.count ?? 0);
          setUploadResult({
            type: "success",
            title: "Voters Added",
            message: `${count.toLocaleString()} ${count === 1 ? "voter has" : "voters have"} been uploaded successfully.`,
            count,
          });
          setSelectedFile(null);
          fetchVoters(tenantId, currentPage, pageSize, debouncedSearch, activeTab);
        } else {
          setUploadResult({
            type: "error",
            title: "Upload Failed",
            message: result.error || "The CSV could not be uploaded.",
            details: result.hint,
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadResult({
          type: "error",
          title: "Upload Failed",
          message: "Failed to upload CSV file. Please try again.",
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      console.log('Cannot upload - missing file or tenant ID');
      setUploadResult({
        type: "error",
        title: "File Required",
        message: tenantId ? "Please select a file first." : "Tenant session is missing. Please log in again.",
      });
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setIsUploading(false);
    setShowUploadModal(false);
  };

  // Get count per role tab from roleCounts
  const getRoleCount = (role: string) => {
    const normalized = role.toLowerCase();
    if (normalized === "all") return roleCounts.all;
    if (normalized === "admin") return roleCounts.admin;
    if (normalized === "sub-admin") return roleCounts["sub-admin"];
    if (normalized === "candidate") return roleCounts.candidate;
    if (normalized === "voter") return roleCounts.voter;
    return 0;
  };

  const stats = {
    total: totalCount,
    label: activeTab === "all" 
      ? "Total Users" 
      : `Total ${formatRoleName(activeTab)}s`
  };

  const filteredVoters = voters;

  return (
    <>
      {/* Upload CSV Modal - Overlays entire screen */}
      {showUploadModal && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center p-4"
          style={{ 
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 99999,
            position: "fixed"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <div 
            className="glass-card w-full max-w-xl rounded-[24px] p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(24,13,66,0.92), rgba(9,2,21,0.96))",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              boxShadow: "0 28px 90px rgba(0, 0, 0, 0.65), 0 0 60px rgba(93,68,248,0.16)",
              zIndex: 100000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-24 right-8 h-48 w-48 rounded-full bg-[#5D44F8]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-8 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {uploadResult?.type === "success" ? "Upload Complete" : "Upload Voters CSV"}
                </h2>
                <p className="mt-1 text-xs text-white/40">
                  {uploadResult?.type === "success"
                    ? "Your voter list has been synchronized."
                    : "Import voters into this tenant account."}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl border border-white/10"
                aria-label="Close upload modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadResult?.type === "success" ? (
              <div className="relative">
                <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-400/[0.06] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 shadow-[0_0_40px_rgba(52,211,153,0.18)]">
                    <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300/80">
                    Success
                  </p>
                  <h3 className="mt-2 text-3xl font-bold tracking-tight text-white">
                    {uploadResult.count?.toLocaleString() ?? "New"} {uploadResult.count === 1 ? "Voter" : "Voters"} Added
                  </h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/58">
                    {uploadResult.message}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => {
                      setUploadResult(null);
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Upload Another
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#140B2D] shadow-[0_0_24px_rgba(255,255,255,0.12)] transition-all hover:bg-white/90"
                  >
                    View Voters
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <>
                {uploadResult?.type === "error" && (
                  <div className="relative mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                      <div>
                        <p className="text-sm font-bold text-red-100">{uploadResult.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-red-100/70">{uploadResult.message}</p>
                        {uploadResult.details && (
                          <p className="mt-1 text-xs text-red-100/50">{uploadResult.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

            {/* CSV Format Info */}
            <div className="mb-4 p-3 rounded-[10px]" style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <h3 className="text-white font-semibold text-sm mb-2">CSV Format:</h3>
              <p className="text-white/60 text-xs mb-2">Your CSV file should contain the following columns:</p>
              <code className="block text-white/80 text-xs mb-1 font-mono">
                email,first_name,middle_name,surname,contact,birth_date,department
              </code>
              <p className="text-white/40 text-xs mb-1">
                <span className="font-semibold">Example:</span>
              </p>
              <code className="block text-white/60 text-xs mb-2 font-mono">
                john@example.com,John,M,Doe,09123456789,1990-01-15,Engineering
              </code>
              <p className="text-red-400/80 text-xs font-semibold mb-1">
                Required columns: email, first_name, surname
              </p>
              <p className="text-white/40 text-xs italic">
                Optional: middle_name, contact, birth_date, department
              </p>
            </div>

            {/* File Upload Area */}
            <div className="mb-4">
              <h3 className="text-white font-semibold text-sm mb-2">Select CSV File</h3>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[10px] p-8 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-[#5D44F8] bg-[#5D44F8]/10' 
                    : 'border-white/20 hover:border-white/40'
                }`}
                style={{
                  background: isDragging ? "rgba(93, 68, 248, 0.1)" : "rgba(255, 255, 255, 0.02)"
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="w-10 h-10 mx-auto mb-3 text-white/40" />
                {selectedFile ? (
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{selectedFile.name}</p>
                    <p className="text-white/60 text-xs">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">Click to upload CSV file</p>
                    <p className="text-white/60 text-xs">or drag and drop</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-white text-sm font-semibold transition-all hover:bg-white/10"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !tenantId || isUploading}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: (selectedFile && tenantId) ? "#5D44F8" : "rgba(93, 68, 248, 0.5)",
                  boxShadow: (selectedFile && tenantId) ? "0 4px 12px rgba(93, 68, 248, 0.3)" : "none"
                }}
                title={!selectedFile ? "Please select a file" : !tenantId ? "Tenant ID missing" : "Upload file"}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dashboard */}
      <div className="flex h-screen flex-col text-[#f1f0f3]" style={{ background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <TenantAdminHeader />

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6 overflow-hidden">
        <TenantAdminSidebar activePath="/users/tenant/voters" isRestricted={isRestricted} />

        <main className={`relative super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none ${isRestricted ? 'pointer-events-none opacity-40' : ''}`}>
          {isRestricted && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070f]/95 p-6 text-center">
              <div className="max-w-xl rounded-[28px] border border-white/10 bg-[#090b14] p-8 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
                <h2 className="text-2xl font-bold text-white">Tenant account access is restricted</h2>
                <p className="mt-3 text-sm text-white/70">This tenant account is expired or pending approval. Voter management is locked until access is restored.</p>
                <button
                  onClick={() => {
                    const destination = `/users/tenant/settings?role=tenant&random=${token}`;
                    window.location.href = `/loader?destination=${encodeURIComponent(destination)}&duration=700`;
                  }}
                  className="mt-6 inline-flex items-center justify-center rounded-[16px] bg-[#5D44F8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#7c68ff]"
                >
                  Go to Settings
                </button>
              </div>
            </div>
          )}
          <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#D0C8FF", textShadow: "2px 2px 20px rgba(208,200,255,0.45)" }}>Voters</h1>

          {/* Top Section: Stats Card + Search + Add Voter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Total Voters Card */}
            <div className="super-admin-card stat-card p-6 rounded-[20px] flex flex-col items-center justify-center">
              <div className="text-5xl font-bold mb-2" style={{ color: "#D0C8FF" }}>{stats.total.toLocaleString()}</div>
              <div className="text-white/60 text-sm">{stats.label}</div>
            </div>

            {/* Search and Add Voter Section */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search Voters"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-[10px] text-white placeholder:text-white/40 focus:outline-none transition-all"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                />
              </div>

              {/* Add Voter Button */}
              <div className="flex justify-start">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="super-admin-button px-6 py-3 rounded-[10px] flex items-center gap-2 text-white font-semibold"
                >
                  <UserPlus className="w-5 h-5" />
                  Add Voter
                </button>
              </div>
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["all", "admin", "sub-admin", "candidate", "voter"].map((role) => {
              const count = getRoleCount(role);
              const isActive = activeTab === role;
              return (
                <button
                  key={role}
                  onClick={() => {
                    setActiveTab(role);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
                    isActive
                      ? "bg-[#5D44F8] text-white border-[#5D44F8]/50 shadow-[0_0_20px_rgba(93,68,248,0.25)]"
                      : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {role === "all" ? "All Users" : formatRoleName(role)} ({count})
                </button>
              );
            })}
          </div>

          {/* Voters Table */}
          <div className="rounded-[20px] overflow-hidden" style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div className="overflow-x-auto decta-scrollbar">
              <table className="w-full min-w-[850px] md:min-w-0">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-semibold">Voter Name</th>
                    <th className="text-left p-4 text-white/60 font-semibold">Email</th>
                    <th className="text-left p-4 text-white/60 font-semibold">Contact</th>
                    <th className="text-left p-4 text-white/60 font-semibold">Role</th>
                    <th className="text-left p-4 text-white/60 font-semibold">Registration Date</th>
                    <th className="text-left p-4 text-white/60 font-semibold">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex items-center justify-center gap-3 text-white/60">
                          <Loader2 className="h-6 w-6 animate-spin text-[#D0C8FF]" />
                          <span>Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVoters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/60">
                        No voters found
                      </td>
                    </tr>
                  ) : (
                    filteredVoters.map((voter) => (
                      <tr key={voter.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white">
                          {`${voter.first_name || ''} ${voter.middle_name || ''} ${voter.surname || ''}`.trim() || 'N/A'}
                        </td>
                        <td className="p-4 text-white/80">{voter.email || 'N/A'}</td>
                        <td className="p-4 text-white/80">{voter.contact || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(voter.user_type)}`}>
                            {formatRoleName(voter.user_type)}
                          </span>
                        </td>
                        <td className="p-4 text-white/80">
                          {voter.created_at ? new Date(voter.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4 text-white/80">{voter.department || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {!isLoading && totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-white/10 text-sm text-white/60 bg-white/[0.02]">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-white">
                    {Math.min((currentPage - 1) * pageSize + 1, totalCount)}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-white">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{" "}
                  of <span className="font-semibold text-white">{totalCount}</span> entries
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-[#5D44F8]"
                      style={{ colorScheme: "dark" }}
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size} className="bg-[#140B2D]">
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>entries</span>
                  </div>
                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(totalCount / pageSize) })
                        .map((_, i) => i + 1)
                        .filter((p) => p === 1 || p === Math.ceil(totalCount / pageSize) || Math.abs(p - currentPage) <= 1)
                        .map((p, index, arr) => {
                          const prev = arr[index - 1];
                          const showEllipsis = prev && p - prev > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="px-1 text-white/40">...</span>}
                              <button
                                onClick={() => setCurrentPage(p)}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                  currentPage === p
                                    ? "bg-[#5D44F8] text-white border border-[#5D44F8]/50 shadow-[0_0_20px_rgba(93,68,248,0.25)]"
                                    : "border border-white/10 hover:bg-white/10"
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                      disabled={currentPage === Math.ceil(totalCount / pageSize) || isLoading}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
