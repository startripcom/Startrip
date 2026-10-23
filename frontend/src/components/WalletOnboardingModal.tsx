import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Shield,
  Clock,
  Lock,
  Copy,
  ChevronRight,
  Upload,
  Trash2,
  Sparkles,
  User,
  Coins,
  Wallet,
  Play,
  HelpCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { StarFourPoint, WalletLogo } from './Icons';
import { useWallet } from '../context/WalletContext';
import { api } from '../services/api';

interface WalletOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialStep?: 1 | 2 | 3 | 4;
  isStandalonePage?: boolean;
}

export function WalletOnboardingModal({
  isOpen,
  onClose,
  onSuccess,
  initialStep,
  isStandalonePage = false,
}: WalletOnboardingModalProps) {
  const navigate = useNavigate();
  const {
    connectWallet,
    completeRegistration,
    walletAddress,
    needsRegistration,
    isAuthenticated,
    isConnecting,
    creator,
  } = useWallet();

  // Active step in the onboarding flow (1: Connect wallet, 2: Public profile, 3: Getting paid, 4: Go live)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    if (initialStep) return initialStep;
    if (isAuthenticated && creator && !needsRegistration) return 4;
    if (isAuthenticated && walletAddress && needsRegistration) return 2;
    return 1;
  });

  // Profile Form States
  const [displayName, setDisplayName] = useState(creator?.display_name || '');
  const [username, setUsername] = useState(creator?.username || '');
  const [bio, setBio] = useState(creator?.bio || '');
  const [websiteUrl, setWebsiteUrl] = useState(creator?.website_url || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(creator?.avatar_url || null);
  const [supportedAssets, setSupportedAssets] = useState<string[]>(['USDC', 'XLM']);

  // Verification & Feedback States
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync step ONLY if user is genuinely authenticated
  useEffect(() => {
    if (isAuthenticated && walletAddress && step === 1) {
      if (needsRegistration) {
        setStep(2);
      } else if (creator) {
        setStep(4);
      }
    }
  }, [isAuthenticated, walletAddress, needsRegistration, creator, step]);

  // Live Username availability verification (debounced)
  useEffect(() => {
    if (!username.trim() || username.length < 3) {
      setIsUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        await api.getPublicCreator(username.trim().toLowerCase());
        // If it succeeds and matches current user, available; otherwise taken
        if (creator && creator.username === username.trim().toLowerCase()) {
          setIsUsernameAvailable(true);
        } else {
          setIsUsernameAvailable(false);
        }
      } catch {
        // 404 or not found means username is free!
        setIsUsernameAvailable(true);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, creator]);

  // Handle Avatar image upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper for initials
  const getInitials = (name: string) => {
    if (!name.trim()) return 'AR';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Automated tipping preview animation state in sidebar
  // Sequence: Idle -> Picked (taps 5 USDC) -> Sending (button loading) -> Sent (+5 USDC toast) -> Idle
  const [previewState, setPreviewState] = useState<'idle' | 'picked' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    let active = true;
    const runCycle = async () => {
      while (active) {
        setPreviewState('idle');
        await new Promise((r) => setTimeout(r, 2600));
        if (!active) break;
        setPreviewState('picked');
        await new Promise((r) => setTimeout(r, 1400));
        if (!active) break;
        setPreviewState('sending');
        await new Promise((r) => setTimeout(r, 1500));
        if (!active) break;
        setPreviewState('sent');
        await new Promise((r) => setTimeout(r, 2800));
      }
    };
    runCycle();
    return () => {
      active = false;
    };
  }, []);

  if (!isOpen) return null;

  // Wallet Connection Trigger with Cancellation Protection
  const handleConnect = async (walletId?: string) => {
    setFormError(null);
    try {
      const res = await connectWallet(walletId);
      if (!res || !res.address) {
        // User cancelled connection modal or signature request! Do not proceed!
        return;
      }
      if (res.is_registered) {
        setStep(4);
      } else {
        setStep(2);
      }
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (
        msg.includes('cancel') ||
        msg.includes('decline') ||
        msg.includes('reject') ||
        msg.includes('closed') ||
        e?.code === -1
      ) {
        // User cancelled, cleanly remain on step 1
        return;
      }
      setFormError(e?.message || 'Failed to connect wallet.');
    }
  };

  // Profile Validation for Step 2 -> Step 3
  const handleStep2Continue = () => {
    setFormError(null);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanDisplayName = displayName.trim();

    if (!cleanDisplayName) {
      setFormError('Please enter a display name.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setFormError('Username handle must be at least 3 characters.');
      return;
    }
    if (isUsernameAvailable === false) {
      setFormError(`startip.app/${cleanUsername} is already taken. Please choose another handle.`);
      return;
    }

    setStep(3);
  };

  // Asset toggle for Step 3
  const toggleAsset = (asset: string) => {
    if (supportedAssets.includes(asset)) {
      if (supportedAssets.length === 1) {
        setFormError('You must support at least one asset to accept tips.');
        return;
      }
      setSupportedAssets(supportedAssets.filter((a) => a !== asset));
    } else {
      setSupportedAssets([...supportedAssets, asset]);
    }
  };

  // Step 3 Completion: Register Creator Profile with API
  const handleCompleteSetup = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      let cleanWebsite = websiteUrl.trim();
      if (cleanWebsite && !cleanWebsite.startsWith('http://') && !cleanWebsite.startsWith('https://')) {
        cleanWebsite = `https://${cleanWebsite}`;
      }

      await completeRegistration({
        username: cleanUsername,
        display_name: displayName.trim(),
        bio: bio.trim(),
        website_url: cleanWebsite || undefined,
        avatar_url: avatarUrl || undefined,
        supported_assets: supportedAssets,
      });
      setStep(4);
    } catch (err: any) {
      const msg =
        typeof err?.message === 'string' && err.message !== '[object Object]'
          ? err.message
          : 'Registration failed. Please review your username and details.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Copy Tip Link Helper
  const tipUrl = `startip.app/${username || creator?.username || 'tobibuilds'}`;
  const fullTipUrl = `${window.location.origin}/${username || creator?.username || 'tobibuilds'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullTipUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className={
        isStandalonePage
          ? 'min-h-screen bg-[#F6F7FB] overflow-y-auto py-4 sm:py-8 px-3 sm:px-6 flex justify-center items-start text-[#0B1026]'
          : 'fixed inset-0 z-50 bg-black/75 backdrop-blur-md overflow-y-auto py-4 sm:py-8 px-3 sm:px-6 flex justify-center items-start text-[#0B1026]'
      }
    >
      {/* 1440x1024 Master Frame from Figma Schema (with my-auto to never chop top on small viewports) */}
      <div className="relative w-full max-w-[1440px] my-auto bg-[#FFFFFF] border border-[#C9CEE2] rounded-[24px] shadow-2xl flex flex-col lg:flex-row overflow-hidden font-sans lg:max-h-[94vh]">
        
        {/* ========================================================
            LEFT SIDEBAR (Figma: width: 520px; background: #F6F7FB)
           ======================================================== */}
        <aside className="w-full lg:w-[480px] xl:w-[520px] lg:min-w-[480px] bg-[#F6F7FB] border-b lg:border-b-0 lg:border-r border-[#C9CEE2] p-6 lg:p-[32px_40px_32px] flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-[#C6FF3D] flex items-center justify-center shadow-sm">
                <StarFourPoint className="w-4 h-4" color="#0B1026" />
              </div>
              <span className="font-sans font-extrabold text-[20px] leading-[28px] tracking-[-0.3px] text-[#0B1026]">
                StarTip
              </span>
            </div>

            {/* Intro */}
            <div className="pt-6 sm:pt-8 lg:pt-[44px] space-y-2.5">
              <h1 className="font-sans font-extrabold text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.2] lg:leading-[44px] tracking-[-1px] text-[#0B1026]">
                Create your creator tip page
              </h1>
              <p className="font-sans font-normal text-[15px] sm:text-[16px] leading-[24px] text-[#4A5070]">
                Accept instant tips in USDC and XLM directly to your Stellar wallet.
              </p>
            </div>

            {/* Steps (Vertical Stepper) */}
            <div className="pt-6 lg:pt-[32px] space-y-0 w-full max-w-[320px]">
              {/* Step 1 Item */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 transition-all ${
                    step === 1
                      ? 'bg-[#C6FF3D] shadow-[0px_0px_0px_4px_rgba(198,255,61,0.35)]'
                      : step > 1
                      ? 'bg-[#0B1026]'
                      : 'bg-[#FFFFFF] border border-[#E4E7F2]'
                  }`}
                >
                  {step > 1 ? (
                    <Check className="w-4 h-4 text-[#C6FF3D] stroke-[2.5]" />
                  ) : (
                    <Wallet
                      className={`w-5 h-5 ${
                        step === 1 ? 'text-[#0B1026]' : 'text-[#8A91B4]'
                      }`}
                    />
                  )}
                </div>
                <div>
                  <h4
                    className={`font-sans font-bold text-[16px] leading-[24px] ${
                      step >= 1 ? 'text-[#0B1026]' : 'text-[#646A8A]'
                    }`}
                  >
                    Connect wallet
                  </h4>
                  <p
                    className={`font-sans font-medium text-[14px] leading-[20px] ${
                      step === 1
                        ? 'text-[#4A5070]'
                        : step > 1
                        ? 'text-[#646A8A]'
                        : 'text-[#8A91B4]'
                    }`}
                  >
                    Freighter, Lobstr, xBull
                  </p>
                </div>
              </div>

              {/* Connector 1 */}
              <div className="py-1 pl-[19px]">
                <div
                  className={`w-[2px] h-5 rounded-full transition-colors ${
                    step > 1 ? 'bg-[#0B1026]' : 'bg-[#E4E7F2]'
                  }`}
                />
              </div>

              {/* Step 2 Item */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 transition-all ${
                    step === 2
                      ? 'bg-[#C6FF3D] shadow-[0px_0px_0px_4px_rgba(198,255,61,0.35)]'
                      : step > 2
                      ? 'bg-[#0B1026]'
                      : 'bg-[#FFFFFF] border border-[#E4E7F2]'
                  }`}
                >
                  {step > 2 ? (
                    <Check className="w-4 h-4 text-[#C6FF3D] stroke-[2.5]" />
                  ) : (
                    <User
                      className={`w-5 h-5 ${
                        step === 2 ? 'text-[#0B1026]' : 'text-[#8A91B4]'
                      }`}
                    />
                  )}
                </div>
                <div>
                  <h4
                    className={`font-sans font-bold text-[16px] leading-[24px] ${
                      step >= 2 ? 'text-[#0B1026]' : 'text-[#646A8A]'
                    }`}
                  >
                    Public profile
                  </h4>
                  <p
                    className={`font-sans font-medium text-[14px] leading-[20px] ${
                      step === 2
                        ? 'text-[#4A5070]'
                        : step > 2
                        ? 'text-[#646A8A]'
                        : 'text-[#8A91B4]'
                    }`}
                  >
                    Name, handle, photo
                  </p>
                </div>
              </div>

              {/* Connector 2 */}
              <div className="py-1 pl-[19px]">
                <div
                  className={`w-[2px] h-5 rounded-full transition-colors ${
                    step > 2 ? 'bg-[#0B1026]' : 'bg-[#E4E7F2]'
                  }`}
                />
              </div>

              {/* Step 3 Item */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 transition-all ${
                    step === 3
                      ? 'bg-[#C6FF3D] shadow-[0px_0px_0px_4px_rgba(198,255,61,0.35)]'
                      : step > 3
                      ? 'bg-[#0B1026]'
                      : 'bg-[#FFFFFF] border border-[#E4E7F2]'
                  }`}
                >
                  {step > 3 ? (
                    <Check className="w-4 h-4 text-[#C6FF3D] stroke-[2.5]" />
                  ) : (
                    <Coins
                      className={`w-5 h-5 ${
                        step === 3 ? 'text-[#0B1026]' : 'text-[#8A91B4]'
                      }`}
                    />
                  )}
                </div>
                <div>
                  <h4
                    className={`font-sans font-bold text-[16px] leading-[24px] ${
                      step >= 3 ? 'text-[#0B1026]' : 'text-[#646A8A]'
                    }`}
                  >
                    Getting paid
                  </h4>
                  <p
                    className={`font-sans font-medium text-[14px] leading-[20px] ${
                      step === 3
                        ? 'text-[#4A5070]'
                        : step > 3
                        ? 'text-[#646A8A]'
                        : 'text-[#8A91B4]'
                    }`}
                  >
                    USDC & XLM direct
                  </p>
                </div>
              </div>

              {/* Connector 3 */}
              <div className="py-1 pl-[19px]">
                <div
                  className={`w-[2px] h-5 rounded-full transition-colors ${
                    step > 3 ? 'bg-[#0B1026]' : 'bg-[#E4E7F2]'
                  }`}
                />
              </div>

              {/* Step 4 Item */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 transition-all ${
                    step === 4
                      ? 'bg-[#0B1026] shadow-[0px_0px_0px_4px_rgba(198,255,61,0.35)]'
                      : 'bg-[#FFFFFF] border border-[#E4E7F2]'
                  }`}
                >
                  {step === 4 ? (
                    <Check className="w-4 h-4 text-[#C6FF3D] stroke-[2.5]" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-[#8A91B4]" />
                  )}
                </div>
                <div>
                  <h4
                    className={`font-sans font-bold text-[16px] leading-[24px] ${
                      step === 4 ? 'text-[#0B1026]' : 'text-[#646A8A]'
                    }`}
                  >
                    Go live
                  </h4>
                  <p
                    className={`font-sans font-medium text-[14px] leading-[20px] ${
                      step === 4 ? 'text-[#0B1026]' : 'text-[#8A91B4]'
                    }`}
                  >
                    Tip link & embed widget
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview (Loops in prototype mode: Idle → Picked → Sending → Sent → Idle) */}
          <div className="mt-6 w-full max-w-[440px] h-[310px] bg-[#0B1026] rounded-[20px] p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between shrink-0 shadow-xl select-none">
            {/* Background geometric arcs */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <svg className="w-full h-full" viewBox="0 0 440 324" fill="none">
                <circle cx="340" cy="-20" r="140" stroke="rgba(168, 148, 255, 0.24)" strokeWidth="1.5" />
                <circle cx="360" cy="0" r="100" stroke="rgba(168, 148, 255, 0.24)" strokeWidth="1.5" />
                <circle cx="-40" cy="240" r="160" stroke="rgba(168, 148, 255, 0.16)" strokeWidth="1.5" />
                <circle cx="40" cy="300" r="110" stroke="rgba(168, 148, 255, 0.16)" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Header of Preview */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#C6FF3D] flex items-center justify-center">
                  <Play className="w-2.5 h-2.5 fill-[#0B1026] text-[#0B1026] translate-x-[0.5px]" />
                </div>
                <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[0.6px] uppercase text-[#C6FF3D]">
                  Live Preview
                </span>
              </div>
              <span className="font-mono-code text-[12px] text-[#B3B8D4]">
                startip.app/{username || creator?.username || 'tobibuilds'}
              </span>
            </div>

            {/* Mini widget card */}
            <div className="relative z-10 mx-auto w-[280px] h-[230px] bg-[#FFFFFF] rounded-[20px] p-3.5 shadow-[0px_16px_40px_rgba(0,0,0,0.4)] flex flex-col justify-between">
              {/* Creator row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-black/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#0B1026] flex items-center justify-center shrink-0">
                      <span className="font-sans font-bold text-[13px] text-[#C6FF3D]">
                        {getInitials(displayName || creator?.display_name || 'Alex River')}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h5 className="font-sans font-bold text-[13px] leading-[18px] text-[#0B1026] truncate">
                      {displayName || creator?.display_name || 'Alex River'}
                    </h5>
                    <p className="font-sans font-medium text-[11px] leading-[14px] text-[#646A8A] truncate">
                      @{username || creator?.username || 'alexriver'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="h-6 px-2 rounded-full bg-[#0B1026] border border-[#0B1026] flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF3D] animate-pulse" />
                  <span className="font-sans font-semibold text-[10px] text-[#C6FF3D]">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Bio */}
              <p className="font-sans font-medium text-[11px] leading-[15px] text-[#4A5070] line-clamp-2">
                {bio || creator?.bio || 'Building open Web3 apps on Stellar. Tips fuel the next stream!'}
              </p>

              {/* Amounts chips */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-9 rounded-[10px] border border-[#E4E7F2] bg-[#FFFFFF] flex items-center justify-center font-sans font-bold text-[13px] text-[#0B1026]">
                  2 USDC
                </div>
                <div
                  className={`h-9 rounded-[10px] border flex items-center justify-center font-sans font-bold text-[13px] transition-all relative ${
                    previewState === 'picked' || previewState === 'sending' || previewState === 'sent'
                      ? 'bg-[#0B1026] border-[#0B1026] text-[#C6FF3D] shadow-sm'
                      : 'bg-[#FFFFFF] border-[#E4E7F2] text-[#0B1026]'
                  }`}
                >
                  5 USDC
                  {/* Animated simulated cursor */}
                  {previewState === 'picked' && (
                    <div className="absolute -bottom-2 -right-1 pointer-events-none animate-bounce z-20">
                      <svg width="18" height="20" viewBox="0 0 15 19" fill="none">
                        <path
                          d="M1 1L6 17L9 11L14 8L1 1Z"
                          fill="#FFFFFF"
                          stroke="#0B1026"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="h-9 rounded-[10px] border border-[#E4E7F2] bg-[#FFFFFF] flex items-center justify-center font-sans font-bold text-[13px] text-[#0B1026]">
                  10 USDC
                </div>
              </div>

              {/* Action Button */}
              <div className="relative">
                {previewState === 'sent' ? (
                  <div className="w-full h-10 rounded-full bg-[#15803D] text-white font-sans font-bold text-[12px] flex items-center justify-center gap-1.5 transition-all">
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Tip Sent!</span>
                  </div>
                ) : (
                  <div className="w-full h-10 rounded-full bg-[#C6FF3D] text-[#0B1026] font-sans font-bold text-[12px] pl-3.5 pr-1.5 flex items-center justify-between transition-all">
                    <span>
                      {previewState === 'sending'
                        ? 'Sending 5 USDC...'
                        : previewState === 'picked'
                        ? 'Send 5 USDC'
                        : 'Send tip'}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[#0B1026] flex items-center justify-center text-[#C6FF3D]">
                      {previewState === 'sending' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Confirmed Toast in preview */}
                {previewState === 'sent' && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#161C3D] border border-[#C6FF3D]/40 text-white font-sans font-bold text-[10px] shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#C6FF3D] text-[#0B1026] flex items-center justify-center">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                    <span>+5 USDC received!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================
            RIGHT CONTENT FLOW (Figma: width: 918px; padding: 32px 40px)
           ======================================================== */}
        <main className="flex-1 p-6 lg:p-[32px_40px_32px] flex flex-col justify-between overflow-y-auto custom-scrollbar">
          {/* Top Bar (Anchored at the very top, never chopped) */}
          <div className="w-full flex items-center justify-between pb-4 shrink-0">
            <div className="text-xs text-[#646A8A]">
              Step <span className="font-bold text-[#0B1026]">{step}</span> of 4
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Testnet Badge */}
              <div className="h-7 px-3 rounded-full bg-[#0B1026] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C6FF3D]" />
                <span className="font-sans font-semibold text-[12px] text-[#C6FF3D]">
                  TESTNET
                </span>
              </div>

              {/* Help */}
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="font-sans font-semibold text-[14px] text-[#4A5070] hover:text-[#0B1026] transition cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Help</span>
              </button>

              {/* Close X (when in modal mode) */}
              {!isStandalonePage && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full border border-[#C9CEE2] hover:bg-[#F6F7FB] flex items-center justify-center text-[#4A5070] hover:text-[#0B1026] transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Centered Step Form Container (Figma: width: 600px) */}
          <div className="w-full max-w-[600px] mx-auto py-2 flex-1 flex flex-col justify-center">
            {formError && (
              <div className="p-3.5 mb-5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* ========================================================
                STEP 1: CONNECT WALLET
               ======================================================== */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Heading */}
                <div className="space-y-2">
                  <span className="font-sans font-semibold text-[12px] tracking-[0.6px] uppercase text-[#6A4CF5]">
                    Step 1 of 4
                  </span>
                  <h2 className="font-sans font-extrabold text-[28px] leading-[36px] tracking-[-0.5px] text-[#0B1026]">
                    Connect your Stellar wallet
                  </h2>
                  <p className="font-sans font-normal text-[16px] leading-[24px] text-[#4A5070]">
                    Choose how you’d like to connect. Your keys never leave your device.
                  </p>
                </div>

                {/* Wallets Grid (2 columns x 3 rows) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Freighter (Recommended) */}
                  <button
                    type="button"
                    onClick={() => handleConnect('freighter')}
                    disabled={isConnecting}
                    className="h-16 p-3 rounded-[14px] border-[1.5px] border-[#E4E7F2] hover:border-[#6A4CF5] bg-[#FFFFFF] flex items-center justify-between transition cursor-pointer text-left group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <WalletLogo name="freighter" size={40} />
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026] group-hover:text-[#6A4CF5] transition-colors">
                          Freighter
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          Browser extension
                        </div>
                      </div>
                    </div>
                    <div className="h-7 px-3 rounded-full bg-[#F3F0FF] border border-[#C7BAFF] flex items-center text-[#4A2FC2] font-sans font-semibold text-[12px]">
                      Recommended
                    </div>
                  </button>

                  {/* LOBSTR */}
                  <button
                    type="button"
                    onClick={() => handleConnect('lobstr')}
                    disabled={isConnecting}
                    className="h-16 p-3 rounded-[14px] border-[1.5px] border-[#E4E7F2] hover:border-[#0B1026] bg-[#FFFFFF] flex items-center justify-between transition cursor-pointer text-left group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <WalletLogo name="lobstr" size={40} />
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026]">
                          LOBSTR
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          Mobile & browser
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#646A8A] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* xBull */}
                  <button
                    type="button"
                    onClick={() => handleConnect('xbull')}
                    disabled={isConnecting}
                    className="h-16 p-3 rounded-[14px] border-[1.5px] border-[#E4E7F2] hover:border-[#0B1026] bg-[#FFFFFF] flex items-center justify-between transition cursor-pointer text-left group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <WalletLogo name="xbull" size={40} />
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026]">
                          xBull
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          Desktop & mobile
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#646A8A] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Albedo */}
                  <button
                    type="button"
                    onClick={() => handleConnect('albedo')}
                    disabled={isConnecting}
                    className="h-16 p-3 rounded-[14px] border-[1.5px] border-[#E4E7F2] hover:border-[#0B1026] bg-[#FFFFFF] flex items-center justify-between transition cursor-pointer text-left group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <WalletLogo name="albedo" size={40} />
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026]">
                          Albedo
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          Web signer
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#646A8A] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Hana */}
                  <button
                    type="button"
                    onClick={() => handleConnect('hana')}
                    disabled={isConnecting}
                    className="h-16 p-3 rounded-[14px] border-[1.5px] border-[#E4E7F2] hover:border-[#0B1026] bg-[#FFFFFF] flex items-center justify-between transition cursor-pointer text-left group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <WalletLogo name="hana" size={40} />
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026]">
                          Hana
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          Browser & mobile
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#646A8A] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* WalletConnect */}
                  <button
                    type="button"
                    onClick={() => handleConnect('wallet-connect')}
                    disabled={isConnecting}
                    className="h-16 p-3 rounded-[14px] border-[1.5px] border-[#E4E7F2] hover:border-[#0B1026] bg-[#FFFFFF] flex items-center justify-between transition cursor-pointer text-left group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <WalletLogo name="walletconnect" size={40} />
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026]">
                          WalletConnect
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          Universal mobile
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#646A8A] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Non-custodial Security Note */}
                <div className="p-4 rounded-[14px] bg-[#F3F0FF] border border-[#E6E0FF] flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#4A2FC2] shrink-0 mt-0.5" />
                  <p className="font-sans font-medium text-[14px] leading-[20px] text-[#2E2370]">
                    StarTip is non-custodial. Tips go from supporters straight to your wallet. We never see your keys.
                  </p>
                </div>

                {/* Footnote / Login link */}
                <div className="flex items-center gap-1.5 text-[12px] font-sans">
                  <span className="text-[#646A8A] font-medium">Already have a StarTip page?</span>
                  <button
                    type="button"
                    onClick={() => handleConnect()}
                    className="text-[#6A4CF5] font-bold hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 2: PUBLIC PROFILE
               ======================================================== */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Heading */}
                <div className="space-y-2">
                  <span className="font-sans font-semibold text-[12px] tracking-[0.6px] uppercase text-[#6A4CF5]">
                    Step 2 of 4
                  </span>
                  <h2 className="font-sans font-extrabold text-[28px] leading-[36px] tracking-[-0.5px] text-[#0B1026]">
                    Build your public profile
                  </h2>
                  <p className="font-sans font-normal text-[16px] leading-[24px] text-[#4A5070]">
                    This is what supporters see when they visit your page. You can change everything later.
                  </p>
                </div>

                {/* Photo Upload Section */}
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border border-[#0B1026]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#0B1026] flex items-center justify-center shrink-0">
                      <span className="font-sans font-extrabold text-[20px] leading-[28px] tracking-[-0.3px] text-[#C6FF3D]">
                        {getInitials(displayName || 'AR')}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/png, image/jpeg, image/gif"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-12 px-5 rounded-[14px] bg-[#FFFFFF] border-[1.5px] border-[#C9CEE2] hover:border-[#0B1026] text-[#0B1026] font-sans font-bold text-[16px] transition cursor-pointer"
                      >
                        Upload photo
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl(null)}
                          className="h-10 px-3 text-[#4A5070] hover:text-red-600 font-sans font-semibold text-[14px] transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                      JPG, PNG or GIF. Max 5MB.
                    </div>
                  </div>
                </div>

                {/* Name & Username Row (2 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <label className="block font-sans font-semibold text-[14px] text-[#0B1026]">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex River"
                      className="w-full h-12 px-4 rounded-[14px] bg-[#FFFFFF] border-[1.5px] border-[#E4E7F2] focus:border-[#6A4CF5] focus:ring-4 focus:ring-[#6A4CF5]/10 text-[#0B1026] font-sans text-[16px] outline-none transition"
                    />
                  </div>

                  {/* Username Handle */}
                  <div className="space-y-2">
                    <label className="block font-sans font-semibold text-[14px] text-[#0B1026]">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                        }
                        placeholder="yourhandle"
                        className="w-full h-12 px-4 rounded-[14px] bg-[#FFFFFF] border-[1.5px] border-[#E4E7F2] focus:border-[#6A4CF5] focus:ring-4 focus:ring-[#6A4CF5]/10 text-[#0B1026] font-sans text-[16px] outline-none transition"
                      />
                    </div>
                    {/* Live availability indicator */}
                    <div className="flex items-center gap-1.5 h-4">
                      {isCheckingUsername ? (
                        <span className="text-[12px] text-[#646A8A] flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
                        </span>
                      ) : username.trim().length >= 3 ? (
                        isUsernameAvailable ? (
                          <span className="text-[12px] font-sans font-semibold text-[#15803D] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-[#15803D] stroke-[2.5]" />
                            startip.app/{username.trim().toLowerCase()} is available
                          </span>
                        ) : (
                          <span className="text-[12px] font-sans font-semibold text-red-500 flex items-center gap-1">
                            <X className="w-3.5 h-3.5 text-red-500 stroke-[2.5]" />
                            startip.app/{username.trim().toLowerCase()} is taken
                          </span>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Short Bio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-sans font-semibold text-[14px] text-[#0B1026]">
                      Short bio
                    </label>
                    <span className="font-sans font-medium text-[12px] text-[#646A8A]">
                      {bio.length}/160
                    </span>
                  </div>
                  <textarea
                    value={bio}
                    maxLength={160}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="What do you build, stream, or create?"
                    className="w-full p-[12px_16px] rounded-[14px] bg-[#FFFFFF] border-[1.5px] border-[#E4E7F2] focus:border-[#6A4CF5] focus:ring-4 focus:ring-[#6A4CF5]/10 text-[#0B1026] font-sans text-[16px] leading-[24px] outline-none transition resize-none"
                  />
                </div>

                {/* Website or Social Link */}
                <div className="space-y-2">
                  <label className="block font-sans font-semibold text-[14px] text-[#0B1026]">
                    Website or social link
                  </label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://x.com/yourhandle or yoursite.com"
                    className="w-full h-12 px-4 rounded-[14px] bg-[#FFFFFF] border-[1.5px] border-[#E4E7F2] focus:border-[#6A4CF5] focus:ring-4 focus:ring-[#6A4CF5]/10 text-[#0B1026] font-sans text-[16px] outline-none transition"
                  />
                </div>

                {/* Actions: Back & Continue */}
                <div className="pt-6 border-t border-[#E4E7F2] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-14 px-5 rounded-full flex items-center gap-2 text-[#4A5070] hover:text-[#0B1026] font-sans font-bold text-[16px] transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStep2Continue}
                    className="w-[240px] h-14 pl-6 pr-2 rounded-full bg-[#C6FF3D] hover:brightness-95 text-[#0B1026] font-sans font-bold text-[16px] flex items-center justify-between shadow-md transition cursor-pointer"
                  >
                    <span>Continue</span>
                    <div className="w-10 h-10 rounded-full bg-[#0B1026] flex items-center justify-center text-[#C6FF3D]">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 3: GETTING PAID
               ======================================================== */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Heading */}
                <div className="space-y-2">
                  <span className="font-sans font-semibold text-[12px] tracking-[0.6px] uppercase text-[#6A4CF5]">
                    Step 3 of 4
                  </span>
                  <h2 className="font-sans font-extrabold text-[28px] leading-[36px] tracking-[-0.5px] text-[#0B1026]">
                    Where should tips go?
                  </h2>
                  <p className="font-sans font-normal text-[16px] leading-[24px] text-[#4A5070]">
                    Tips settle in seconds on Stellar. No holding period, no StarTip escrow.
                  </p>
                </div>

                {/* Receiving Wallet Address */}
                <div className="space-y-2">
                  <label className="block font-sans font-semibold text-[14px] text-[#0B1026]">
                    Receiving wallet address
                  </label>
                  <div className="h-12 px-4 rounded-[14px] bg-[#EEF0F7] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Lock className="w-4 h-4 text-[#646A8A] shrink-0" />
                      <span className="font-mono-code text-[14px] text-[#0B1026] truncate">
                        {walletAddress || 'G...'}
                      </span>
                    </div>
                    <div className="h-7 px-3 rounded-full bg-[#E7F6EC] border border-[#A7E3BE] flex items-center gap-1.5 shrink-0">
                      <Check className="w-3.5 h-3.5 text-[#15803D] stroke-[2.5]" />
                      <span className="font-sans font-semibold text-[12px] text-[#15803D]">
                        Verified
                      </span>
                    </div>
                  </div>
                  <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                    This matches your connected Stellar wallet. Tips land directly here.
                  </div>
                </div>

                {/* Supported tip assets */}
                <div className="space-y-3">
                  <label className="block font-sans font-semibold text-[14px] text-[#0B1026]">
                    Supported tip assets
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* USDC Asset Card */}
                    <div
                      onClick={() => toggleAsset('USDC')}
                      className={`p-4 rounded-[14px] border-[1.5px] bg-[#FFFFFF] flex items-start gap-3 cursor-pointer transition select-none ${
                        supportedAssets.includes('USDC')
                          ? 'border-[#0B1026] shadow-sm'
                          : 'border-[#E4E7F2] opacity-70'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5 transition ${
                          supportedAssets.includes('USDC') ? 'bg-[#0B1026]' : 'border border-[#C9CEE2]'
                        }`}
                      >
                        {supportedAssets.includes('USDC') && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#2E7BF0] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            $
                          </span>
                          <span className="font-sans font-bold text-[16px] text-[#0B1026]">
                            USDC
                          </span>
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          USD Coin · Stellar native
                        </div>
                        <div className="font-sans font-semibold text-[12px] text-[#15803D]">
                          Fastest · Low fee
                        </div>
                      </div>
                    </div>

                    {/* XLM Asset Card */}
                    <div
                      onClick={() => toggleAsset('XLM')}
                      className={`p-4 rounded-[14px] border-[1.5px] bg-[#FFFFFF] flex items-start gap-3 cursor-pointer transition select-none ${
                        supportedAssets.includes('XLM')
                          ? 'border-[#0B1026] shadow-sm'
                          : 'border-[#E4E7F2] opacity-70'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5 transition ${
                          supportedAssets.includes('XLM') ? 'bg-[#0B1026]' : 'border border-[#C9CEE2]'
                        }`}
                      >
                        {supportedAssets.includes('XLM') && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#0B1026] text-[#C6FF3D] flex items-center justify-center text-xs font-bold shrink-0">
                            <StarFourPoint className="w-3 h-3" color="#C6FF3D" />
                          </span>
                          <span className="font-sans font-bold text-[16px] text-[#0B1026]">
                            XLM
                          </span>
                        </div>
                        <div className="font-sans font-medium text-[12px] text-[#646A8A]">
                          Stellar Lumens
                        </div>
                        <div className="font-sans font-semibold text-[12px] text-[#646A8A]">
                          ~$0.00001 per tip
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stellar Settlement Notice */}
                <div className="p-4 rounded-[14px] bg-[#F3F0FF] border border-[#E6E0FF] flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#4A2FC2] shrink-0 mt-0.5" />
                  <p className="font-sans font-medium text-[14px] leading-[20px] text-[#2E2370]">
                    Stellar confirms a tip in about 5 seconds. You see it in your wallet and on your dashboard at the same time.
                  </p>
                </div>

                {/* Actions: Back & Complete setup */}
                <div className="pt-6 border-t border-[#E4E7F2] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    className="h-14 px-5 rounded-full flex items-center gap-2 text-[#4A5070] hover:text-[#0B1026] font-sans font-bold text-[16px] transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteSetup}
                    disabled={submitting}
                    className="w-[240px] h-14 pl-6 pr-2 rounded-full bg-[#C6FF3D] hover:brightness-95 text-[#0B1026] font-sans font-bold text-[16px] flex items-center justify-between shadow-md transition cursor-pointer disabled:opacity-60"
                  >
                    <span>{submitting ? 'Creating page...' : 'Complete setup'}</span>
                    <div className="w-10 h-10 rounded-full bg-[#0B1026] flex items-center justify-center text-[#C6FF3D]">
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 4: GO LIVE
               ======================================================== */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Done Disc (Figma: width: 72px; height: 72px; bg: #C6FF3D; box-shadow: 0 0 0 8px #EEFFC2) */}
                <div className="w-[72px] h-[72px] rounded-full bg-[#C6FF3D] shadow-[0px_0px_0px_8px_#EEFFC2] flex items-center justify-center">
                  <Check className="w-8 h-8 text-[#0B1026] stroke-[3.5]" />
                </div>

                {/* Heading */}
                <div className="space-y-2">
                  <span className="font-sans font-semibold text-[12px] tracking-[0.6px] uppercase text-[#6A4CF5]">
                    Page is live
                  </span>
                  <h2 className="font-anton text-[42px] sm:text-[56px] leading-[1] tracking-[0.3px] uppercase text-[#0B1026]">
                    Your tip link is ready
                  </h2>
                  <p className="font-sans font-normal text-[16px] leading-[24px] text-[#4A5070]">
                    Share it on X, Twitch, YouTube, or embed it right on your website to start receiving Stellar tips.
                  </p>
                </div>

                {/* Tip Link Box */}
                <div className="h-[59px] pl-4 pr-2 rounded-[14px] bg-[#FFFFFF] border-[1.5px] border-[#E4E7F2] flex items-center justify-between gap-3 shadow-sm">
                  <span className="font-mono-code text-[14px] text-[#0B1026] truncate">
                    {tipUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-10 h-10 rounded-full hover:bg-[#F6F7FB] flex items-center justify-center text-[#0B1026] transition cursor-pointer relative"
                    title="Copy tip link"
                  >
                    {copiedLink ? (
                      <Check className="w-5 h-5 text-[#15803D]" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                    {copiedLink && (
                      <span className="absolute -top-8 px-2 py-0.5 rounded bg-[#0B1026] text-white text-[11px] font-sans font-bold whitespace-nowrap animate-in fade-in">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>

                {/* Next Steps Cards */}
                <div className="space-y-2.5">
                  {/* Next Step 01 */}
                  <div
                    onClick={() => {
                      onSuccess();
                      navigate('/dashboard?tab=widget');
                    }}
                    className="h-20 p-4 rounded-[14px] bg-[#FFFFFF] border border-[#E4E7F2] hover:border-[#6A4CF5] flex items-center justify-between gap-4 transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[10px] bg-[#F3F0FF] flex items-center justify-center font-sans font-bold text-[14px] text-[#6A4CF5] shrink-0">
                        01
                      </div>
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026] group-hover:text-[#6A4CF5] transition-colors">
                          Customize your widget
                        </div>
                        <div className="font-sans font-medium text-[14px] text-[#4A5070]">
                          Pick custom colors, themes, preset amounts
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#8A91B4] group-hover:text-[#0B1026] group-hover:translate-x-0.5 transition" />
                  </div>

                  {/* Next Step 02 */}
                  <div
                    onClick={() => {
                      onSuccess();
                      navigate('/dashboard?tab=embed');
                    }}
                    className="h-20 p-4 rounded-[14px] bg-[#FFFFFF] border border-[#E4E7F2] hover:border-[#6A4CF5] flex items-center justify-between gap-4 transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[10px] bg-[#F3F0FF] flex items-center justify-center font-sans font-bold text-[14px] text-[#6A4CF5] shrink-0">
                        02
                      </div>
                      <div>
                        <div className="font-sans font-bold text-[16px] text-[#0B1026] group-hover:text-[#6A4CF5] transition-colors">
                          Get your embed code
                        </div>
                        <div className="font-sans font-medium text-[14px] text-[#4A5070]">
                          Add a tipping button or popup to your site
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#8A91B4] group-hover:text-[#0B1026] group-hover:translate-x-0.5 transition" />
                  </div>
                </div>

                {/* Actions: Go to Dashboard */}
                <div className="pt-6 border-t border-[#E4E7F2]">
                  <button
                    type="button"
                    onClick={() => {
                      onSuccess();
                      navigate('/dashboard');
                    }}
                    className="w-[240px] h-14 pl-6 pr-2 rounded-full bg-[#C6FF3D] hover:brightness-95 text-[#0B1026] font-sans font-bold text-[16px] flex items-center justify-between shadow-md transition cursor-pointer"
                  >
                    <span>Go to dashboard</span>
                    <div className="w-10 h-10 rounded-full bg-[#0B1026] flex items-center justify-center text-[#C6FF3D]">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Progress Bars Indicator (4 bars: 56px x 4px) */}
          <div className="w-full flex justify-center pt-4 shrink-0">
            <div className="flex items-center gap-2 w-[248px]">
              <div
                className={`w-14 h-1 rounded-full transition-colors ${
                  step >= 1 ? 'bg-[#0B1026]' : 'bg-[#E4E7F2]'
                }`}
              />
              <div
                className={`w-14 h-1 rounded-full transition-colors ${
                  step >= 2 ? 'bg-[#0B1026]' : 'bg-[#E4E7F2]'
                }`}
              />
              <div
                className={`w-14 h-1 rounded-full transition-colors ${
                  step >= 3 ? 'bg-[#0B1026]' : 'bg-[#E4E7F2]'
                }`}
              />
              <div
                className={`w-14 h-1 rounded-full transition-colors ${
                  step >= 4 ? 'bg-[#0B1026]' : 'bg-[#E4E7F2]'
                }`}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-[440px] w-full rounded-[24px] bg-[#FFFFFF] p-6 shadow-2xl border border-[#C9CEE2] space-y-4 text-[#0B1026] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-bold text-[18px]">StarTip Onboarding Help</h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F6F7FB] flex items-center justify-center text-[#646A8A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-sm text-[#4A5070] leading-relaxed">
              <p>
                <strong>What wallet can I use?</strong>
                <br />
                You can connect any Stellar wallet including Freighter, LOBSTR, xBull, Albedo, Hana, and WalletConnect.
              </p>
              <p>
                <strong>Are there any custody risks?</strong>
                <br />
                StarTip is completely non-custodial. Every tip sent by supporters goes directly from their wallet into yours.
              </p>
              <p>
                <strong>Can I change my handle or details later?</strong>
                <br />
                Yes! You can update your display name, bio, website link, and avatar any time from your Creator Dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full h-11 rounded-full bg-[#0B1026] text-white font-sans font-bold text-sm hover:brightness-110 transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
