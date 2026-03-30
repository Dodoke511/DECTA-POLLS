import Link from "next/link";

export default function TenantRegistrationPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tenant Registration
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Placeholder page. Replace with your real tenant registration flow.
        </p>
        <div className="mt-6">
          <Link
            href="/auth/login_form"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}