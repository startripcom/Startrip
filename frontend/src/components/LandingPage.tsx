import React, { useState } from 'react';
import {
  ArrowUpRight,
  Play,
  Check,
  Menu,
  X,
  TrendingUp,
  FileCheck2,
  Bell,
  Wallet,
  Globe,
  ArrowRight,
  Coins,
} from 'lucide-react';
import {
  StarFourPoint,
  StellarNetworkIcon,
  UsdcBadge,
  XlmBadge,
  WalletLogo,
  CornerHandles,
  StellarCoinsGraphic,
} from './Icons';
import { CreatorDashboard } from './CreatorDashboard';
import { useWallet } from '../context/WalletContext';
import { WalletProfileDropdown } from './WalletProfileDropdown';

interface LandingPageProps {
  onOpenDemo: () => void;
  onOpenDashboard: () => void;
  onOpenWalletModal: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Do I need to know anything about crypto?',
    a: 'No. Install a free Stellar wallet once and connect it. Tips show up there like money in a bank app, and USDC stays worth a dollar.',
  },
  {
    q: 'What do my fans need to tip me?',
    a: 'A free Stellar wallet such as LOBSTR or Freighter. Fans without one can set it up in a couple of minutes from your tip page, and every tip after that is one tap.',
  },
  {
    q: 'Does StarTip ever hold my money?',
    a: 'Never. Every tip goes straight from the fan’s wallet to yours on the Stellar network. StarTip cannot freeze, delay or take a cut from your balance.',
  },
  {
    q: 'How do alerts get onto my stream?',
    a: 'Copy your alert link from the dashboard and paste it into OBS or Streamlabs as a Browser Source. Whenever a tip settles, the alert pops up automatically.',
  },
  {
    q: 'What does testnet mean for me?',
    a: 'Testnet is Stellar’s practice network. It works like the real thing, using free test coins so you can try your page, widget and alerts before going live.',
  },
];

export function LandingPage({
  onOpenDemo,
  onOpenDashboard,
  onOpenWalletModal,
}: LandingPageProps) {
  const { walletAddress, creator, isAuthenticated, disconnect, connectWallet } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleConnectWallet = async () => {
    try {
      const res = await connectWallet();
      if (res && res.is_registered) {
        onOpenDashboard();
      } else if (res && !res.is_registered) {
        onOpenWalletModal();
      }
    } catch (err) {
      onOpenWalletModal();
    }
  };

  // Interactive Hero Tip Card state
  const [heroCurrency, setHeroCurrency] = useState<'USDC' | 'XLM'>('USDC');
  const [heroAmount, setHeroAmount] = useState<number>(5);
  const [heroSettledPulse, setHeroSettledPulse] = useState(false);

  // Interactive Step 03 buttons state
  const [copiedStepLink, setCopiedStepLink] = useState(false);
  const [addedToObs, setAddedToObs] = useState(false);

  // Interactive Card 2 ("Fans pick, you get paid") selected tile
  const [selectedFeatureTile, setSelectedFeatureTile] = useState<string>('5 USDC');

  // FAQ state (all open by default to match Figma spec, toggleable on click)
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0, 1, 2, 3, 4]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const heroPresets = heroCurrency === 'USDC' ? [1, 2, 5, 10] : [10, 25, 50, 100];

  const handleHeroCurrencyChange = (cur: 'USDC' | 'XLM') => {
    setHeroCurrency(cur);
    setHeroAmount(cur === 'USDC' ? 5 : 25);
  };

  const handleHeroTipClick = () => {
    setHeroSettledPulse(true);
    setTimeout(() => setHeroSettledPulse(false), 1600);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070A1A] text-white overflow-x-hidden">
      {/* ==================================================================== */}
      {/* MOBILE MENU OPEN OVERLAY ("Landing page · mobile · menu open")       */}
      {/* ==================================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#070A1A] px-5 pb-8 flex flex-col justify-between overflow-y-auto lg:hidden">
          {/* Subtle 6-col vertical lines */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-r border-white/[0.03] h-full last:border-r-0" />
            ))}
          </div>

          {/* Bottom Purple Glow */}
          <div
            className="pointer-events-none absolute w-[900px] h-[900px] -left-[255px] top-[560px]"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(140, 115, 255, 0.8) 0%, rgba(74, 47, 194, 0.5) 30%, rgba(7, 10, 26, 0) 60%)',
            }}
          />

          <div className="relative z-10 space-y-6">
            {/* Top Bar inside mobile menu */}
            <div className="h-[72px] py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#C6FF3D] flex items-center justify-center">
                  <StarFourPoint className="w-4 h-4" color="#0B1026" />
                </div>
                <span className="font-bold text-[19px] leading-[24px] tracking-[-0.5px] text-white">
                  StarTip
                </span>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full border border-white/[0.18] flex items-center justify-center text-white"
                aria-label="Close menu"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            {/* Menu Navigation List */}
            <nav className="border-t border-white/[0.08] divide-y divide-white/[0.06]">
              {[
                { label: 'Home', num: '[ 01 ]', id: 'hero', active: true },
                { label: 'Product', num: '[ 02 ]', id: 'product', active: false },
                { label: 'How it works', num: '[ 03 ]', id: 'how-it-works', active: false },
                { label: 'Fees', num: '[ 04 ]', id: 'fees', active: false },
                { label: 'FAQ', num: '[ 05 ]', id: 'faq', active: false },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="w-full h-[68px] flex items-center justify-between text-left"
                >
                  <span
                    className={`text-[24px] leading-[31px] font-medium tracking-[-0.5px] ${
                      item.active ? 'text-white' : 'text-white/72'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`font-mono-code text-[12px] leading-[16px] ${
                      item.active ? 'text-[#C6FF3D]' : 'text-white/40'
                    }`}
                  >
                    {item.num}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Bottom Stack inside mobile menu */}
          <div className="relative z-10 space-y-6 pt-8">
            <div className="inline-flex items-center gap-2.5 pl-[9px] pr-[17px] py-[7px] rounded-full bg-white/[0.04] border border-white/[0.16]">
              <span className="w-[26px] h-[26px] rounded-full bg-white flex items-center justify-center">
                <StellarNetworkIcon className="w-3.5 h-3.5" color="#0B1026" />
              </span>
              <span className="text-[13px] text-white/70">Live on</span>
              <span className="text-[13px] font-semibold text-white">Stellar testnet</span>
            </div>

            <div className="space-y-3">
              {isAuthenticated && creator ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenDashboard();
                    }}
                    className="w-full h-[52px] rounded-full bg-[#C6FF3D] font-semibold text-[15px] text-[#0B1026] flex items-center justify-center gap-2"
                  >
                    <span>Dashboard (@{creator.username})</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      disconnect();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full h-[52px] rounded-full border border-white/[0.24] font-semibold text-[15px] text-white/70 flex items-center justify-center"
                  >
                    Disconnect ({walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : 'Wallet'})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleConnectWallet();
                    }}
                    className="w-full h-[52px] rounded-full border border-white/[0.24] font-semibold text-[15px] text-white flex items-center justify-center"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleConnectWallet();
                    }}
                    className="w-full h-[52px] rounded-full bg-[#C6FF3D] font-semibold text-[15px] text-[#0B1026] flex items-center justify-center gap-2.5"
                  >
                    <span>Start for free</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. HERO SECTION                                                      */}
      {/* ==================================================================== */}
      <section
        id="hero"
        className="relative w-full min-h-[1050px] lg:h-[1080px] flex flex-col items-center overflow-hidden px-5 lg:px-0 pb-16 lg:pb-0"
      >
        {/* Subtle Vertical Grid Columns */}
        <div className="pointer-events-none absolute inset-0 max-w-[1440px] mx-auto grid grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`border-r border-white/[0.03] h-full ${
                i >= 6 ? 'hidden lg:block' : ''
              }`}
            />
          ))}
        </div>

        {/* Glow Purple */}
        <div
          className="pointer-events-none absolute w-[900px] h-[900px] lg:w-[1500px] lg:h-[1500px] top-[420px] lg:top-[270px] left-1/2 -translate-x-1/2"
          style={{
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(140, 115, 255, 0.8) 0%, rgba(74, 47, 194, 0.5) 30%, rgba(7, 10, 26, 0) 60%)',
          }}
        />

        {/* Glow Lime */}
        <div
          className="pointer-events-none absolute w-[520px] h-[360px] lg:w-[900px] lg:h-[600px] top-[514px] lg:top-[600px] left-1/2 -translate-x-1/2"
          style={{
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(198, 255, 61, 0.28) 0%, rgba(198, 255, 61, 0) 60%)',
          }}
        />

        {/* Concentric Orbital Circles */}
        <div className="pointer-events-none absolute top-[474px] lg:top-[520px] left-1/2 -translate-x-1/2 w-[640px] h-[640px] lg:w-[1100px] lg:h-[1100px] rounded-full border border-white/[0.07]" />
        <div className="pointer-events-none absolute top-[394px] lg:top-[400px] left-1/2 -translate-x-1/2 w-[820px] h-[820px] lg:w-[1340px] lg:h-[1340px] rounded-full border border-white/[0.07]" />

        {/* TOP BAR (1200px wide on desktop, 350px on mobile) */}
        <header className="relative z-20 w-full max-w-[1200px] h-[72px] lg:h-[96px] flex items-center justify-between">
          <div className="flex items-center gap-12 xl:gap-[181px]">
            {/* Brand Logo */}
            <a href="#hero" className="flex items-center gap-2 lg:gap-2.5">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#C6FF3D] flex items-center justify-center">
                <StarFourPoint className="w-4 h-4 lg:w-[18px] lg:h-[18px]" color="#0B1026" />
              </div>
              <span className="font-bold text-[19px] lg:text-[21px] leading-[27px] tracking-[-0.5px] text-white">
                StarTip
              </span>
            </a>

            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-[30px] font-mono-code text-[13px] leading-[17px]">
              <button
                onClick={() => scrollToSection('hero')}
                className="font-medium text-white hover:text-[#C6FF3D] transition cursor-pointer whitespace-nowrap"
              >
                [ Home ]
              </button>
              <button
                onClick={() => scrollToSection('product')}
                className="text-white/62 hover:text-white transition cursor-pointer whitespace-nowrap"
              >
                [ Product ]
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-white/62 hover:text-white transition cursor-pointer whitespace-nowrap"
              >
                [ How it works ]
              </button>
              <button
                onClick={() => scrollToSection('fees')}
                className="text-white/62 hover:text-white transition cursor-pointer whitespace-nowrap"
              >
                [ Fees ]
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-white/62 hover:text-white transition cursor-pointer whitespace-nowrap"
              >
                [ FAQ ]
              </button>
            </nav>
          </div>

          {/* Desktop Right Buttons */}
          <div className="hidden lg:flex items-center gap-2.5">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <WalletProfileDropdown
                  theme="dark"
                  onNavigateToDashboard={onOpenDashboard}
                />
                <button
                  onClick={onOpenDashboard}
                  className="h-[42px] px-[20px] rounded-full bg-[#C6FF3D] hover:brightness-95 font-semibold text-[14px] leading-[18px] text-[#0B1026] transition cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <span>Dashboard</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleConnectWallet}
                  className="h-[42px] px-[18px] rounded-full border border-white/[0.18] hover:bg-white/[0.06] font-semibold text-[14px] leading-[18px] text-white transition cursor-pointer"
                >
                  Log in
                </button>
                <button
                  onClick={handleConnectWallet}
                  className="h-[42px] px-[18px] rounded-full bg-[#C6FF3D] hover:brightness-95 font-semibold text-[14px] leading-[18px] text-[#0B1026] transition cursor-pointer flex items-center gap-2"
                >
                  <span>Start for free</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Buttons */}
          <div className="flex lg:hidden items-center gap-2">
            {isAuthenticated ? (
              <WalletProfileDropdown
                theme="dark"
                onNavigateToDashboard={onOpenDashboard}
              />
            ) : (
              <button
                onClick={handleConnectWallet}
                className="h-[40px] px-4 rounded-full bg-[#C6FF3D] font-semibold text-[14px] leading-[18px] text-[#0B1026]"
              >
                Start free
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 rounded-full border border-white/[0.18] flex items-center justify-center text-white"
              aria-label="Open menu"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

        {/* HERO CENTER STACK */}
        <div className="relative z-10 mt-9 lg:mt-[92px] w-full max-w-[653px] flex flex-col items-center">
          {/* Live on Stellar testnet pill */}
          <div className="inline-flex items-center gap-2.5 pl-[9px] pr-[17px] py-[7px] h-[40px] rounded-full bg-white/[0.04] border border-white/[0.16]">
            <span className="w-[26px] h-[26px] rounded-full bg-white flex items-center justify-center">
              <StellarNetworkIcon className="w-3.5 h-3.5" color="#0B1026" />
            </span>
            <span className="text-[13px] leading-[17px] text-white/70">Live on</span>
            <span className="text-[13px] leading-[17px] font-semibold text-white">
              Stellar testnet
            </span>
          </div>

          {/* Display Headline */}
          <h1 className="mt-[22px] text-center font-medium text-[40px] leading-[46px] tracking-[-1.5px] sm:text-[56px] sm:leading-[64px] lg:text-[68px] lg:leading-[76px] lg:tracking-[-2.5px]">
            <span className="text-white block">Turn appreciation into</span>
            <span className="text-[#C6FF3D] block">instant tips.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 lg:mt-[30px] max-w-[319px] sm:max-w-[557px] text-center text-[16px] leading-[25px] lg:text-[18px] lg:leading-[28px] text-white/[0.62]">
            One tip page for your stream, your bio and your site. Fans pay in a tap, and every tip lands straight in your own wallet.
          </p>

          {/* Hero CTA Buttons */}
          <div className="mt-7 lg:mt-[36px] w-full max-w-[350px] sm:max-w-none flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={isAuthenticated ? onOpenDashboard : handleConnectWallet}
              className="w-full sm:w-auto h-[52px] px-[22px] rounded-full bg-[#C6FF3D] hover:brightness-95 font-semibold text-[15px] leading-[19px] text-[#0B1026] flex items-center justify-center gap-2.5 transition cursor-pointer"
            >
              <span>{isAuthenticated ? 'Open your dashboard' : 'Create your tip widget'}</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
            </button>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto h-[52px] px-[22px] rounded-full bg-transparent border border-white/[0.24] sm:bg-white sm:border-white hover:opacity-95 font-semibold text-[15px] leading-[19px] text-white sm:text-[#0B1026] flex items-center justify-center gap-2.5 transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Try demo widget</span>
            </button>
          </div>

          {/* ================================================================ */}
          {/* HERO INTERACTIVE PRODUCT FRAME                                   */}
          {/* Desktop: 600x324 horizontal layout | Mobile: 350x363 vertical    */}
          {/* ================================================================ */}
          <div className="mt-14 lg:mt-[92px] w-full max-w-[350px] sm:max-w-[600px] flex flex-col items-center gap-5">
            <div className="relative w-full p-[13px] sm:p-[15px] bg-white/[0.04] border border-white/[0.12] backdrop-blur-[5px] rounded-[24px] sm:rounded-[28px]">
              <CornerHandles variant="white" size={9} />

              {/* Desktop Floating "Settled pill" */}
              <div
                className={`hidden sm:flex items-center gap-2.5 pl-[9px] pr-[16.5px] py-2 h-[44px] rounded-full bg-[#0D1128]/85 border border-white/[0.14] backdrop-blur-[4px] absolute -top-[23px] right-4 z-30 transition-transform duration-300 ${
                  heroSettledPulse ? 'scale-105 ring-2 ring-[#C6FF3D]' : ''
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-[#C6FF3D] flex items-center justify-center text-[#0B1026]">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span className="font-semibold text-[13px] leading-[17px] text-white whitespace-nowrap">
                  Settled in 4.8s
                </span>
                <span className="font-mono-code text-[13px] leading-[17px] text-white/60 whitespace-nowrap">
                  fee 0.00001 XLM
                </span>
                <span className="font-mono-code text-[13px] leading-[17px] text-white/45 whitespace-nowrap">
                  · tx 9f3c…e27b
                </span>
              </div>

              {/* Inner White Tip Card */}
              <div className="w-full rounded-[16px] sm:rounded-[18px] bg-white p-5 sm:p-6 text-[#0B1026] flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                {/* Creator Left Column */}
                <div className="w-full sm:w-[200px] shrink-0 flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0B1026] flex items-center justify-center shrink-0">
                    <span className="font-extrabold text-[16px] sm:text-[18px] text-[#C6FF3D]">
                      TA
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="font-bold text-[17px] sm:text-[18px] leading-[23px] text-[#0B1026]">
                        Tobi Ade
                      </div>
                      <div className="font-mono-code text-[12px] leading-[16px] text-[#7A809E]">
                        startip.app/tobibuilds
                      </div>
                    </div>
                    <p className="hidden sm:block text-[13px] leading-[19px] text-[#4A5070]">
                      Open-source tutorials on Stellar. Every tip funds another free video.
                    </p>
                  </div>
                </div>

                {/* Amount Picker Right Column */}
                <div className="w-full sm:w-[298px] flex-1 space-y-3.5 sm:space-y-4">
                  <div className="space-y-2">
                    <div className="font-semibold text-[12px] leading-[15px] tracking-[0.5px] text-[#7A809E] uppercase">
                      PICK AN AMOUNT
                    </div>

                    {/* Currency Segmented Toggle */}
                    <div className="p-[3px] h-[40px] sm:h-[40px] rounded-[12px] bg-[#EEF0F7] grid grid-cols-2">
                      <button
                        onClick={() => handleHeroCurrencyChange('USDC')}
                        className={`h-[34px] rounded-[9px] flex items-center justify-center gap-1.5 text-[13px] font-bold transition cursor-pointer ${
                          heroCurrency === 'USDC'
                            ? 'bg-white text-[#0B1026] shadow-[0px_1px_3px_rgba(11,16,38,0.12)]'
                            : 'text-[#4A5070]'
                        }`}
                      >
                        <UsdcBadge size={18} />
                        <span>USDC</span>
                      </button>

                      <button
                        onClick={() => handleHeroCurrencyChange('XLM')}
                        className={`h-[34px] rounded-[9px] flex items-center justify-center gap-1.5 text-[13px] font-bold transition cursor-pointer ${
                          heroCurrency === 'XLM'
                            ? 'bg-white text-[#0B1026] shadow-[0px_1px_3px_rgba(11,16,38,0.12)]'
                            : 'text-[#4A5070]'
                        }`}
                      >
                        <XlmBadge size={18} />
                        <span>XLM</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Preset Amount Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-[6px]">
                    {heroPresets.map((amt) => {
                      const active = heroAmount === amt;
                      return (
                        <button
                          key={amt}
                          onClick={() => setHeroAmount(amt)}
                          className={`h-[44px] rounded-[12px] font-bold text-[15px] leading-[19px] border transition cursor-pointer tabular-nums ${
                            active
                              ? 'bg-[#0B1026] border-[#0B1026] text-white'
                              : 'bg-white border-[#E4E6EF] text-[#0B1026] hover:border-[#0B1026]/40'
                          }`}
                        >
                          {amt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tip CTA Button */}
                  <div className="flex flex-col items-center gap-2.5">
                    <button
                      onClick={handleHeroTipClick}
                      className="w-full h-[50px] sm:h-[50px] rounded-full bg-[#C6FF3D] hover:brightness-95 flex items-center justify-center gap-2 font-extrabold text-[15px] leading-[19px] text-[#0B1026] transition cursor-pointer"
                    >
                      {heroCurrency === 'USDC' ? (
                        <UsdcBadge size={22} />
                      ) : (
                        <XlmBadge size={22} />
                      )}
                      <span>
                        {heroSettledPulse
                          ? `Sent ${heroAmount} ${heroCurrency}!`
                          : `Tip ${heroAmount} ${heroCurrency}`}
                      </span>
                    </button>
                    <span className="text-[11px] sm:text-[11px] leading-[14px] text-[#7A809E]">
                      Arrives in about 5 seconds
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Settled Pill below frame */}
            <div className="flex sm:hidden items-center gap-2.5 pl-[9px] pr-[17px] py-2 h-[44px] rounded-full bg-[#0D1128]/92 border border-white/[0.14] backdrop-blur-[4px]">
              <span className="w-7 h-7 rounded-full bg-[#C6FF3D] flex items-center justify-center text-[#0B1026]">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
              <span className="font-semibold text-[13px] leading-[17px] text-white">
                Settled in 4.8s
              </span>
              <span className="font-mono-code text-[13px] leading-[17px] text-white/60">
                fee 0.00001 XLM
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. WALLET STRIP                                                      */}
      {/* ==================================================================== */}
      <section className="w-full bg-[#070A1A] border-y border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-0 py-9 lg:py-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left text-[13px] leading-[20px] text-white/50 lg:w-[150px] shrink-0">
            Fans tip from any Stellar wallet
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-between gap-6 sm:gap-10 lg:gap-12 flex-1 max-w-[983px]">
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 lg:gap-12">
              {[
                { id: 'freighter' as const, name: 'Freighter' },
                { id: 'lobstr' as const, name: 'LOBSTR' },
                { id: 'xbull' as const, name: 'xBull' },
                { id: 'albedo' as const, name: 'Albedo' },
                { id: 'walletconnect' as const, name: 'WalletConnect' },
              ].map((w) => (
                <div key={w.id} className="flex items-center gap-2 sm:gap-2.5">
                  <WalletLogo name={w.id} size={28} />
                  <span className="font-semibold text-[15px] lg:text-[17px] leading-[22px] text-white/72">
                    {w.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Powered by Stellar pill */}
            <div className="inline-flex items-center gap-2.5 pl-[9px] pr-[17px] py-[7px] h-[40px] rounded-full bg-white/[0.04] border border-white/[0.16]">
              <span className="w-[26px] h-[26px] rounded-full bg-white flex items-center justify-center">
                <StellarNetworkIcon className="w-3.5 h-3.5" color="#0B1026" />
              </span>
              <span className="text-[13px] leading-[17px] text-white/70">Powered by</span>
              <span className="text-[13px] leading-[17px] font-semibold text-white">Stellar</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. THE NEW STANDARD FOR CREATOR TIPS (#F6F7FB Light Section)         */}
      {/* ==================================================================== */}
      <section id="product" className="w-full bg-[#F6F7FB] text-[#0B1026] py-20 lg:py-[125px]">
        <div className="max-w-[1201px] mx-auto px-5 lg:px-0 space-y-10 lg:space-y-16">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <h2 className="font-medium text-[36px] leading-[42px] tracking-[-1px] lg:text-[56px] lg:leading-[62px] lg:tracking-[-2px]">
              <span className="text-[#7A809E]">The new standard </span>
              <span className="text-[#0B1026]">for</span>
              <span className="block text-[#0B1026]">creator tips</span>
            </h2>

            <p className="text-[16px] leading-[25px] text-[#4A5070] max-w-[351px] lg:text-right">
              A tip page, stream alerts and a website widget, all running from one dashboard and paid straight to your wallet.
            </p>
          </div>

          {/* 3 Feature Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Card 1: Alerts on stream (#0B1026) */}
            <div className="min-h-[344px] lg:h-[440px] p-6 lg:p-8 rounded-[24px] lg:rounded-[28px] bg-[#0B1026] text-white flex flex-col justify-between">
              <div className="space-y-2.5 max-w-[272px]">
                <h3 className="font-semibold text-[22px] lg:text-[24px] leading-[31px] tracking-[-0.5px] text-white">
                  Alerts on stream
                </h3>
                <p className="text-[15px] leading-[23px] text-white/[0.62]">
                  Add one link to OBS. Every tip pops up with the fan&apos;s name and message.
                </p>
              </div>

              {/* Stream Alert Graphic Box */}
              <div
                className="w-full h-[184px] lg:h-[210px] p-[17px] lg:p-[19px] rounded-[16px] lg:rounded-[18px] border border-white/[0.08] flex flex-col justify-between"
                style={{
                  background: 'linear-gradient(160deg, #1E2660 10.99%, #070A1A 89.01%)',
                }}
              >
                <div className="flex justify-end">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-[#C6FF3D] flex items-center justify-center">
                    <span className="font-extrabold text-[16px] text-[#0B1026]">TA</span>
                  </div>
                </div>

                {/* Kemi 25 XLM alert popup */}
                <div className="inline-flex items-center gap-3 p-3 rounded-[16px] bg-white text-[#0B1026] w-fit shadow-lg">
                  <div className="w-10 h-10 rounded-[12px] bg-[#0B1026] flex items-center justify-center shrink-0">
                    <StarFourPoint className="w-[18px] h-[18px]" color="#C6FF3D" />
                  </div>
                  <div className="pr-1">
                    <div className="font-bold text-[11px] leading-[14px] text-[#4A5070]">
                      Kemi
                    </div>
                    <div className="font-anton text-[24px] leading-[28px] text-[#0B1026]">
                      25 XLM
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Fans pick, you get paid (#C6FF3D) */}
            <div className="min-h-[330px] lg:h-[440px] p-6 lg:p-8 rounded-[24px] lg:rounded-[28px] bg-[#C6FF3D] text-[#0B1026] flex flex-col justify-between">
              <div className="space-y-2.5 max-w-[279px]">
                <h3 className="font-semibold text-[22px] lg:text-[24px] leading-[31px] tracking-[-0.5px] text-[#0B1026]">
                  Fans pick, you get paid
                </h3>
                <p className="text-[15px] leading-[23px] text-[#2B3410]">
                  Set the amounts. Fans choose USDC or XLM and tip in one tap.
                </p>
              </div>

              {/* 2x2 Preset Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: '1 USDC', num: '1', unit: 'USDC' },
                  { id: '5 USDC', num: '5', unit: 'USDC' },
                  { id: '10 USDC', num: '10', unit: 'USDC' },
                  { id: '25 XLM', num: '25', unit: 'XLM' },
                ].map((tile) => {
                  const isSelected = selectedFeatureTile === tile.id;
                  return (
                    <button
                      key={tile.id}
                      onClick={() => setSelectedFeatureTile(tile.id)}
                      className="relative h-[80px] lg:h-[84px] rounded-[16px] bg-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform hover:scale-[1.02]"
                    >
                      {isSelected && <CornerHandles variant="dark" size={7} />}
                      <span className="font-bold text-[22px] leading-[28px] text-[#0B1026] tabular-nums">
                        {tile.num}
                      </span>
                      <span className="font-semibold text-[12px] leading-[15px] text-[#7A809E]">
                        {tile.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Fees you won't notice (#FFFFFF) */}
            <div
              id="fees"
              className="min-h-[385px] lg:h-[440px] p-6 lg:p-[33px] rounded-[24px] lg:rounded-[28px] bg-white border border-[#E4E6EF] text-[#0B1026] flex flex-col justify-between"
            >
              <div className="space-y-2.5 max-w-[284px]">
                <h3 className="font-semibold text-[22px] lg:text-[24px] leading-[31px] tracking-[-0.5px] text-[#0B1026]">
                  Fees you won&apos;t notice
                </h3>
                <p className="text-[15px] leading-[23px] text-[#4A5070]">
                  The fan covers a network fee under one cent. StarTip takes nothing while we are on testnet.
                </p>
              </div>

              {/* Fee Receipt Box */}
              <div className="w-full p-4 lg:px-[19px] lg:pt-2 lg:pb-5 rounded-[16px] lg:rounded-[18px] bg-[#F6F7FB] border border-[#E4E6EF] space-y-3">
                <div className="divide-y divide-[#E4E6EF]">
                  <div className="py-3 flex items-center justify-between text-[13px] lg:text-[14px]">
                    <span className="text-[#4A5070]">Fan tips</span>
                    <span className="font-mono-code font-semibold text-[#0B1026]">5.00 USDC</span>
                  </div>
                  <div className="py-3 flex items-center justify-between text-[13px] lg:text-[14px]">
                    <span className="text-[#4A5070]">Network fee, paid by the fan</span>
                    <span className="font-mono-code font-semibold text-[#0B1026]">&lt;$0.01</span>
                  </div>
                  <div className="py-3 flex items-center justify-between text-[13px] lg:text-[14px]">
                    <span className="text-[#4A5070]">StarTip fee</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full bg-[#C6FF3D] text-[#0B1026] font-bold text-[11px] leading-[14px]">
                        Free on testnet
                      </span>
                      <span className="font-mono-code font-semibold text-[#0B1026]">0.00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="font-semibold text-[13px] lg:text-[14px] text-[#0B1026]">
                    You receive
                  </span>
                  <span className="font-mono-code font-bold text-[16px] lg:text-[17px] text-[#0B1026]">
                    5.00 USDC
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. LIVE IN THREE STEPS. UNDER FIVE MINUTES. (#070A1A Dark Section)   */}
      {/* ==================================================================== */}
      <section id="how-it-works" className="w-full bg-[#070A1A] text-white py-20 lg:py-[125px]">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-0 space-y-10 lg:space-y-[72px]">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <h2 className="font-medium text-[36px] leading-[42px] tracking-[-1px] lg:text-[56px] lg:leading-[62px] lg:tracking-[-2px]">
              <span className="block text-white">Live in three steps.</span>
              <span className="block text-white/40">Under five minutes.</span>
            </h2>

            <p className="text-[16px] leading-[25px] text-white/60 max-w-[350px]">
              No forms to wait on and no payout account to set up. Your wallet is your login and your bank.
            </p>
          </div>

          {/* 3 Steps Grid */}
          <div className="border-t border-white/[0.08] grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
            {/* Step 01 */}
            <div className="py-9 lg:pt-[43px] lg:pb-0 lg:pr-10 flex flex-col justify-between gap-6 lg:gap-9">
              <div className="space-y-5">
                <div className="font-mono-code text-[13px] leading-[17px] text-[#C6FF3D]">
                  [ 01 ]
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-[22px] lg:text-[26px] leading-[33px] tracking-[-0.5px] text-white">
                    Connect your wallet
                  </h3>
                  <p className="text-[15px] lg:text-[16px] leading-[25px] text-white/60 max-w-[321px]">
                    Pick the Stellar wallet your tips land in. It is also how you sign in.
                  </p>
                </div>
              </div>

              <div
                onClick={onOpenWalletModal}
                className="h-[96px] lg:h-[120px] rounded-[18px] lg:rounded-[20px] bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <WalletLogo name="freighter" size={44} />
                <WalletLogo name="lobstr" size={44} />
                <WalletLogo name="xbull" size={44} />
              </div>
            </div>

            {/* Step 02 */}
            <div className="py-9 lg:pt-[43px] lg:pb-0 lg:px-10 flex flex-col justify-between gap-6 lg:gap-9">
              <div className="space-y-5">
                <div className="font-mono-code text-[13px] leading-[17px] text-[#C6FF3D]">
                  [ 02 ]
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-[22px] lg:text-[26px] leading-[33px] tracking-[-0.5px] text-white">
                    Make your page
                  </h3>
                  <p className="text-[15px] lg:text-[16px] leading-[25px] text-white/60 max-w-[312px]">
                    Add a photo, a short bio and the amounts fans can pick.
                  </p>
                </div>
              </div>

              <div className="h-[96px] lg:h-[120px] rounded-[18px] lg:rounded-[20px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono-code text-[15px]">
                <span className="text-white/80">startip.app/</span>
                <span className="text-[#C6FF3D]">{creator?.username || 'yourname'}</span>
              </div>
            </div>

            {/* Step 03 */}
            <div className="py-9 lg:pt-[43px] lg:pb-0 lg:pl-10 flex flex-col justify-between gap-6 lg:gap-9">
              <div className="space-y-5">
                <div className="font-mono-code text-[13px] leading-[17px] text-[#C6FF3D]">
                  [ 03 ]
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-[22px] lg:text-[26px] leading-[33px] tracking-[-0.5px] text-white">
                    Share and get tipped
                  </h3>
                  <p className="text-[15px] lg:text-[16px] leading-[25px] text-white/60 max-w-[280px]">
                    Drop your link anywhere and add the overlay to your stream.
                  </p>
                </div>
              </div>

              <div className="h-[96px] lg:h-[120px] rounded-[18px] lg:rounded-[20px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center gap-2.5">
                <button
                  onClick={() => {
                    const handle = creator?.username || 'alex_dev';
                    navigator.clipboard?.writeText(`${window.location.origin}/?creator=${handle}`);
                    setCopiedStepLink(true);
                    setTimeout(() => setCopiedStepLink(false), 2000);
                  }}
                  className="h-[40px] lg:h-[42px] px-[18px] rounded-full bg-[#C6FF3D] hover:brightness-95 font-semibold text-[14px] text-[#0B1026] transition cursor-pointer"
                >
                  {copiedStepLink ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={() => {
                    const token = creator?.widget_config?.overlay_token || creator?.widgets?.[0]?.overlay_token || 'alex_dev_overlay_token';
                    navigator.clipboard?.writeText(`${window.location.origin}/overlay/${token}/`);
                    setAddedToObs(true);
                    setTimeout(() => setAddedToObs(false), 2000);
                  }}
                  className="h-[40px] lg:h-[42px] px-[19px] rounded-full border border-white/[0.18] hover:bg-white/[0.06] font-semibold text-[14px] text-white transition cursor-pointer"
                >
                  {addedToObs ? 'URL Copied!' : 'Add to OBS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. CREATOR DASHBOARD SECTION (#0B0F24 with purple glow)              */}
      {/* ==================================================================== */}
      <section className="relative w-full bg-[#0B0F24] border-t border-white/[0.08] py-20 lg:py-[130px] overflow-hidden">
        {/* Dashboard Purple Glow */}
        <div
          className="pointer-events-none absolute w-[760px] h-[760px] lg:w-[1400px] lg:h-[900px] top-[360px] lg:top-[560px] left-1/2 -translate-x-1/2"
          style={{
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(140, 115, 255, 0.6) 0%, rgba(74, 47, 194, 0.3) 30%, rgba(11, 15, 36, 0) 62%)',
          }}
        />

        <div className="relative z-10 max-w-[1201px] mx-auto px-5 lg:px-0 space-y-12 lg:space-y-16">
          {/* Header */}
          <div className="space-y-4">
            <div className="font-mono-code text-[13px] leading-[17px] text-[#C6FF3D]">
              [ Creator dashboard ]
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
              <h2 className="font-medium text-[36px] leading-[42px] tracking-[-1px] lg:text-[56px] lg:leading-[62px] lg:tracking-[-2px]">
                <span className="block text-white">Every tip, one dashboard.</span>
                <span className="block text-white/40">Nothing to reconcile.</span>
              </h2>

              <p className="text-[16px] leading-[25px] text-white/60 max-w-[358px] lg:text-right">
                See who tipped, what it is worth and when it settled. Your widget, stream alerts and wallet sit in the same place.
              </p>
            </div>
          </div>

          {/* Embedded Live Dashboard Frame: Desktop Window on lg+, Mobile Phone Frame on <lg */}
          <div>
            <div className="hidden lg:block">
              <CreatorDashboard mode="desktop-preview" onOpenDemo={onOpenDemo} />
            </div>
            <div className="lg:hidden">
              <CreatorDashboard mode="mobile-preview" onOpenDemo={onOpenDemo} />
            </div>
          </div>

          {/* 4 Feature Callouts Below Dashboard */}
          <div className="border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
            {[
              {
                icon: TrendingUp,
                title: 'Earnings in dollars',
                desc: "XLM and USDC totals, each shown at today's dollar value.",
              },
              {
                icon: FileCheck2,
                title: 'Every tip on record',
                desc: 'Each tip links to its Stellar transaction, so nothing goes missing.',
              },
              {
                icon: Bell,
                title: 'Alerts and widget',
                desc: 'Set up your stream overlay and site widget from the sidebar.',
              },
              {
                icon: Wallet,
                title: 'Your wallet, your call',
                desc: 'Switch the wallet tips land in whenever you like.',
              },
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={`py-6 lg:pt-8 lg:pb-0 ${
                    idx === 0 ? 'lg:pr-7' : 'lg:px-7'
                  } flex flex-row lg:flex-col items-start gap-4`}
                >
                  <div className="w-10 h-10 lg:w-9 lg:h-9 rounded-[10px] bg-[#C6FF3D]/12 border border-[#C6FF3D]/28 flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px] text-[#C6FF3D]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-[17px] lg:text-[18px] leading-[23px] tracking-[-0.5px] text-white">
                      {feat.title}
                    </h3>
                    <p className="text-[14px] leading-[22px] text-white/60 max-w-[247px]">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. BUILT ON STELLAR & FAQ SECTION (#F6F7FB Light Section)            */}
      {/* ==================================================================== */}
      <section className="w-full bg-[#F6F7FB] text-[#0B1026] py-20 lg:py-[140px]">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-0 space-y-20 lg:space-y-[123px]">
          {/* Built on Stellar Top Block */}
          <div className="space-y-12 lg:space-y-[88px]">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
              <div className="space-y-5 max-w-[421px]">
                <h2 className="font-medium text-[36px] leading-[42px] tracking-[-1px] lg:text-[56px] lg:leading-[62px] lg:tracking-[-2px]">
                  <span className="block text-[#0B1026]">Built on Stellar.</span>
                  <span className="block text-[#7A809E]">Fast by default.</span>
                </h2>
                <p className="text-[16px] leading-[25px] text-[#4A5070]">
                  Stellar is a public payments network built for small, everyday payments. Tips arrive as USDC, a digital dollar, or XLM, Stellar&apos;s own currency.
                </p>
              </div>

              {/* 3D Coins Graphic */}
              <div className="hidden lg:block">
                <StellarCoinsGraphic compact={false} />
              </div>
              <div className="lg:hidden w-full">
                <StellarCoinsGraphic compact={true} />
              </div>
            </div>

            {/* 3 Bordered Boxes with Corner Handles */}
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {[
                {
                  icon: Globe,
                  title: 'Open network',
                  desc: 'Anyone with a Stellar wallet can send you a tip from anywhere in the world.',
                },
                {
                  icon: ArrowRight,
                  title: 'Straight to your wallet',
                  desc: 'Tips go directly from the fan’s wallet to yours. No balance to withdraw.',
                },
                {
                  icon: Coins,
                  title: 'Small tips make sense',
                  desc: 'Network fees are a fraction of a cent, so even a $1 tip is worth sending.',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="relative p-6 lg:p-7 border border-[#C9CEE2] -mt-px lg:mt-0 lg:-ml-px first:mt-0 first:ml-0 flex flex-row lg:flex-col items-start gap-4 lg:gap-5"
                  >
                    <CornerHandles variant="bordered" size={9} />
                    <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-[12px] bg-[#0B1026] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#C6FF3D]" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-[17px] lg:text-[22px] leading-[28px] tracking-[-0.5px] text-[#0B1026]">
                        {card.title}
                      </h3>
                      <p className="text-[14px] lg:text-[16px] leading-[22px] lg:leading-[25px] text-[#4A5070]">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQ Section ("Questions, answered.") */}
          <div id="faq" className="flex flex-col lg:flex-row items-start justify-between gap-9 lg:gap-16">
            <h2 className="font-medium text-[36px] leading-[42px] tracking-[-1px] lg:text-[56px] lg:leading-[62px] lg:tracking-[-2px] shrink-0">
              <span className="block text-[#0B1026]">Questions,</span>
              <span className="block text-[#7A809E]">answered.</span>
            </h2>

            <div className="w-full max-w-[700px] border-b border-[#E4E6EF]">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndices.includes(idx);
                return (
                  <div key={item.q} className="border-t border-[#E4E6EF] py-5 lg:py-[26px]">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-start justify-between gap-6 text-left cursor-pointer"
                    >
                      <span className="font-semibold text-[16px] lg:text-[19px] leading-[22px] lg:leading-[24px] text-[#0B1026]">
                        {item.q}
                      </span>
                      <span className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[#0B1026] text-[#C6FF3D] flex items-center justify-center text-[16px] shrink-0">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isOpen && (
                      <p className="mt-2.5 text-[14px] lg:text-[16px] leading-[22px] lg:leading-[25px] text-[#4A5070] max-w-[560px]">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. BOTTOM CTA & FOOTER (#070A1A Dark Section)                        */}
      {/* ==================================================================== */}
      <footer className="w-full bg-[#070A1A] text-white pt-16 lg:pt-[120px] pb-10 lg:pb-12">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-0 space-y-12 lg:space-y-20">
          {/* CTA Banner Card */}
          <div className="relative w-full h-[347px] lg:h-[440px] rounded-[28px] lg:rounded-[36px] bg-[#0E1333] border border-white/10 overflow-hidden flex flex-col items-center justify-center px-6 text-center">
            {/* Vertical grid lines inside CTA */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-6 lg:grid-cols-12">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`border-r border-white/[0.03] h-full ${
                    i >= 6 ? 'hidden lg:block' : ''
                  }`}
                />
              ))}
            </div>

            {/* Radial CTA Glow */}
            <div
              className="pointer-events-none absolute w-[620px] h-[520px] lg:w-[1200px] lg:h-[1000px] top-[180px] lg:top-[30px] left-1/2 -translate-x-1/2"
              style={{
                background:
                  'radial-gradient(50% 50% at 50% 50%, rgba(198, 255, 61, 0.5) 0%, rgba(140, 115, 255, 0.42) 20%, rgba(14, 19, 51, 0) 62%)',
              }}
            />

            <div className="relative z-10 flex flex-col items-center">
              <h2 className="font-medium text-[32px] leading-[38px] tracking-[-1px] lg:text-[60px] lg:leading-[66px] lg:tracking-[-2px]">
                <span className="block text-white">Your next tip is</span>
                <span className="block text-white/[0.42]">five seconds away.</span>
              </h2>

              <p className="mt-4 lg:mt-6 text-[15px] lg:text-[17px] leading-[23px] text-white/[0.62] max-w-[281px] sm:max-w-[700px]">
                Claim your username while StarTip is on testnet. It takes two minutes and costs nothing.
              </p>

              <button
                onClick={onOpenWalletModal}
                className="mt-7 lg:mt-8 w-full sm:w-auto h-[52px] px-6 rounded-full bg-[#C6FF3D] hover:brightness-95 font-semibold text-[15px] text-[#0B1026] flex items-center justify-center gap-2.5 transition cursor-pointer"
              >
                <span>Claim your page</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <a href="#hero" className="flex items-center gap-2.5">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#C6FF3D] flex items-center justify-center">
                <StarFourPoint className="w-4 h-4 lg:w-[18px] lg:h-[18px]" color="#0B1026" />
              </div>
              <span className="font-bold text-[19px] lg:text-[21px] leading-[27px] tracking-[-0.5px] text-white">
                StarTip
              </span>
            </a>

            <div className="flex flex-wrap items-center gap-5 lg:gap-[27px] font-mono-code text-[13px] lg:text-[14px] text-white/60">
              <button
                onClick={() => scrollToSection('product')}
                className="hover:text-white transition cursor-pointer"
              >
                [ Product ]
              </button>
              <button
                onClick={() => scrollToSection('fees')}
                className="hover:text-white transition cursor-pointer"
              >
                [ Fees ]
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="hover:text-white transition cursor-pointer"
              >
                [ FAQ ]
              </button>
              <button
                onClick={onOpenDemo}
                className="hover:text-white transition cursor-pointer"
              >
                [ Contact ]
              </button>
            </div>

            <div className="w-full lg:w-auto pt-5 lg:pt-0 border-t lg:border-t-0 border-white/[0.08] text-[13px] lg:text-[14px] text-white/60">
              © 2026 StarTip · Privacy · Terms
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
