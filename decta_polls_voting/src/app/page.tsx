"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth/login_form");
  }, [router]);

  return (
    <div>
      <h1>Redirecting to Login Page...</h1>
    </div>
  );
}