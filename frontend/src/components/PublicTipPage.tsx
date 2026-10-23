import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Info,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Bell,
  Share2
} from 'lucide-react';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { api, CreatorProfile, WidgetConfig } from '../services/api';
import { notificationService } from '../services/notificationService';
import { formatAssetAmount } from '../utils/formatters';

export function PublicTipPage() {
  const navigate = useNavigate();
  const { creatorUsername } = useParams<{ creatorUsername: string }>();
  const [searchParams] = useSearchParams();
  const widgetSlug = searchParams.get('widget') || undefined;

  // Creator & Widget Data
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [activeWidget, setActiveWidget] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Flow Screens: 'form' (Screen 5) | 'awaiting' (Screen 6) | 'receipt' (Screen 7)
  const [screen, setScreen] = useState<'form' | 'awaiting' | 'receipt'>('form');

  // Form State
  const [asset, setAsset] = useState<'XLM' | 'USDC'>('XLM');
  const [amount, setAmount] = useState<number>(10);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [supporterName, setSupporterName] = useState<string>('');
  const [supporterMessage, setSupporterMessage] = useState<string>('');
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null);

  // Awaiting & Step State
  const [awaitingStep, setAwaitingStep] = useState<1 | 2 | 3>(1);
  const [awaitingHeading, setAwaitingHeading] = useState<string>('Sign in your wallet');
  const [awaitingSubtext, setAwaitingSubtext] = useState<string>('Approve the transaction in your Stellar wallet extension.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Receipt State
  const [receiptData, setReceiptData] = useState<{
    amount: number;
    asset: string;
    txHash: string;
    explorerUrl: string;
    recipientName: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch Public Creator Profile & Specific Widget Config
  useEffect(() => {
    if (!creatorUsername) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    api.getPublicCreator(creatorUsername, widgetSlug)
      .then((profile) => {
        setCreator(profile);
        const wConfig = profile.widget_config || null;
        setActiveWidget(wConfig);

        // Preload default amounts
        const defaultXlm = wConfig?.preset_amounts_xlm?.[0] || 10;
        setAmount(defaultXlm);

        // Update document title and Open Graph metadata
        const title = `⚡ Tip ${profile.display_name} (@${profile.username}) — StarTip`;
        document.title = title;

        const updateMeta = (prop: string, val: string) => {
          let el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
          if (el) {
            el.setAttribute('content', val);
          } else {
            const meta = document.createElement('meta');
            if (prop.startsWith('og:')) {
              meta.setAttribute('property', prop);
            } else {
              meta.setAttribute('name', prop);
            }
            meta.setAttribute('content', val);
            document.head.appendChild(meta);
          }
        };

        const bio = profile.bio || wConfig?.welcome_message || 'Send instant non-custodial tips in XLM or USDC directly to my Stellar wallet.';
        const ogImage = `https://startip.app/api/og/${profile.username}.png`;
        updateMeta('og:title', title);
        updateMeta('twitter:title', title);
        updateMeta('og:description', bio);
        updateMeta('twitter:description', bio);
        updateMeta('og:image', ogImage);
        updateMeta('twitter:image', ogImage);
        updateMeta('og:url', window.location.href);
      })
      .catch((err) => {
        console.error('Failed to load creator profile:', err);
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      document.title = 'StarTip — Instant Creator Tips on Stellar';
    };
  }, [creatorUsername, widgetSlug]);

  // Dynamic Presets
  const xlmPresets = activeWidget?.preset_amounts_xlm || [10, 25, 50, 100];
  const usdcPresets = activeWidget?.preset_amounts_usdc || [1, 2, 5, 10];
  const currentPresets = asset === 'XLM' ? xlmPresets : usdcPresets;

  const handleAssetChange = (newAsset: 'XLM' | 'USDC') => {
    setAsset(newAsset);
    setIsCustom(false);
    setCustomAmountInput('');
    const newAmt = newAsset === 'XLM' ? xlmPresets[0] : usdcPresets[0];
    setAmount(newAmt);
  };

  const handlePresetClick = (presetVal: number) => {
    setAmount(presetVal);
    setIsCustom(false);
    setCustomAmountInput(String(presetVal));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomAmountInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
      setIsCustom(true);
    }
  };

  const handleCopyHash = () => {
    if (!receiptData?.txHash) return;
    navigator.clipboard.writeText(receiptData.txHash).then(() => {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    });
  };

  // Main Tip Initiation via Official Stellar Wallets Kit
  const handleInitiateTip = async () => {
    setStatusMessage(null);

    if (!creator) return;
    if (!amount || amount <= 0) {
      setStatusMessage({ text: 'Please enter a valid tip amount.', type: 'error' });
      return;
    }

    // Remark Filtering Check
    if (activeWidget?.filter_remarks && supporterMessage.trim()) {
      const banned = activeWidget.banned_words && activeWidget.banned_words.length > 0
        ? activeWidget.banned_words
        : ['spam', 'scam', 'hate', 'abuse', 'phishing', 'ponzi'];
      const msgLower = supporterMessage.toLowerCase();
      const hasBad = banned.some(w => msgLower.includes(w.toLowerCase().trim()));
      if (hasBad) {
        setStatusMessage({ text: 'Your message contains filtered words. Please keep messages respectful.', type: 'error' });
        return;
      }
    }

    // Request desktop notification permission during user click gesture
    if (notificationService.isSupported() && notificationService.getPermission() === 'default') {
      try {
        notificationService.requestPermission();
      } catch (e) {
        // non-blocking
      }
    }

    setIsSubmitting(true);
    setAwaitingStep(1);
    setAwaitingHeading('Sign in your wallet');
    setAwaitingSubtext('Connecting your wallet via the official Stellar Wallets Kit...');
    setScreen('awaiting');

    try {
      // 1. Open official Stellar Wallets Kit Modal on window.top
      const authResult = await StellarWalletsKit.authModal();
      if (!authResult || !authResult.address) {
        throw new Error('No wallet was connected.');
      }

      const supporterWallet = authResult.address;
      const selectedMod = (StellarWalletsKit as any).selectedModule;
      const providerName = selectedMod ? (selectedMod.productName || selectedMod.id) : 'Stellar Wallet';

      setAwaitingHeading(`Approve in ${providerName}`);
      setAwaitingSubtext(`Connected: ${supporterWallet.slice(0, 4)}...${supporterWallet.slice(-4)}. Generating payment request...`);

      // 2. Create Payment Request on Backend
      const reqPayload = {
        creator_username: creator.username,
        asset_code: asset,
        amount: amount,
        supporter_name: supporterName.trim() || 'Anonymous',
        message: supporterMessage.trim(),
        supporter_wallet: supporterWallet,
        widget_slug: widgetSlug,
      };

      const paymentReq = await api.createPaymentRequest(reqPayload);

      // 3. Build Transaction XDR
      setAwaitingSubtext('Building unsigned transaction XDR on Stellar Testnet...');
      const xdrData = await api.buildTransactionXDR({
        reference_id: paymentReq.reference_id,
        supporter_wallet: supporterWallet,
      });

      // 4. Sign Transaction with Supporter's Wallet
      setAwaitingSubtext(`Please approve the ${amount} ${asset} tip in ${providerName}...`);
      const signResult = await StellarWalletsKit.signTransaction(xdrData.unsigned_xdr, {
        networkPassphrase: Networks.TESTNET,
        address: supporterWallet,
      });

      const signedXdr = typeof signResult === 'string'
        ? signResult
        : (signResult.signedTxXdr || (signResult as any).xdr);

      if (!signedXdr) {
        throw new Error('Transaction signing was cancelled by the wallet.');
      }

      // 5. Broadcast Transaction to Stellar Horizon Testnet
      setAwaitingStep(2);
      setAwaitingHeading('Broadcasting to Stellar');
      setAwaitingSubtext('Submitting signed transaction to Stellar Testnet Horizon...');

      const formBody = new URLSearchParams();
      formBody.append('tx', signedXdr);
      const horizonResp = await fetch('https://horizon-testnet.stellar.org/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      });
      const horizonData = await horizonResp.json();

      if (!horizonResp.ok || !horizonData.successful) {
        const errCodes = horizonData.extras?.result_codes?.transaction || horizonData.detail || 'Horizon rejected transaction';
        throw new Error(`Stellar broadcast rejected: ${errCodes}`);
      }

      const txHash = horizonData.hash;

      // 6. Verify and Finalize on Backend
      setAwaitingStep(3);
      setAwaitingHeading('Confirming on Ledger');
      setAwaitingSubtext(`Transaction ${txHash.slice(0, 8)}... confirmed on Stellar! Finalizing receipt...`);

      const verifyData = await api.verifyPayment({
        reference_id: paymentReq.reference_id,
        stellar_tx_hash: txHash,
      });

      // 7. Transition to Screen 7 (Payment Confirmed Receipt)
      setReceiptData({
        amount: amount,
        asset: asset,
        txHash: txHash,
        explorerUrl: verifyData.stellar_explorer_url || `https://stellar.expert/explorer/testnet/tx/${txHash}`,
        recipientName: activeWidget?.widget_title || creator.display_name || creator.username,
      });
      setScreen('receipt');

      // ⚡ Sound chime & Chrome notification
      notificationService.playTipChime();
      notificationService.showTipNotification({
        id: txHash,
        referenceId: paymentReq.reference_id,
        supporterName: 'You',
        amount: amount,
        assetCode: asset,
        message: `Tip to @${creator.username} confirmed on Stellar!`,
        isTest: false,
        stellarTxHash: txHash,
      });

    } catch (err: any) {
      console.warn('Tip initiation error:', err);
      setScreen('form');
      if (err?.code === -1 || (err?.message && err.message.includes('closed'))) {
        setStatusMessage({ text: 'Wallet selection was closed.', type: 'info' });
      } else {
        setStatusMessage({ text: err?.message || 'Transaction failed. Please try again.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A1A] flex flex-col items-center justify-center p-6 text-white">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-[#6A4CF5]/20 border-t-[#C6FF3D] animate-spin" />
          <span className="text-[#C6FF3D] font-bold text-lg">✦</span>
        </div>
        <p className="mt-4 text-sm font-medium text-white/60 font-['Onest']">Loading Creator Tip Page...</p>
      </div>
    );
  }

  // Creator Not Found State
  if (notFound || !creator) {
    return (
      <div className="min-h-screen bg-[#070A1A] flex flex-col items-center justify-center p-6 text-white font-['Onest']">
        <div className="w-full max-w-md p-8 rounded-[28px] bg-[#0B1026] border border-white/10 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Creator Not Found</h2>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            The tip link for <strong className="text-white">@{creatorUsername}</strong> does not exist or has been disabled.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full h-12 rounded-full bg-[#C6FF3D] text-[#0B1026] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-95 transition cursor-pointer shadow-[0_0_20px_rgba(198,255,61,0.35)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to StarTip Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A1A] text-white flex flex-col items-center justify-between p-4 sm:p-8 relative selection:bg-[#C6FF3D] selection:text-[#0B1026] font-['Onest']">
      
      {/* Ambient background glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#6A4CF5]/20 via-[#C6FF3D]/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2 sm:py-4 z-10">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0B1026] border border-white/15 flex items-center justify-center shadow-md group-hover:border-[#C6FF3D] transition">
            <div className="w-4 h-4 rounded-sm bg-[#C6FF3D]" />
          </div>
          <span className="font-['Anton'] tracking-wider text-xl uppercase text-white group-hover:text-[#C6FF3D] transition">
            STAR·TIP
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const shareUrl = window.location.href;
              const title = `⚡ Tip ${creator?.display_name || creator?.username} on StarTip`;
              const text = creator?.bio || `Send instant non-custodial tips in XLM or USDC to ${creator?.display_name || creator?.username} on Stellar!`;
              if (navigator.share) {
                navigator.share({ title, text, url: shareUrl }).catch(() => {});
              } else {
                navigator.clipboard.writeText(shareUrl).then(() => {
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0B1026] hover:bg-[#141A3A] border border-white/15 text-xs text-white/90 hover:text-white transition cursor-pointer font-medium"
            title="Share this tip link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#C6FF3D]" />
                <span className="text-[#C6FF3D]">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#C6FF3D]" />
                <span>Share</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B1026] border border-white/10 text-xs text-[#C6FF3D] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#C6FF3D] animate-pulse" />
            <span>Stellar Testnet</span>
          </div>
        </div>
      </header>

      {/* Center Stage: The Figma Tipping Widget (Screen 5 · 6 · 7) */}
      <main className="my-auto py-6 w-full flex justify-center z-10">
        <div className="w-full max-w-[358px] bg-white rounded-[28px] border border-[#E4E7F2] text-[#0B1026] shadow-[0px_24px_56px_rgba(11,16,38,0.25),0px_2px_4px_rgba(11,16,38,0.06)] overflow-hidden transition-all duration-300">
          
          {/* ======================================================== */}
          {/* SCREEN 5: Public Tip Card (Main Form State)              */}
          {/* ======================================================== */}
          {screen === 'form' && (
            <div className="w-full flex flex-col">
              
              {/* Cover (80px tall) */}
              <div className="relative h-[80px] w-full bg-[#E6E0FF] px-4 py-3 flex justify-end items-start overflow-hidden">
                {/* Figma Geometric Pattern */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 358 80" fill="none" preserveAspectRatio="none">
                  <line x1="-20" y1="-10" x2="160" y2="120" stroke="#C7BAFF" strokeWidth="1.5" />
                  <circle cx="280" cy="15" r="45" stroke="#C7BAFF" strokeWidth="1.5" fill="none" />
                  <circle cx="35" cy="65" r="16" fill="#C7BAFF" opacity="0.6" />
                  <rect x="110" y="-15" width="55" height="55" rx="12" stroke="#C7BAFF" strokeWidth="1.5" transform="rotate(22 135 15)" />
                </svg>

                {activeWidget?.banner_url && (
                  <img
                    src={activeWidget.banner_url}
                    alt="Cover"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
                  />
                )}

                {/* TESTNET Status Badge */}
                <div className="relative z-10 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0B1026] text-[#C6FF3D] text-[12px] font-semibold">
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#C6FF3D]" />
                  </div>
                  <span>TESTNET</span>
                </div>
              </div>

              {/* Avatar (64x64) overlapping cover */}
              <div className="relative px-5 pt-0">
                <div className="absolute -top-[32px] left-5 w-16 h-16 rounded-full bg-[#0B1026] border-4 border-white flex items-center justify-center overflow-hidden shadow-md z-20">
                  {activeWidget?.avatar_url || creator.avatar_url ? (
                    <img
                      src={activeWidget?.avatar_url || creator.avatar_url}
                      alt={creator.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-extrabold text-xl text-[#C6FF3D]">
                      {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Profile Header */}
              <div className="pt-10 px-5 pb-3 flex flex-col gap-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-extrabold text-xl tracking-[-0.3px] text-[#0B1026]">
                    {activeWidget?.widget_title || creator.display_name || creator.username}
                  </span>
                  <span className="font-normal text-sm text-[#646A8A]">
                    @{creator.username}
                  </span>
                  {activeWidget?.name && activeWidget.name !== 'Main Tip Link' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#ECE8FF] text-[#4A2FC2] text-xs font-bold">
                      {activeWidget.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#4A5070] leading-relaxed mt-0.5">
                  {activeWidget?.welcome_message || creator.bio || 'Support my creative work directly on Stellar.'}
                </p>
                <div className="w-full h-[1px] bg-[#E4E7F2] mt-3" />
              </div>

              {/* Body Fields */}
              <div className="px-5 pb-6 flex flex-col gap-4">
                
                {/* Asset Switcher (USDC / XLM) */}
                <div className="h-[52px] bg-[#EEF0F7] rounded-[16px] p-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAssetChange('XLM')}
                    className={`flex-1 h-full rounded-[12px] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                      asset === 'XLM'
                        ? 'bg-white text-[#0B1026] shadow-[0px_2px_8px_rgba(11,16,38,0.06),0px_1px_2px_rgba(11,16,38,0.08)]'
                        : 'text-[#4A5070] hover:text-[#0B1026]'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#0B1026] text-white flex items-center justify-center text-[10px] font-extrabold">
                      ✦
                    </div>
                    <span>XLM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAssetChange('USDC')}
                    className={`flex-1 h-full rounded-[12px] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                      asset === 'USDC'
                        ? 'bg-white text-[#0B1026] shadow-[0px_2px_8px_rgba(11,16,38,0.06),0px_1px_2px_rgba(11,16,38,0.08)]'
                        : 'text-[#4A5070] hover:text-[#0B1026]'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#2E7BF0] text-white flex items-center justify-center text-[11px] font-extrabold">
                      $
                    </div>
                    <span>USDC</span>
                  </button>
                </div>

                {/* Big Amount Readout */}
                <div className="flex items-baseline justify-center gap-2 py-1">
                  <span className="font-extrabold text-5xl tracking-[-1.5px] text-[#0B1026] leading-none">
                    {formatAssetAmount(amount)}
                  </span>
                  <span className="font-bold text-base text-[#646A8A]">
                    {asset}
                  </span>
                </div>

                {/* 4-Column Preset Amount Chips */}
                <div className="grid grid-cols-4 gap-2 h-12">
                  {currentPresets.map((presetVal) => {
                    const isSelected = !isCustom && amount === presetVal;
                    return (
                      <button
                        key={presetVal}
                        type="button"
                        onClick={() => handlePresetClick(presetVal)}
                        className={`h-12 rounded-[14px] font-bold text-base flex items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#0B1026] text-[#C6FF3D] border-[1.5px] border-[#0B1026] shadow-[0_4px_16px_rgba(11,16,38,0.25),0_0_16px_rgba(198,255,61,0.45)]'
                            : 'bg-white text-[#0B1026] border-[1.5px] border-[#E4E7F2] hover:border-[#0B1026] hover:-translate-y-0.5'
                        }`}
                      >
                        {presetVal}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Field */}
                {activeWidget?.allow_custom_amount !== false && (
                  <div className="h-12 rounded-[14px] bg-white border-[1.5px] border-[#E4E7F2] px-4 flex items-center gap-2 focus-within:border-[#6A4CF5] focus-within:shadow-[0_0_0_4px_rgba(106,76,245,0.15)] transition">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={customAmountInput}
                      onChange={handleCustomAmountChange}
                      placeholder="Custom amount"
                      className="w-full bg-transparent border-none outline-none font-medium text-base text-[#0B1026] placeholder-[#646A8A]"
                    />
                    <span className="font-bold text-sm text-[#646A8A] flex-shrink-0">
                      {asset}
                    </span>
                  </div>
                )}

                {/* Collapsible Supporter Message Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setIsMessageOpen(!isMessageOpen)}
                    className="flex items-center gap-2 h-9 text-sm font-bold text-[#6A4CF5] cursor-pointer select-none"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 border-[#6A4CF5] flex items-center justify-center text-xs font-black transition-transform ${isMessageOpen ? 'rotate-45' : ''}`}>
                      +
                    </div>
                    <span>Add your name and a message</span>
                  </button>

                  {isMessageOpen && (
                    <div className="mt-2.5 flex flex-col gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-[#0B1026]">Your Name</label>
                        <input
                          type="text"
                          value={supporterName}
                          onChange={(e) => setSupporterName(e.target.value)}
                          placeholder="Your name or @handle (optional)"
                          className="h-12 rounded-[14px] bg-white border-[1.5px] border-[#E4E7F2] px-4 text-sm text-[#0B1026] outline-none focus:border-[#6A4CF5] focus:shadow-[0_0_0_4px_rgba(106,76,245,0.15)] transition"
                        />
                      </div>

                      {activeWidget?.allow_supporter_message !== false && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-[#0B1026]">Message</label>
                            <span className="text-xs text-[#646A8A]">{supporterMessage.length}/140</span>
                          </div>
                          <textarea
                            value={supporterMessage}
                            maxLength={140}
                            onChange={(e) => setSupporterMessage(e.target.value)}
                            placeholder="Leave an encouraging remark..."
                            className="h-20 rounded-[14px] bg-white border-[1.5px] border-[#E4E7F2] p-3 text-sm text-[#0B1026] outline-none resize-none focus:border-[#6A4CF5] focus:shadow-[0_0_0_4px_rgba(106,76,245,0.15)] transition"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline Status Message */}
                {statusMessage && (
                  <div className={`p-3 rounded-[14px] text-xs leading-relaxed ${
                    statusMessage.type === 'error'
                      ? 'bg-[#FDF1E1] border border-[#F2D3A0] text-[#B45309]'
                      : 'bg-[#ECE8FF] border border-[#C7BAFF] text-[#4A2FC2]'
                  }`}>
                    {statusMessage.text}
                  </div>
                )}

                {/* THE SIGNATURE LIME PILL BUTTON */}
                <button
                  type="button"
                  onClick={handleInitiateTip}
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-full bg-[#C6FF3D] hover:-translate-y-0.5 active:translate-y-0 px-2 pl-6 flex items-center justify-between text-[#0B1026] font-bold text-base transition-all duration-200 cursor-pointer shadow-[0px_10px_24px_rgba(198,255,61,0.45),0px_2px_4px_rgba(11,16,38,0.08)] hover:shadow-[0px_14px_32px_rgba(198,255,61,0.7),0px_4px_10px_rgba(11,16,38,0.12)] disabled:opacity-65 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span>Tip {formatAssetAmount(amount)} {asset}</span>
                  <div className="w-10 h-10 rounded-full bg-[#0B1026] flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-[#C6FF3D]" />
                  </div>
                </button>

                {/* Reassurance Footer */}
                <div className="flex items-center justify-center gap-2 pt-1 text-xs text-[#646A8A]">
                  <div className="w-4 h-4 rounded-[4px] bg-[#C6FF3D] flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-[2px] bg-[#0B1026]" />
                  </div>
                  <span>Non-custodial · Direct on Stellar Testnet</span>
                </div>

              </div>
            </div>
          )}


          {/* ======================================================== */}
          {/* SCREEN 6: Awaiting Signature / Broadcast State           */}
          {/* ======================================================== */}
          {screen === 'awaiting' && (
            <div className="w-full flex flex-col">
              
              {/* Flow Top Bar */}
              <div className="h-16 px-4 py-3 flex items-center justify-between border-b border-[#E4E7F2]">
                <button
                  type="button"
                  onClick={() => setScreen('form')}
                  className="w-10 h-10 rounded-[10px] bg-[#EEF0F7] hover:bg-[#E4E7F2] flex items-center justify-center text-[#0B1026] transition cursor-pointer"
                  title="Go back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <span className="font-bold text-base text-[#0B1026]">
                  Awaiting signature
                </span>

                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0B1026] text-[#C6FF3D] text-[12px] font-semibold">
                  <div className="w-2 h-2 rounded-full bg-[#C6FF3D]" />
                  <span>TESTNET</span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 flex flex-col items-center text-center gap-5">
                
                {/* Hero Disc with Looping Arc Spinner */}
                <div className="relative w-28 h-28 flex items-center justify-center my-1">
                  <div className="absolute inset-0 rounded-full border-4 border-[#6A4CF5]/15 border-t-[#6A4CF5] border-r-[#6A4CF5] animate-spin" />
                  <div className="w-24 h-24 rounded-full bg-[#E6E0FF] flex items-center justify-center z-10 shadow-inner">
                    <ShieldCheck className="w-10 h-10 text-[#0B1026]" />
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-2xl tracking-tight text-[#0B1026]">
                    {awaitingHeading}
                  </h3>
                  <p className="text-sm text-[#4A5070] mt-1.5 leading-relaxed max-w-[280px]">
                    {awaitingSubtext}
                  </p>
                </div>

                {/* 3-Step Tracker Card */}
                <div className="w-full p-4 rounded-[14px] border border-[#E4E7F2] bg-white flex flex-col gap-3 text-left">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      awaitingStep === 1
                        ? 'bg-[#6A4CF5] text-white'
                        : 'bg-[#0B1026] text-[#C6FF3D]'
                    }`}>
                      {awaitingStep > 1 ? '✓' : '1'}
                    </div>
                    <span className="text-sm font-bold text-[#0B1026] flex-1">
                      Approve in wallet
                    </span>
                    <span className="text-xs font-semibold text-[#6A4CF5]">
                      {awaitingStep === 1 ? 'Active' : 'Done'}
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className={`flex items-center gap-3 ${awaitingStep < 2 ? 'opacity-40' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      awaitingStep === 2
                        ? 'bg-[#6A4CF5] text-white animate-pulse'
                        : awaitingStep > 2
                        ? 'bg-[#0B1026] text-[#C6FF3D]'
                        : 'border border-[#C9CEE2] text-[#646A8A]'
                    }`}>
                      {awaitingStep > 2 ? '✓' : '2'}
                    </div>
                    <span className="text-sm font-bold text-[#0B1026] flex-1">
                      Submit to Stellar network
                    </span>
                    <span className="text-xs font-semibold text-[#6A4CF5]">
                      {awaitingStep === 2 ? 'Broadcasting' : awaitingStep > 2 ? 'Done' : 'Pending'}
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className={`flex items-center gap-3 ${awaitingStep < 3 ? 'opacity-40' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      awaitingStep === 3
                        ? 'bg-[#6A4CF5] text-white animate-pulse'
                        : 'border border-[#C9CEE2] text-[#646A8A]'
                    }`}>
                      3
                    </div>
                    <span className="text-sm font-bold text-[#0B1026] flex-1">
                      Confirm on ledger
                    </span>
                    <span className="text-xs font-semibold text-[#6A4CF5]">
                      {awaitingStep === 3 ? 'Finalizing' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setScreen('form')}
                  className="w-full h-12 rounded-[14px] border-[1.5px] border-[#C9CEE2] hover:bg-[#EEF0F7] text-[#0B1026] font-bold text-sm transition cursor-pointer"
                >
                  Cancel
                </button>

              </div>
            </div>
          )}


          {/* ======================================================== */}
          {/* SCREEN 7: Payment Confirmed (Receipt State)              */}
          {/* ======================================================== */}
          {screen === 'receipt' && receiptData && (
            <div className="w-full flex flex-col">
              
              {/* Flow Top Bar */}
              <div className="h-16 px-4 py-3 flex items-center justify-between border-b border-[#E4E7F2]">
                <div className="w-10" />
                <span className="font-bold text-base text-[#0B1026]">
                  Receipt
                </span>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0B1026] text-[#C6FF3D] text-[12px] font-semibold">
                  <div className="w-2 h-2 rounded-full bg-[#C6FF3D]" />
                  <span>TESTNET</span>
                </div>
              </div>

              {/* Success Band with Glowing Lime Check Disc */}
              <div className="relative h-36 w-full bg-[#E6E0FF] flex items-center justify-center overflow-hidden">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 358 144" fill="none" preserveAspectRatio="none">
                  <circle cx="179" cy="72" r="65" stroke="#C7BAFF" strokeWidth="1.5" fill="none" />
                  <line x1="-10" y1="20" x2="370" y2="130" stroke="#C7BAFF" strokeWidth="1.5" />
                  <circle cx="50" cy="110" r="14" fill="#C7BAFF" opacity="0.6" />
                  <circle cx="310" cy="30" r="14" fill="#C7BAFF" opacity="0.6" />
                </svg>

                <div className="relative z-10 w-[72px] h-[72px] rounded-full bg-[#C6FF3D] flex items-center justify-center shadow-[0px_0px_0px_8px_rgba(198,255,61,0.32),0px_12px_28px_rgba(198,255,61,0.5)]">
                  <Check className="w-9 h-9 text-[#0B1026] stroke-[3.5]" />
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 flex flex-col items-center text-center gap-5">
                
                <div>
                  <h2 className="font-['Anton'] text-4xl uppercase tracking-wide text-[#0B1026]">
                    THANK YOU!
                  </h2>
                  <p className="text-sm text-[#4A5070] mt-1 leading-relaxed">
                    Your tip was delivered directly on the Stellar testnet.
                  </p>
                </div>

                {/* Receipt Details Card */}
                <div className="w-full rounded-[14px] border border-[#E4E7F2] bg-white overflow-hidden text-left">
                  <div className="h-12 px-4 flex items-center justify-between border-b border-[#E4E7F2]">
                    <span className="text-sm text-[#4A5070]">Amount</span>
                    <span className="text-sm font-bold text-[#0B1026]">
                      {formatAssetAmount(receiptData.amount)} {receiptData.asset}
                    </span>
                  </div>

                  <div className="h-12 px-4 flex items-center justify-between border-b border-[#E4E7F2]">
                    <span className="text-sm text-[#4A5070]">To</span>
                    <span className="text-sm font-bold text-[#0B1026]">
                      {receiptData.recipientName}
                    </span>
                  </div>

                  <div className="h-12 px-4 flex items-center justify-between border-b border-[#E4E7F2]">
                    <span className="text-sm text-[#4A5070]">Transaction</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-['Red_Hat_Mono'] text-xs font-semibold text-[#0B1026]">
                        {receiptData.txHash.slice(0, 4)}…{receiptData.txHash.slice(-4)}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHash}
                        className="p-1 rounded text-[#646A8A] hover:text-[#0B1026] hover:bg-[#EEF0F7] transition cursor-pointer"
                        title="Copy Transaction Hash"
                      >
                        {copiedHash ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="h-12 px-4 flex items-center justify-between">
                    <span className="text-sm text-[#4A5070]">Status</span>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F6EC] border border-[#A7E3BE] text-xs font-semibold text-[#15803D]">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Confirmed</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col gap-2.5">
                  {/* Primary Lime Button: Send Another Tip */}
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('form');
                      setReceiptData(null);
                    }}
                    className="w-full h-14 rounded-full bg-[#C6FF3D] hover:-translate-y-0.5 active:translate-y-0 px-2 pl-6 flex items-center justify-between text-[#0B1026] font-bold text-base transition-all duration-200 cursor-pointer shadow-[0px_10px_24px_rgba(198,255,61,0.45),0px_2px_4px_rgba(11,16,38,0.08)] hover:shadow-[0px_14px_32px_rgba(198,255,61,0.7)]"
                  >
                    <span>Send another tip</span>
                    <div className="w-10 h-10 rounded-full bg-[#0B1026] flex items-center justify-center flex-shrink-0">
                      <ArrowUpRight className="w-4 h-4 text-[#C6FF3D]" />
                    </div>
                  </button>

                  {/* Secondary Explorer Link */}
                  <a
                    href={receiptData.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 rounded-[14px] border-[1.5px] border-[#C9CEE2] hover:bg-[#EEF0F7] text-[#0B1026] font-bold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>View on Stellar Explorer ↗</span>
                  </a>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50 z-10 border-t border-white/5">
        <p>
          Direct tipping powered by <strong className="text-white">StarTip</strong> on the Stellar Testnet.
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-white/60 hover:text-[#C6FF3D] transition underline cursor-pointer"
        >
          Want to receive tips? Create your StarTip page →
        </button>
      </footer>

    </div>
  );
}
