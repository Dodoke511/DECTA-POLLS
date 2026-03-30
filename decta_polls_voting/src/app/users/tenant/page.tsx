export default function TenantAdminPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
            <img
              src="/logo.png"
              alt="D.E.C.T.A Polls"
              className="h-full w-full object-cover object-center"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenant Admin</h1>
        </div>
        <p className="mt-2 text-sm text-white/60">
          Placeholder page for tenant admin routes.
        </p>
      </div>
    </div>
  );
}