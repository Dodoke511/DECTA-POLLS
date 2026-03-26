import Image from "next/image";
import Registration from "../components/auth/registration/registration-view"; 

export default function Home() {
  return (
    // 1. Changed to 'w-full' and 'min-h-screen' to fill the whole browser window
    <div className="min-h-screen w-full bg-zinc-50 font-sans dark:bg-black">
      
      {/* 2. Removed 'max-w-3xl' (the width limit) and 'px-16' (the side padding) */}
      <main className="flex min-h-screen w-full flex-col bg-white dark:bg-black">
        
        {/* Your registration component now has the freedom to be as wide as it wants */}
        <Registration />

      </main>
    </div>
  );
}