"use client";

import React, { useState, useEffect, useRef } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Search, UserPlus, X, Upload } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [activeTab, setActiveTab] = useState<string>("all");
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

    if (storedTenantId) {
      setTenantId(storedTenantId);
      console.log('Tenant ID set:', storedTenantId);
      fetchVoters(storedTenantId);
    } else {
      console.warn('No tenant ID found in session storage');
      setLoading(false);
    }
  }, [router]);

  const fetchVoters = async (tenantId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/get_tenant_voters?tenantId=${tenantId}`);
      const result = await response.json();

      if (response.ok) {
        setVoters(result.data || []);
      } else {
        console.error("Error fetching voters:", result.error);
        setVoters([]);
      }
    } catch (error) {
      console.error("Error fetching voters:", error);
      setVoters([]);
    } finally {
      setLoading(false);
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
          fetchVoters(tenantId);
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

  if (loading) {
    return <div className="min-h-screen bg-[#03070f] flex items-center justify-center text-white">Loading...</div>;
  }

  // Calculate stats based on active filter tab
  const getFilteredCount = (role: string) => {
    if (role === "all") return voters.length;
    return voters.filter(v => (v.user_type?.toLowerCase() || 'voter') === role).length;
  };

  const stats = {
    total: getFilteredCount(activeTab),
    label: activeTab === "all" 
      ? "Total Users" 
      : `Total ${formatRoleName(activeTab)}s`
  };

  // Filter voters based on activeTab and search query
  const filteredVoters = voters.filter(voter => {
    const voterRole = voter.user_type?.toLowerCase() || 'voter';
    
    // 1. Role filter
    if (activeTab !== "all" && voterRole !== activeTab) {
      return false;
    }

    // 2. Search query filter
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${voter.first_name || ''} ${voter.middle_name || ''} ${voter.surname || ''}`.toLowerCase();
    const roleFormatted = formatRoleName(voter.user_type).toLowerCase();
    return (
      fullName.includes(searchLower) ||
      voter.email?.toLowerCase().includes(searchLower) ||
      voter.contact?.toLowerCase().includes(searchLower) ||
      roleFormatted.includes(searchLower)
    );
  });

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
        <TenantAdminSidebar activePath="/users/tenant/voters" />

        <main className="super-admin-dashboard-main min-w-0 flex-1 rounded-[28px] border p-6 shadow-[0_0_60px_rgba(93,68,248,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm md:p-8 overflow-y-auto no-scrollbar md:rounded-l-none">
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
              const count = getFilteredCount(role);
              const isActive = activeTab === role;
              return (
                <button
                  key={role}
                  onClick={() => setActiveTab(role)}
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
            <div className="overflow-x-auto">
              {filteredVoters.length === 0 ? (
                <div className="p-8 text-center text-white/60">
                  No voters found
                </div>
              ) : (
                <table className="w-full">
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
                    {filteredVoters.map((voter) => (
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
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
