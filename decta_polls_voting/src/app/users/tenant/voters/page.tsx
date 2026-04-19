"use client";

import { useState, useEffect } from "react";
import { TenantAdminHeader } from "@/components/tenant_admin/Header";
import { TenantAdminSidebar } from "@/components/tenant_admin/Sidebar";
import { useRouter } from "next/navigation";

interface Voter {
  votersID: string;
  email: string;
  first_name: string;
  middle_name?: string | null;
  surname: string;
  contact?: string | null;
  birth_date?: string | null;
  created_at: string;
  electionID: string;
}

export default function TenantVotersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [electionId, setElectionId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const random = params.get('random');
    const storedToken = sessionStorage.getItem('tenantToken');

    if (role !== 'tenant' || !random || random !== storedToken) {
      router.push('/auth/login_form');
      return;
    }

    // Get election ID from session storage
    let storedElectionId = sessionStorage.getItem('electionId');
    
    // Check if it's a valid UUID format (8-4-4-4-12 hex digits)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // If no election ID exists or it's invalid (like old temp string), create a new UUID
    if (!storedElectionId || !uuidRegex.test(storedElectionId)) {
      // Generate a valid UUID v4
      storedElectionId = crypto.randomUUID();
      sessionStorage.setItem('electionId', storedElectionId);
      console.warn('Generated new election UUID:', storedElectionId);
    }
    
    setElectionId(storedElectionId);
    fetchVoters(storedElectionId);
  }, [router]);

  const fetchVoters = async (electionIdParam: string) => {
    try {
      const response = await fetch(`/api/tenant_votersdashboard?electionId=${electionIdParam}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setVoters(result.data);
      } else {
        console.error('Failed to fetch voters:', result.error);
        // If election doesn't exist, voters will be empty (not an error)
        setVoters([]);
      }
    } catch (error) {
      console.error('Error fetching voters:', error);
      setVoters([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVoters = voters.filter(voter => {
    const fullName = `${voter.first_name} ${voter.middle_name || ''} ${voter.surname}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      voter.email.toLowerCase().includes(searchLower) ||
      (voter.contact && voter.contact.includes(searchQuery))
    );
  });

  const totalVoters = voters.length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    // Get election ID directly from session storage or state
    let currentElectionId = electionId || sessionStorage.getItem('electionId');
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // If no election ID or invalid format, create a new UUID
    if (!currentElectionId || !uuidRegex.test(currentElectionId)) {
      currentElectionId = crypto.randomUUID();
      sessionStorage.setItem('electionId', currentElectionId);
      setElectionId(currentElectionId);
      console.warn('Generated new election UUID for upload:', currentElectionId);
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('csv', csvFile);
    formData.append('electionId', currentElectionId);

    try {
      const response = await fetch('/api/tenant_votersdashboard', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success! ${result.count} voters uploaded.`);
        setShowUploadModal(false);
        setCsvFile(null);
        // Refresh voters list
        fetchVoters(currentElectionId);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload CSV file');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#03070f] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
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

          <div className="mb-6 flex flex-wrap items-start gap-4">
            {/* Total Voters Card */}
            <div className="inline-block rounded-3xl border border-purple-500/50 bg-transparent px-10 py-6 min-w-[280px] backdrop-blur-sm shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <div className="text-5xl font-bold text-white/80 text-center">{totalVoters}</div>
              <div className="mt-2 text-sm text-white/50 text-center">Total Voters</div>
            </div>

            <div className="flex flex-1 flex-col gap-4 max-w-[600px]">
              {/* Search Bar */}
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" fill="none" stroke="#f1f0f3" viewBox="0 0 24 24" style={{ opacity: 0.6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search Voters"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ color: '#f1f0f3', borderColor: '#f1f0f3' }}
                  className="w-full rounded-2xl border bg-white/5 py-3 pl-12 pr-4 placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button className="rounded-xl px-6 py-3 font-medium text-white transition-all hover:shadow-lg" style={{ backgroundColor: '#5D44F8' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4c35d1'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5D44F8'}>
                  Voter Registration Form
                </button>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="rounded-xl border px-6 py-3 font-medium transition-all" style={{ borderColor: 'rgba(93, 68, 248, 0.5)', backgroundColor: 'rgba(93, 68, 248, 0.1)', color: '#D0C8FF' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(93, 68, 248, 0.2)'; e.currentTarget.style.borderColor = '#5D44F8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(93, 68, 248, 0.1)'; e.currentTarget.style.borderColor = 'rgba(93, 68, 248, 0.5)'; }}>
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Voter
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Voters Table */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Voter Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVoters.length > 0 ? (
                    filteredVoters.map((voter) => (
                      <tr key={voter.votersID} className="border-b border-white/5 transition-colors hover:bg-white/5">
                        <td className="px-6 py-4 text-sm text-white/80">
                          {voter.first_name} {voter.middle_name ? voter.middle_name + ' ' : ''}{voter.surname}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">{voter.email}</td>
                        <td className="px-6 py-4 text-sm text-white/60">{formatDate(voter.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-sm text-white/40">
                        {loading ? 'Loading voters...' : 'No voters found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#1a1625' }}>
            {/* Purple left border accent */}
            <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: 'linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%)' }}></div>
            
            <div className="p-6 pl-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">Upload Voters CSV</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg p-1.5 text-white/80 hover:text-white transition-all"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

            <div className="mb-5 rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">CSV Format:</h3>
              <p className="text-xs text-white/70 mb-3 leading-relaxed">
                Your CSV file should contain the following columns:
              </p>
              <code className="block rounded bg-black/40 p-2.5 text-xs text-white/90 font-mono leading-relaxed">
                Email, First Name, Middle Name, Surname, Contact, Birth Date
              </code>
              <p className="mt-3 text-xs text-white/60 leading-relaxed">
                <span className="font-medium text-white/70">Example:</span> john@example.com, John, M., Doe, 09123456789, 1990-01-15
              </p>
              <p className="mt-3 text-xs text-white/50 italic leading-relaxed">
                Note: Email, First Name, and Surname are required. Others are optional.
              </p>
            </div>

            <div className="mb-5">
              <label className="mb-3 block text-sm font-medium text-white/90">
                Select CSV File
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  id="csv-upload"
                  className="hidden"
                />
                <label
                  htmlFor="csv-upload"
                  className="upload-box flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-white/20 bg-white/5 px-6 py-6 transition-all hover:border-purple-400/60 hover:bg-white/10"
                  onMouseEnter={(e) => {
                    const textElement = e.currentTarget.querySelector('.upload-text');
                    if (textElement && !csvFile) {
                      (textElement as HTMLElement).style.color = '#5D44F8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const textElement = e.currentTarget.querySelector('.upload-text');
                    if (textElement && !csvFile) {
                      (textElement as HTMLElement).style.color = 'rgba(255, 255, 255, 0.8)';
                    }
                  }}
                >
                  <div className="text-center">
                    <p className="upload-text text-sm font-medium transition-colors" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      {csvFile ? csvFile.name : 'Click to upload CSV file'}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      or drag and drop
                    </p>
                  </div>
                </label>
              </div>
              {csvFile && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-purple-500/20 px-3 py-2">
                  <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-white flex-1">
                    {csvFile.name}
                  </p>
                  <button
                    onClick={() => setCsvFile(null)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!csvFile || uploading}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#5D44F8' }}
                onMouseEnter={(e) => !uploading && (e.currentTarget.style.backgroundColor = '#4c35d1')}
                onMouseLeave={(e) => !uploading && (e.currentTarget.style.backgroundColor = '#5D44F8')}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
