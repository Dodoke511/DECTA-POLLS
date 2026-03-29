"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import DarkVeil from './ui/DarkVeil';
import GradientText from './ui/GradientText';
import SplitText from './ui/SplitText';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Memoized components for better performance
const MemoizedDarkVeil = memo(DarkVeil);
const MemoizedGradientText = memo(GradientText);
const MemoizedSplitText = memo(SplitText);

export default function LandingPage() {
  const [copiedText, setCopiedText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationsInitialized = useRef(false);

  // Memoized gradient colors to prevent re-renders
  const gradientColors = useMemo(() => ["#5227FF","#FF9FFC","#B19EEF"], []);

  // Debounced copy function to prevent rapid clicks
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Clear any pending timers so rapid clicks reset cleanly
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (unmountTimer.current) clearTimeout(unmountTimer.current);

      setCopiedText(type);
      setToastVisible(true);

      // Start fade-out after 1.5 s
      hideTimer.current = setTimeout(() => setToastVisible(false), 1500);
      // Unmount after fade-out transition (300 ms) completes
      unmountTimer.current = setTimeout(() => setCopiedText(''), 1800);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, []);

  // Optimized scroll animations with reduced frequency and better performance
  useEffect(() => {
    if (animationsInitialized.current) return;
    
    const ctx = gsap.context(() => {
      // Use will-change and transform3d for better performance
      const animationConfig = {
        ease: 'power2.out',
        force3D: true,
        willChange: 'transform, opacity'
      };

      // Batch similar animations for better performance
      const fadeUpElements = gsap.utils.toArray<HTMLElement>('.fade-up:not(.always-visible)');
      const fadeRightElements = gsap.utils.toArray<HTMLElement>('.fade-right');
      const fadeLeftElements = gsap.utils.toArray<HTMLElement>('.fade-left');
      const fadeDownElements = gsap.utils.toArray<HTMLElement>('.fade-down');
      const fadeScaleElements = gsap.utils.toArray<HTMLElement>('.fade-scale');

      // Optimized scroll trigger settings
      const scrollTriggerConfig = {
        start: 'top 85%',
        end: 'bottom 15%',
        toggleActions: 'play reverse play reverse',
        fastScrollEnd: true,
        anticipatePin: 0.4
      };

      // Batch fade-up animations
      fadeUpElements.forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, y: 35, ...animationConfig },
          {
            opacity: 1, y: 0,
            duration: 0.75,
            scrollTrigger: { trigger: el, ...scrollTriggerConfig },
            ...animationConfig
          }
        );
      });

      // Batch fade-right animations
      fadeRightElements.forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, x: 50, ...animationConfig },
          {
            opacity: 1, x: 0,
            duration: 0.85,
            scrollTrigger: { trigger: el, ...scrollTriggerConfig },
            ...animationConfig
          }
        );
      });

      // Batch fade-left animations
      fadeLeftElements.forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, x: -50, ...animationConfig },
          {
            opacity: 1, x: 0,
            duration: 0.85,
            scrollTrigger: { trigger: el, ...scrollTriggerConfig },
            ...animationConfig
          }
        );
      });

      // Batch fade-down animations
      fadeDownElements.forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, y: -35, ...animationConfig },
          {
            opacity: 1, y: 0,
            duration: 0.75,
            scrollTrigger: { trigger: el, ...scrollTriggerConfig },
            ...animationConfig
          }
        );
      });

      // Batch fade-scale animations
      fadeScaleElements.forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, scale: 0.9, ...animationConfig },
          {
            opacity: 1, scale: 1,
            duration: 0.8,
            scrollTrigger: { trigger: el, ...scrollTriggerConfig },
            ...animationConfig
          }
        );
      });

      // Optimized staggered animations
      const cardContainer = document.querySelector('.animate-cards-container');
      if (cardContainer) {
        const cards = cardContainer.querySelectorAll('.animate-card');
        gsap.fromTo(cards,
          { opacity: 0, y: 40, ...animationConfig },
          {
            opacity: 1, y: 0,
            duration: 0.6,
            stagger: 0.08, // Reduced stagger for smoother animation
            scrollTrigger: { trigger: cardContainer, ...scrollTriggerConfig },
            ...animationConfig
          }
        );
      }

      // Optimized hero title animation
      const heroTitleContainer = document.querySelector('.hero-title-container');
      if (heroTitleContainer) {
        const heroLines = heroTitleContainer.querySelectorAll('.hero-line');
        gsap.fromTo(heroLines,
          { opacity: 0, y: 20, ...animationConfig },
          {
            opacity: 1, y: 0,
            duration: 0.8,
            stagger: 0.12, // Reduced stagger
            scrollTrigger: { 
              trigger: heroTitleContainer, 
              start: 'top 90%',
              end: 'bottom 10%',
              toggleActions: 'play reverse play reverse',
              fastScrollEnd: true
            },
            ...animationConfig
          }
        );
      }
    });

    animationsInitialized.current = true;
    return () => {
      ctx.revert();
      animationsInitialized.current = false;
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, []);
  return (
    <div className="min-h-screen relative text-decta-text font-source-sans overflow-x-hidden selection:bg-decta-brand selection:text-white">
      {/* DarkVeil Animated Background */}
      <div className="fixed inset-0 -z-[100] pointer-events-none w-full h-full overflow-hidden">
        <MemoizedDarkVeil
          hueShift={0}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={1.2}
          scanlineFrequency={0}
          warpAmount={0}
          resolutionScale={1}
        />
      </div>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Image 
            src="/DECTAPolls_Logo.png" 
            alt="D.E.C.T.A Polls Logo" 
            width={40} 
            height={40} 
            className="object-contain"
          />
          <span className="font-montserrat font-bold text-lg tracking-wide">D.E.C.T.A Polls</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-base opacity-90 transition-opacity font-medium">
          <a href="#features" className="hover:text-[#f1f0f3] hover:drop-shadow-[0_0_8px_rgba(241,240,243,0.8)] active:!text-[#372892] active:!drop-shadow-none transition-all duration-300">Our Platform Features</a>
          <a href="#about" className="hover:text-[#f1f0f3] hover:drop-shadow-[0_0_8px_rgba(241,240,243,0.8)] active:!text-[#372892] active:!drop-shadow-none transition-all duration-300">About</a>
          <a href="#contact" className="hover:text-[#f1f0f3] hover:drop-shadow-[0_0_8px_rgba(241,240,243,0.8)] active:!text-[#372892] active:!drop-shadow-none transition-all duration-300">Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-8 pt-8 pb-24 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-16">
        
        <div className="md:w-[45%] lg:w-[42%] flex flex-col items-start z-10 text-left">
          <h1 className="font-montserrat font-bold text-6xl lg:text-7xl leading-[1.05] mb-4 tracking-tight hero-title-container">
            <span className="block hero-line">Your Rules.</span>
            <span className="block hero-line">Your Brand.</span>
            <span className="block hero-line whitespace-nowrap">Our <MemoizedGradientText colors={gradientColors} animationSpeed={8}>Security.</MemoizedGradientText></span>
          </h1>
          <p className="text-xl lg:text-2xl opacity-80 mb-4 max-w-lg leading-snug fade-up">
            A dynamic white-label voting engine designed for seamless branding and ironclad data isolation across every tenant.
          </p>
          <div className="button-group">
            <button className="btn-build">
              Build your Election &rarr;
            </button>
            <button className="btn-login glass-card">
              Login
            </button>
          </div>
        </div>

        {/* Hero Image / Graphic Mockup */}
        <div className="md:w-[55%] lg:w-[58%] flex justify-center relative z-10 w-full mt-10 md:mt-0 fade-right">
          <div className="glass-card w-full max-w-[38rem] aspect-[4/3] p-8 md:p-10 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] fade-scale">
            
            {/* Top Bar MacOS dots */}
            <div className="flex items-center gap-2 mb-3 fade-down">
              <div className="w-4 h-4 rounded-full bg-[#ff5f56]"></div>
              <div className="w-4 h-4 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-4 h-4 rounded-full bg-[#27c93f]"></div>
            </div>

            {/* Gradient Text Title Box */}
            <div className="bg-opacity-50 border border-[#8fa4f8]/20 rounded-2xl px-6 py-4 inline-block backdrop-blur-md mb-8 shadow-lg shrink-0 self-start fade-left" style={{ backgroundColor: 'rgba(26, 20, 51, 0.5)' }}>
              <h3 className="font-montserrat font-bold text-xl md:text-2xl tracking-wide">
                <MemoizedGradientText colors={gradientColors} animationSpeed={8}>
                  One platform. Fair elections.
                </MemoizedGradientText>
              </h3>
            </div>

            {/* Middle Section: Donut + Bars (inside glass) */}
            <div className="flex items-stretch gap-6 mb-8 w-full fade-up">
              
              {/* Donut Chart (Number of Users) inside Glass */}
              <div className="bg-opacity-50 border border-[#8fa4f8]/20 rounded-2xl p-5 flex items-center justify-center backdrop-blur-md shadow-lg shrink-0 fade-scale" style={{ backgroundColor: 'rgba(26, 20, 51, 0.5)' }}>
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[10px] md:border-[12px] border-[#2a204d] border-t-decta-brand border-r-[#8fa4f8] transform -rotate-45 relative flex items-center justify-center shadow-[0_0_20px_rgba(93,68,248,0.3)] shrink-0">
                   <div className="w-[70px] h-[70px] md:w-[80px] md:h-[80px] rounded-full absolute flex flex-col items-center justify-center transform rotate-45" style={{ backgroundColor: '#1a1433' }}>
                      <span className="text-white font-bold text-lg md:text-xl leading-tight">10k+</span>
                      <span className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest mt-1">Users</span>
                   </div>
                </div>
              </div>

              {/* 3 Bars inside Glass */}
              <div className="flex-1 bg-opacity-50 border border-[#8fa4f8]/20 rounded-2xl p-6 flex flex-col justify-center gap-4 md:gap-5 backdrop-blur-md shadow-lg fade-right" style={{ backgroundColor: 'rgba(26, 20, 51, 0.5)' }}>
                <div className="h-3 md:h-4 w-full bg-[#3d325e] rounded-full"></div>
                <div className="h-3 md:h-4 w-[85%] bg-[#8fa4f8] rounded-full shadow-[0_0_12px_rgba(143,164,248,0.4)]"></div>
                <div className="h-3 md:h-4 w-[65%] bg-decta-brand rounded-full shadow-[0_0_12px_rgba(149,134,248,0.4)]"></div>
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Core Election Services */}
      {/* Core Election Services */}
      <section id="features" className="relative px-4 sm:px-8 py-20 w-full flex justify-center text-center md:text-left">
        
        {/* The Giant Glassmorphism Container */}
        <div className="max-w-6xl mx-auto flex flex-col items-center md:items-start w-full relative z-10 glass-card p-10 md:p-16 my-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] fade-scale">
          
          <h2 className="font-montserrat font-bold text-5xl md:text-6xl mb-6 tracking-tight text-white drop-shadow-[0_4px_15px_rgba(255,255,255,0.05)] text-center md:text-left">
            <MemoizedSplitText
              text="Core Election"
              className=""
              delay={40}
              duration={1.2}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 50 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
              tag="span"
              onLetterAnimationComplete={() => {}}
            />
            <br />
            <MemoizedGradientText colors={gradientColors} animationSpeed={8}>Services</MemoizedGradientText>
          </h2>
          <MemoizedSplitText
            text="Voting services involve different types of users who help manage and participate in elections. In this system, these roles include the Super Admin, Tenant Admin, and Voters, each with specific responsibilities in running and participating in the voting process. Addressing their roles helps maintain a secure and reliable election system."
            className="text-base md:text-lg opacity-90 leading-relaxed max-w-4xl text-gray-300 font-medium mb-20 text-left lg:pr-10"
            delay={20}
            duration={0.8}
            ease="power2.out"
            splitType="words"
            from={{ opacity: 0, y: 15 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-50px"
            textAlign="left"
            tag="p"
            onLetterAnimationComplete={() => {}}
          />

          {/* Icons Grid: Centered exactly as requested, independently of left-aligned text */}
          <div className="animate-cards-container flex flex-wrap items-center justify-center gap-x-14 gap-y-16 w-full max-w-5xl mx-auto mt-6">
            
            {/* Rule execution engine */}
            <div className="animate-card flex flex-col items-center justify-start gap-6 transition-transform duration-500 hover:-translate-y-2 cursor-pointer group shrink-0 w-[200px]">
               <svg className="w-[88px] h-[88px] text-[#e2ddea] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
               </svg>
               <div className="w-auto px-6 py-[0.95rem] rounded-[18px] bg-white text-[#1a1433] font-bold tracking-wide text-[15px] whitespace-nowrap transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-transparent group-hover:bg-white/10 group-hover:backdrop-blur-xl group-hover:text-white group-hover:border-white/30 group-hover:shadow-[0_0_25px_rgba(150,134,248,0.7)] relative">
                  Rule execution engine
               </div>
            </div>

            {/* Pre-election engine */}
            <div className="animate-card flex flex-col items-center justify-start gap-6 transition-transform duration-500 hover:-translate-y-2 cursor-pointer group shrink-0 w-[200px]">
               <svg className="w-[88px] h-[88px] text-[#e2ddea] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
               </svg>
               <div className="w-auto px-6 py-[0.95rem] rounded-[18px] bg-white text-[#1a1433] font-bold tracking-wide text-[15px] whitespace-nowrap transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-transparent group-hover:bg-white/10 group-hover:backdrop-blur-xl group-hover:text-white group-hover:border-white/30 group-hover:shadow-[0_0_25px_rgba(150,134,248,0.7)] relative">
                  Pre-election engine
               </div>
            </div>
            
            {/* Vote processing logic */}
            <div className="animate-card flex flex-col items-center justify-start gap-6 transition-transform duration-500 hover:-translate-y-2 cursor-pointer group shrink-0 w-[200px]">
               <svg className="w-[88px] h-[88px] text-[#e2ddea] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
               </svg>
               <div className="w-auto px-6 py-[0.95rem] rounded-[18px] bg-white text-[#1a1433] font-bold tracking-wide text-[15px] whitespace-nowrap transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-transparent group-hover:bg-white/10 group-hover:backdrop-blur-xl group-hover:text-white group-hover:border-white/30 group-hover:shadow-[0_0_25px_rgba(150,134,248,0.7)] relative">
                  Vote processing logic
               </div>
            </div>

            {/* Security and Encryption */}
            <div className="animate-card flex flex-col items-center justify-start gap-6 transition-transform duration-500 hover:-translate-y-2 cursor-pointer group shrink-0 w-[200px]">
               <svg className="w-[88px] h-[88px] text-[#e2ddea] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
               </svg>
               <div className="w-auto px-6 py-[0.95rem] rounded-[18px] bg-white text-[#1a1433] font-bold tracking-wide text-[15px] whitespace-nowrap transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-transparent group-hover:bg-white/10 group-hover:backdrop-blur-xl group-hover:text-white group-hover:border-white/30 group-hover:shadow-[0_0_25px_rgba(150,134,248,0.7)] relative">
                  Security and Encryption
               </div>
            </div>

            {/* Result computation logic */}
            <div className="animate-card flex flex-col items-center justify-start gap-6 transition-transform duration-500 hover:-translate-y-2 cursor-pointer group shrink-0 w-[200px]">
               <svg className="w-[88px] h-[88px] text-[#e2ddea] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
               </svg>
               <div className="w-auto px-6 py-[0.95rem] rounded-[18px] bg-white text-[#1a1433] font-bold tracking-wide text-[15px] whitespace-nowrap transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-transparent group-hover:bg-white/10 group-hover:backdrop-blur-xl group-hover:text-white group-hover:border-white/30 group-hover:shadow-[0_0_25px_rgba(150,134,248,0.7)] relative">
                  Result computation logic
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="relative px-8 py-32 w-full text-center md:text-left">
        <div className="max-w-6xl w-full mx-auto relative z-10 pr-0 md:pr-10 lg:pr-32 fade-left">
          <MemoizedSplitText
            text="About Us"
            className="font-montserrat font-bold text-5xl md:text-[4rem] tracking-tight mb-12 text-white"
            delay={60}
            duration={1.5}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 60 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="left"
            tag="h2"
            onLetterAnimationComplete={() => {}}
          />
          <MemoizedSplitText
            text="D.E.C.T.A Polls is a web-based voting service developed by third-year students from the Cebu Institute of Technology - University (CIT-U). The platform was created to provide a more convenient and organized way for organizations to conduct elections online. It allows administrators to manage elections efficiently while enabling voters to participate in a secure and accessible voting process. By using this system, organizations can simplify election management, reduce manual work, and ensure that the voting process remains transparent and reliable. D.E.C.T.A Polls aims to support fair and efficient digital voting through a user-friendly and structured platform."
            className="text-[1.05rem] md:text-lg opacity-90 leading-relaxed text-justify md:text-left text-gray-300 fade-up"
            delay={15}
            duration={0.6}
            ease="power2.out"
            splitType="words"
            from={{ opacity: 0, y: 10 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-50px"
            textAlign="justify"
            tag="p"
            onLetterAnimationComplete={() => {}}
          />
        </div>
      </section>

      {/* Contact Us & Footer */}
      <section id="contact" className="px-8 pt-20 pb-10 bg-transparent text-center relative overflow-hidden flex flex-col items-center">
        <h2 className="font-montserrat font-bold text-5xl md:text-6xl mb-6 fade-down">
          <MemoizedGradientText colors={gradientColors} animationSpeed={8}>Contact Us</MemoizedGradientText>
        </h2>
        <MemoizedSplitText
          text="Have questions or planning to conduct an election? We'd be happy to help. Send us a message with your organization name, preferred election date, and what kind of voting service you are interested in. We will get back to you as soon as possible."
          className="max-w-3xl mx-auto opacity-90 leading-relaxed mb-16 text-lg fade-up"
          delay={25}
          duration={0.8}
          ease="power2.out"
          splitType="words"
          from={{ opacity: 0, y: 15 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-50px"
          textAlign="center"
          tag="p"
          onLetterAnimationComplete={() => {}}
        />

        {/* Outer wrapper — relative anchor for the toast */}
        <div className="relative mb-16 w-full flex flex-col items-center">

          {/* Toast — centered above the contact row, fully out of flow */}
          {copiedText && (
            <div className="toast-container">
              <div
                className="toast-notification"
                style={{
                  transition: 'opacity 300ms ease, transform 300ms ease',
                  opacity: toastVisible ? 1 : 0,
                  transform: toastVisible ? 'translateY(0)' : 'translateY(4px)',
                }}
              >
                Copied!
              </div>
            </div>
          )}

          {/* Contact row — always visible */}
          <div className="contact-row">
            <div className="contact-item">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <button
                onClick={() => copyToClipboard('DECTAPolls@gmail.com', 'email')}
                className="hover:text-decta-brand transition-colors cursor-pointer"
              >
                DECTAPolls@gmail.com
              </button>
            </div>

            <div className="contact-item">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.273-3.973-6.869-6.869l1.293-.97c.362-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <button
                onClick={() => copyToClipboard('0923-456-0987', 'phone')}
                className="hover:text-decta-brand transition-colors cursor-pointer"
              >
                0923-456-0987
              </button>
            </div>
          </div>

        </div>

        <div className="w-full border-t border-white/5 pt-0 mt-0 flex justify-center text-sm opacity-60" style={{ opacity: 0.6, visibility: 'visible', display: 'flex' }}>
          <p className="flex items-center gap-2" style={{ opacity: 1, visibility: 'visible', display: 'flex' }}>
            <span>&copy;</span> 2026 D.E.C.T.A Polls
          </p>
        </div>
      </section>
    </div>
  );
}
