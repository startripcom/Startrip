import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Info,
  Check,
  RotateCcw,
  X,
  Globe,
  Play,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  StarFourPoint,
  UsdcBadge,
  XlmBadge,
  CornerHandles,
} from './Icons';
import { useWallet } from '../context/WalletContext';
import { api, CreatorProfile } from '../services/api';
import { formatAssetAmount } from '../utils/formatters';

export type DemoStepState = '01_pick' | '01b_message' | '02_sending' | '03_landed';

interface DemoWidgetPageProps {
  onBackToHome: () => void;
  onStartForFree: () => void;
  initialStep?: DemoStepState;
  targetCreator?: string;
}

export function DemoWidgetPage({
  onBackToHome,
  onStartForFree,
  initialStep = '01_pick',
  targetCreator = 'alex_dev',
}: DemoWidgetPageProps) {
  const { walletAddress, signTransactionXDR } = useWallet();

  const [stepState, setStepState] = useState<DemoStepState>(initialStep);
  const [currency, setCurrency] = useState<'USDC' | 'XLM' | 'USDT'>('USDC');
  const [amount, setAmount] = useState<number>(5);
  const [fanName, setFanName] = useState<string>('Ada');
  const [fanMessage, setFanMessage] = useState<string>(
    'Your Stellar series got me my first dev job.'
  );
  const [mobileViewTab, setMobileViewTab] = useState<'fan' | 'creator'>('fan');
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);

  // Backend state
  const [targetCreatorProfile, setTargetCreatorProfile] = useState<CreatorProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [settledTxHash, setSettledTxHash] = useState<string>('9f3ce27b40d62a87c1265819df519965d141e6e02a1b9c7d4e5f6a1b2c3d4e5f');
  const [settleDuration, setSettleDuration] = useState<string>('4.8 s');
  const [thankYouNote, setThankYouNote] = useState<string | null>(null);
  const [isGeneratingAiNote, setIsGeneratingAiNote] = useState(false);
  const [customAmountActive, setCustomAmountActive] = useState(false);
  const [customAmountInput, setCustomAmountInput] = useState('');

  const creatorUsername = targetCreator || 'alex_dev';

  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const widgetParam = urlParams?.get('widget') || undefined;
    api.getPublicCreator(creatorUsername, widgetParam)
      .then((res) => setTargetCreatorProfile(res))
      .catch((err) => console.warn('Could not load creator profile:', err));
  }, [creatorUsername]);

  const presets =
    currency === 'USDC'
      ? targetCreatorProfile?.widget_config?.preset_amounts_usdc || [1, 2, 5, 10]
      : currency === 'XLM'
      ? targetCreatorProfile?.widget_config?.preset_amounts_xlm || [10, 25, 50, 100]
      : targetCreatorProfile?.widget_config?.preset_amounts_usdt || [1, 5, 10, 20];

  const handleCurrencySwitch = (newCur: 'USDC' | 'XLM' | 'USDT') => {
    setCurrency(newCur);
    setCustomAmountActive(false);
    if (newCur === 'USDC') {
      setAmount(presets[1] || 5);
    } else if (newCur === 'XLM') {
      setAmount(presets[1] || 25);
    } else {
      setAmount(presets[1] || 5);
    }
  };

  const handleSendDemoTip = async () => {
    setPaymentError(null);
    setIsSubmitting(true);
    setStepState('02_sending');
    const startTs = Date.now();

    try {
      const activeAmount = customAmountActive && customAmountInput ? parseFloat(customAmountInput) : amount;
      const creatorUser = targetCreatorProfile?.username || creatorUsername;
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const widgetParam = urlParams?.get('widget') || undefined;

      // 1. Create payment request on backend
      const paymentReq = await api.createPaymentRequest({
        creator_username: creatorUser,
        asset_code: currency,
        amount: activeAmount,
        supporter_name: displaySenderName,
        message: displayMessage,
        supporter_wallet: walletAddress || undefined,
        widget_slug: widgetParam,
      });

      // 2. Build unsigned transaction XDR
      let txHash = '';
      try {
        const xdrData = await api.buildTransactionXDR({
          reference_id: paymentReq.reference_id,
          supporter_wallet: walletAddress || 'GBXK4H2M2P6LNV2B6XQQ5U3VYV6Y2R6E762E44P3A4L2K7C4M3O2DEV1',
        });

        // 3. If connected to wallet, request signature
        if (walletAddress) {
          try {
            await signTransactionXDR(xdrData.unsigned_xdr);
          } catch (signErr) {
            console.warn('Wallet signing skipped:', signErr);
          }
        }
      } catch (xdrErr) {
        console.warn('XDR build info:', xdrErr);
      }

      // Generate realistic 64-char hex hash
      const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      txHash = randomHex;

      // 4. Verify payment on backend
      const verifiedTip = await api.verifyPayment({
        reference_id: paymentReq.reference_id,
        stellar_tx_hash: txHash,
      });

      const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
      setSettleDuration(`${elapsed} s`);
      setSettledTxHash(verifiedTip.stellar_tx_hash || txHash);
      setStepState('03_landed');

      // 5. Generate AI Thank-You Note via OpenAI
      setIsGeneratingAiNote(true);
      api.generateThankYouNote({
        creator_name: targetCreatorProfile?.display_name || creatorUser,
        supporter_name: displaySenderName,
        amount: String(activeAmount),
        asset_code: currency,
        supporter_message: displayMessage,
        tone: 'warm',
      })
        .then((res) => setThankYouNote(res.thank_you_note))
        .catch((err) => console.warn('OpenAI thank-you note error:', err))
        .finally(() => setIsGeneratingAiNote(false));

    } catch (err: any) {
      setPaymentError(err.message || 'Payment processing failed');
      setStepState('01_pick');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDemo = () => {
    setStepState('01_pick');
    setMobileViewTab('fan');
    setThankYouNote(null);
    setPaymentError(null);
  };

  const displaySenderName = fanName.trim() || 'Ada';
  const displaySenderInitial = displaySenderName.charAt(0).toUpperCase();
  const displayMessage =
    fanMessage.trim() || 'Your Stellar series got me my first dev job.';

  // ==========================================================================
  // FAN'S VIEW CARD (Left side on Desktop, Tab 1 on Mobile)
  // ==========================================================================
  const renderFanTipCard = () => (
    <div className="w-full max-w-[360px] mx-auto rounded-[28px] bg-white text-[#0B1026] shadow-[0px_2px_4px_rgba(11,16,38,0.06),0px_24px_56px_rgba(0,0,0,0.35)] overflow-hidden relative pb-5">
      {/* Top Banner (custom per widget or default) */}
      <div className="relative h-[72px] w-full bg-[#E6E0FF] px-4 pt-3 overflow-hidden">
        {targetCreatorProfile?.widget_config?.banner_url ? (
          <img
            src={targetCreatorProfile.widget_config.banner_url}
            alt="Banner"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="pointer-events-none absolute -right-12 -top-16 w-48 h-48 rounded-full border-[1.5px] border-[#C7BAFF]" />
            <div className="pointer-events-none absolute right-5 top-4 w-20 h-20 rounded-full bg-[#C7BAFF]/45" />
            <div className="pointer-events-none absolute left-24 top-8 w-36 h-36 rounded-full border-[1.5px] border-[#C7BAFF]" />
          </>
        )}

        {/* Testnet pill */}
        <div className="relative z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#0B1026] text-[#C6FF3D] text-[12px] leading-[15px] font-semibold">
          <Globe className="w-3.5 h-3.5 text-[#C6FF3D]" />
          <span>Testnet</span>
        </div>
      </div>

      {/* Overlapping Creator Avatar */}
      <div className="absolute left-5 top-10 w-16 h-16 rounded-full bg-[#0B1026] border-4 border-white flex items-center justify-center z-20 overflow-hidden shadow-md">
        {(targetCreatorProfile?.widget_config?.avatar_url || targetCreatorProfile?.avatar_url) ? (
          <img
            src={targetCreatorProfile?.widget_config?.avatar_url || targetCreatorProfile?.avatar_url}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-extrabold text-[20px] leading-[26px] text-[#C6FF3D]">
            {(targetCreatorProfile?.display_name || creatorUsername).charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Creator Header Info */}
      <div className="pt-11 px-5 space-y-5">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <h3 className="font-extrabold text-[20px] leading-[28px] tracking-[-0.5px] text-[#0B1026]">
              {targetCreatorProfile?.widget_config?.widget_title || targetCreatorProfile?.display_name || 'Alex Dev'}
            </h3>
            <span className="text-[14px] leading-[18px] text-[#646A8A]">
              @{targetCreatorProfile?.username || creatorUsername}
            </span>
          </div>
          <p className="text-[14px] leading-[20px] text-[#4A5070]">
            {targetCreatorProfile?.widget_config?.welcome_message || targetCreatorProfile?.bio || 'Thanks for backing my open-source work. Every tip funds another free tutorial.'}
          </p>
        </div>
      </div>

      <div className="my-5 h-px w-full bg-[#E4E7F2]" />

      {/* ================================================================== */}
      {/* STATE 01 & 01b: PICK AN AMOUNT & OPTIONAL NAME/MESSAGE              */}
      {/* ================================================================== */}
      {(stepState === '01_pick' || stepState === '01b_message') && (
        <div className="px-5 space-y-4">
          {/* Currency Switcher (USDC / XLM / USDT) */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-full p-1 rounded-[16px] bg-[#EEF0F7] grid grid-cols-3 gap-1">
              <button
                onClick={() => handleCurrencySwitch('USDC')}
                className={`h-[40px] rounded-[12px] flex items-center justify-center gap-1.5 text-[13px] font-bold transition cursor-pointer ${
                  currency === 'USDC'
                    ? 'bg-white text-[#0B1026] shadow-[0px_1px_2px_rgba(11,16,38,0.08),0px_2px_8px_rgba(11,16,38,0.06)]'
                    : 'text-[#4A5070] hover:text-[#0B1026]'
                }`}
              >
                <UsdcBadge size={18} />
                <span>USDC</span>
              </button>

              <button
                onClick={() => handleCurrencySwitch('XLM')}
                className={`h-[40px] rounded-[12px] flex items-center justify-center gap-1.5 text-[13px] font-bold transition cursor-pointer ${
                  currency === 'XLM'
                    ? 'bg-white text-[#0B1026] shadow-[0px_1px_2px_rgba(11,16,38,0.08),0px_2px_8px_rgba(11,16,38,0.06)]'
                    : 'text-[#4A5070] hover:text-[#0B1026]'
                }`}
              >
                <XlmBadge size={18} />
                <span>XLM</span>
              </button>

              <button
                onClick={() => handleCurrencySwitch('USDT')}
                className={`h-[40px] rounded-[12px] flex items-center justify-center gap-1.5 text-[13px] font-bold transition cursor-pointer ${
                  currency === 'USDT'
                    ? 'bg-white text-[#0B1026] shadow-[0px_1px_2px_rgba(11,16,38,0.08),0px_2px_8px_rgba(11,16,38,0.06)]'
                    : 'text-[#4A5070] hover:text-[#0B1026]'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-[#26A17B] text-white text-[9px] font-bold flex items-center justify-center">₮</span>
                <span>USDT</span>
              </button>
            </div>

            {/* Large Amount Display */}
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="font-extrabold text-[48px] leading-[52px] tracking-[-1.5px] text-[#0B1026] tabular-nums">
                {amount}
              </span>
              <span className="font-bold text-[16px] leading-[20px] text-[#646A8A]">
                {currency}
              </span>
            </div>
          </div>

          {/* 4 Preset Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => {
              const isSelected = amount === preset;
              return (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`h-[48px] rounded-[14px] font-bold text-[16px] leading-[20px] border transition tabular-nums ${
                    isSelected
                      ? 'bg-[#0B1026] border-[#0B1026] text-[#C6FF3D]'
                      : 'bg-white border-[#E4E7F2] text-[#0B1026] hover:border-[#0B1026]/40'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {/* State 01: "+ Add your name and a message" button */}
          {stepState === '01_pick' && (
            <button
              onClick={() => setStepState('01b_message')}
              className="py-2 flex items-center gap-2 text-[14px] leading-[18px] font-bold text-[#6A4CF5] hover:opacity-80 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add your name and a message</span>
            </button>
          )}

          {/* State 01b: Expanded Name & Message inputs */}
          {stepState === '01b_message' && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[14px] leading-[20px]">
                  <label className="font-semibold text-[#0B1026]">Your name</label>
                  <span className="font-medium text-[#646A8A]">Optional</span>
                </div>
                <input
                  type="text"
                  value={fanName}
                  onChange={(e) => setFanName(e.target.value)}
                  placeholder="Ada"
                  className="w-full h-[48px] px-4 rounded-[14px] border border-[#E4E7F2] text-[16px] text-[#0B1026] focus:outline-none focus:border-[#6A4CF5]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[14px] leading-[20px]">
                  <label className="font-semibold text-[#0B1026]">Message</label>
                  <span className="font-medium text-[#646A8A] tabular-nums">
                    {fanMessage.length}/140
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={140}
                  value={fanMessage}
                  onChange={(e) => setFanMessage(e.target.value)}
                  placeholder="Say something nice..."
                  className="w-full p-3.5 rounded-[14px] border border-[#E4E7F2] text-[16px] leading-[24px] text-[#0B1026] resize-none focus:outline-none focus:border-[#6A4CF5]"
                />
              </div>
            </div>
          )}

          {/* Send demo tip primary CTA */}
          <div className="pt-1 space-y-3 flex flex-col items-center">
            <button
              onClick={handleSendDemoTip}
              className="w-full h-[56px] pl-6 pr-2 rounded-[28px] bg-[#C6FF3D] hover:brightness-95 transition flex items-center justify-between cursor-pointer"
            >
              <span className="font-bold text-[16px] leading-[20px] text-[#0B1026]">
                Send demo tip · {amount} {currency}
              </span>
              <span className="w-10 h-10 rounded-full bg-[#0B1026] flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-[18px] h-[18px] text-[#C6FF3D]" />
              </span>
            </button>

            <div className="flex items-center gap-2 text-[12px] leading-[16px] text-[#646A8A]">
              <Info className="w-4 h-4 text-[#646A8A] shrink-0" />
              <span>
                Demo tips use <strong className="font-bold text-[#0B1026]">test money</strong>. No wallet opens.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STATE 02: SENDING THE TIP                                          */}
      {/* ================================================================== */}
      {stepState === '02_sending' && (
        <div className="px-5 space-y-7">
          <div className="space-y-3">
            {/* Summary Pill */}
            <div className="h-[45px] px-4 rounded-[14px] bg-[#EEF0F7] flex items-center justify-between">
              <span className="text-[14px] text-[#0B1026]">
                Tip to {targetCreatorProfile?.display_name || targetCreatorProfile?.username || 'Creator'}
              </span>
              <span className="font-extrabold text-[16px] text-[#0B1026] tabular-nums">
                {formatAssetAmount(amount)} {currency}
              </span>
            </div>

            {/* Step Checklist */}
            <div className="divide-y divide-[#EEF0F7]">
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#E7F6EC] flex items-center justify-center text-[#15803D]">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <span className="font-semibold text-[14px] text-[#0B1026]">
                    Signed by Stellar wallet
                  </span>
                </div>
                <span className="font-mono-code text-[13px] text-[#646A8A]">0.4 s</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#E7F6EC] flex items-center justify-center text-[#15803D]">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <span className="font-semibold text-[14px] text-[#0B1026]">
                    Sent to Stellar testnet
                  </span>
                </div>
                <span className="font-mono-code text-[13px] text-[#646A8A]">0.9 s</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full border-2 border-[#C9CFE3] border-t-[#6A4CF5] animate-spin" />
                  <span className="font-semibold text-[14px] text-[#0B1026]">
                    Settling on the network
                  </span>
                </div>
                <span className="font-mono-code text-[13px] text-[#646A8A]">2.1 s</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 flex flex-col items-center">
            <button
              disabled={isSubmitting}
              className="w-full h-[56px] rounded-[28px] bg-[#EEF0F7] flex items-center justify-center gap-2.5 text-[#4A5070] font-bold text-[16px] cursor-wait"
            >
              <span className="w-[18px] h-[18px] rounded-full border-2 border-[#C9CFE3] border-t-[#0B1026] animate-spin" />
              <span>Verifying and settling tip…</span>
            </button>
            <span className="text-[12px] text-[#646A8A]">
              Stellar Testnet consensus settles in ~3-5 seconds.
            </span>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STATE 03: TIP LANDED                                               */}
      {/* ================================================================== */}
      {stepState === '03_landed' && (
        <div className="px-5 space-y-5 flex flex-col items-center">
          {/* Lime Check Circle + Message */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#C6FF3D] flex items-center justify-center text-[#0B1026]">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-[24px] leading-[32px] tracking-[-0.5px] text-[#0B1026]">
                {formatAssetAmount(amount)} {currency} sent to {targetCreatorProfile?.display_name || targetCreatorProfile?.username || 'Creator'}
              </h4>
              <p className="text-[14px] leading-[20px] text-[#4A5070] max-w-[300px]">
                Thanks, {displaySenderName}. Your message is on {targetCreatorProfile?.display_name?.split(' ')[0] || 'the creator'}’s stream now.
              </p>
            </div>
          </div>

          {/* AI Thank-You Note generated via backend OpenAI */}
          {(isGeneratingAiNote || thankYouNote) && (
            <div className="w-full p-4 rounded-[16px] bg-[#F7F6FF] border border-[#E0DAFE] text-left animate-in fade-in duration-300">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6A4CF5] mb-1.5">
                <span>✨ Instant AI Thank-You Note</span>
              </div>
              {isGeneratingAiNote ? (
                <div className="flex items-center gap-2 text-xs text-[#646A8A]">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#6A4CF5] border-t-transparent animate-spin shrink-0" />
                  <span>Personalizing creator thank-you note via OpenAI...</span>
                </div>
              ) : (
                <p className="text-[13px] text-[#0B1026] italic leading-relaxed font-sans">
                  "{thankYouNote}"
                </p>
              )}
            </div>
          )}

          {/* Receipt Breakdown */}
          <div className="w-full border-t border-[#E4E7F2] divide-y divide-[#EEF0F7] text-[14px]">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#4A5070]">Settled in</span>
              <span className="font-mono-code font-semibold text-[#0B1026]">{settleDuration || '3.2 s'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#4A5070]">Network fee</span>
              <span className="font-mono-code font-semibold text-[#0B1026]">0.00001 XLM (~$0.000001)</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#4A5070]">Transaction</span>
              {settledTxHash ? (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${settledTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-code font-semibold text-[#6A4CF5] hover:underline flex items-center gap-1"
                  title="View on Stellar Testnet Explorer"
                >
                  <span>{settledTxHash.slice(0, 6)}…{settledTxHash.slice(-4)}</span>
                  <span className="text-xs">↗</span>
                </a>
              ) : (
                <span className="font-mono-code font-semibold text-[#0B1026]">Direct on-chain</span>
              )}
            </div>
          </div>

          {/* Mobile-only "See what creator got" button matching mobile frame 03 */}
          <div className="w-full space-y-2.5">
            <button
              onClick={() => setMobileViewTab('creator')}
              className="lg:hidden w-full h-[52px] rounded-full bg-[#0B1026] text-white font-bold text-[15px] flex items-center justify-center gap-2"
            >
              <span>See what {targetCreatorProfile?.display_name?.split(' ')[0] || 'Creator'} got</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetDemo}
              className="w-full h-[52px] rounded-full bg-white border border-[#E4E7F2] hover:bg-[#F6F7FB] text-[#0B1026] font-bold text-[15px] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Send another tip</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================================================
  // YOUR VIEW (Right side on Desktop, Tab 2 on Mobile)
  // Includes Stream Preview + Recent Tips + KPI Cards
  // ==========================================================================
  const renderCreatorView = () => {
    const isSending = stepState === '02_sending';
    const isLanded = stepState === '03_landed';

    return (
      <div className="w-full space-y-4">
        {/* Stream Preview Box */}
        <div
          className="relative w-full h-[230px] sm:h-[340px] p-4 sm:p-5 rounded-[16px] border border-white/[0.12] flex flex-col justify-between overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #141A3A 10.99%, #070A1A 89.01%)',
          }}
        >
          {/* Stream Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-[6px] bg-[#E5484D] text-white font-extrabold text-[10px] sm:text-[11px] leading-[14px] tracking-[0.5px]">
                LIVE
              </span>
              <span className="font-mono-code text-[12px] text-white/60">1.2k watching</span>
            </div>

            {!isLanded && (
              <div className="px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.14] font-mono-code text-[12px] text-white/72">
                {isSending ? 'Tip on its way' : 'Overlay listening'}
              </div>
            )}
          </div>

          {/* Code Lines Representation */}
          <div className="space-y-2.5 sm:space-y-3 my-auto pl-2">
            <div className="w-[45%] max-w-[313px] h-1.5 sm:h-2 rounded-full bg-[#8C73FF]/85" />
            <div className="ml-5 w-[30%] max-w-[202px] h-1.5 sm:h-2 rounded-full bg-[#C6FF3D]/85" />
            <div className="ml-5 w-[40%] max-w-[273px] h-1.5 sm:h-2 rounded-full bg-[#4A5070]/85" />
            <div className="ml-10 w-[22%] max-w-[152px] h-1.5 sm:h-2 rounded-full bg-[#5A9CFF]/85" />
            <div className="ml-5 w-[35%] max-w-[243px] h-1.5 sm:h-2 rounded-full bg-[#4A5070]/85" />
            <div className="hidden sm:block ml-10 w-[26%] max-w-[182px] h-2 rounded-full bg-[#8C73FF]/85" />
            <div className="hidden sm:block w-[42%] max-w-[293px] h-2 rounded-full bg-[#4A5070]/85" />
          </div>

          {/* Bottom Row: Stream Alert Popup (when landed) + TA Streamer Avatar */}
          <div className="flex items-end justify-between gap-4 relative z-10">
            <div className="flex-1">
              <div className="ml-5 w-24 sm:w-32 h-1.5 sm:h-2 rounded-full bg-[#C6FF3D]/85 mb-2" />

              {isLanded && (
                <div className="w-full max-w-[400px] p-3 sm:p-4 rounded-[16px] sm:rounded-[18px] bg-white border-[3px] border-[#C6FF3D] shadow-[0px_16px_40px_rgba(0,0,0,0.5)] flex items-start gap-3 sm:gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] bg-[#2775CA] text-white font-extrabold text-[18px] sm:text-[22px] flex items-center justify-center shrink-0">
                    {currency === 'USDC' ? '$' : '★'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-[13px] font-bold text-[#4A5070]">
                      {displaySenderName} just tipped
                    </div>
                    <div className="font-anton text-[22px] sm:text-[30px] leading-tight tracking-[0.5px] text-[#0B1026]">
                      {formatAssetAmount(amount)} {currency}
                    </div>
                    <div className="text-[11px] sm:text-[13px] text-[#4A5070] truncate">
                      “{displayMessage}”
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Streamer Avatar Circle */}
            <div className="w-16 h-16 sm:w-[112px] sm:h-[112px] rounded-full bg-[#C6FF3D] ring-4 ring-[#070A1A] flex items-center justify-center shrink-0">
              <span className="font-extrabold text-[18px] sm:text-[28px] text-[#0B1026]">
                {targetCreatorProfile?.display_name
                  ? targetCreatorProfile.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'CR'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Recent Tips Card + 2 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          {/* Recent tips card */}
          <div className="sm:col-span-8 rounded-[16px] bg-white text-[#0B1026] pt-4 pb-1 overflow-hidden">
            <div className="px-5 pb-3 flex items-center justify-between">
              <span className="font-bold text-[15px] leading-[19px] text-[#0B1026]">
                Recent tips
              </span>
              <span className="font-medium text-[12px] leading-[15px] text-[#646A8A]">
                Dashboard · Overview
              </span>
            </div>

            <div className="divide-y divide-[#EEF0F7]">
              {/* New Tip Row in State 02 (Pending) or State 03 (Landed) */}
              {(isSending || isLanded) && (
                <div
                  className={`px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
                    isLanded ? 'bg-[#F4FFE0]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#0B1026] text-[#C6FF3D] font-extrabold text-[13px] flex items-center justify-center shrink-0">
                      {displaySenderInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] leading-[20px] text-[#0B1026]">
                          {displaySenderName}
                        </span>
                        {isLanded && (
                          <span className="px-2 py-0.5 rounded-full bg-[#0B1026] text-[#C6FF3D] text-[11px] font-bold">
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] leading-[16px] text-[#646A8A] truncate">
                        “{displayMessage}”
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono-code font-semibold text-[14px] text-[#0B1026] tabular-nums">
                      {formatAssetAmount(amount)} {currency}
                    </div>
                    {isSending ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#FDF1E1] text-[#8A4A06] text-[11px] font-bold">
                        Pending
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#E7F6EC] text-[#15803D] text-[11px] font-bold">
                        Just now
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Existing rows: Kemi, Sam, Daniel */}
              {[
                {
                  initial: 'K',
                  name: 'Kemi',
                  msg: '“Keep the tutorials coming!”',
                  amt: '2 USDC',
                },
                {
                  initial: 'S',
                  name: 'Sam',
                  msg: 'No message',
                  amt: '25 XLM',
                },
                {
                  initial: 'D',
                  name: 'Daniel',
                  msg: '“Fixed my build in 5 minutes.”',
                  amt: '10 USDC',
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#EEF0F7] text-[#0B1026] font-extrabold text-[13px] flex items-center justify-center shrink-0">
                      {row.initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[14px] leading-[20px] text-[#0B1026]">
                        {row.name}
                      </div>
                      <div className="text-[12px] leading-[16px] text-[#646A8A] truncate">
                        {row.msg}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-code font-semibold text-[14px] text-[#0B1026] tabular-nums">
                      {row.amt}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-[#E7F6EC] text-[#15803D] text-[11px] font-bold">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2 Right KPI Cards */}
          <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-1 gap-3.5">
            {/* Total USDC tips */}
            <div className="p-4 sm:p-5 rounded-[16px] bg-white text-[#0B1026] flex flex-col justify-between">
              <span className="font-semibold text-[12px] leading-[15px] text-[#646A8A]">
                Total USDC tips
              </span>
              <div className="my-1.5 flex items-baseline gap-1">
                <span className="font-extrabold text-[22px] sm:text-[28px] leading-[32px] tracking-[-1px] text-[#0B1026] tabular-nums">
                  {isLanded ? '317.00' : '312.00'}
                </span>
                <span className="font-bold text-[14px] text-[#646A8A]">USDC</span>
              </div>
              {isLanded ? (
                <span className="font-bold text-[12px] leading-[15px] text-[#15803D]">
                  +5.00 just now
                </span>
              ) : (
                <span className="font-medium text-[12px] leading-[15px] text-[#646A8A]">
                  All time
                </span>
              )}
            </div>

            {/* Tips today */}
            <div className="p-4 sm:p-5 rounded-[16px] bg-white text-[#0B1026] flex flex-col justify-between">
              <span className="font-semibold text-[12px] leading-[15px] text-[#646A8A]">
                Tips today
              </span>
              <div className="my-1.5">
                <span className="font-extrabold text-[22px] sm:text-[28px] leading-[32px] tracking-[-1px] text-[#0B1026] tabular-nums">
                  {isLanded ? '5' : '4'}
                </span>
              </div>
              {isLanded ? (
                <span className="font-bold text-[12px] leading-[15px] text-[#15803D]">
                  Latest just now
                </span>
              ) : (
                <span className="font-medium text-[12px] leading-[15px] text-[#646A8A]">
                  Latest 12 min ago
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070A1A] text-white relative overflow-hidden pb-16">
      {/* Subtle 12-column vertical background grid lines matching Figma */}
      <div className="pointer-events-none absolute inset-0 max-w-[1440px] mx-auto grid grid-cols-6 lg:grid-cols-12">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div
            key={idx}
            className="border-r border-white/[0.03] h-full last:border-r-0 hidden lg:block"
          />
        ))}
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-5 lg:px-0">
        {/* ================================================================== */}
        {/* TOP BAR (Desktop & Mobile responsive)                              */}
        {/* ================================================================== */}
        <header className="py-4 lg:py-[27px] flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#C6FF3D] flex items-center justify-center">
              <StarFourPoint className="w-4 h-4 lg:w-[18px] lg:h-[18px]" color="#0B1026" />
            </div>
            <span className="font-bold text-[18px] lg:text-[21px] leading-[27px] tracking-[-0.5px] text-white">
              StarTip
            </span>
          </button>

          {/* Center Demo Mode Pill (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 pl-2.5 pr-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.16]">
            <span className="w-[22px] h-[22px] rounded-full bg-[#C6FF3D] flex items-center justify-center text-[#0B1026]">
              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
            </span>
            <span className="font-semibold text-[13px] text-white">Demo mode</span>
            <span className="text-[13px] text-white/72">Test money, no wallet needed</span>
          </div>

          {/* Right Actions (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              onClick={onBackToHome}
              className="h-[42px] px-4 rounded-full border border-white/[0.18] hover:bg-white/[0.06] transition flex items-center gap-2 text-[14px] font-semibold text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </button>
            <button
              onClick={onStartForFree}
              className="h-[42px] px-[18px] rounded-full bg-[#C6FF3D] hover:brightness-95 transition text-[14px] font-semibold text-[#0B1026] cursor-pointer"
            >
              Start for free
            </button>
          </div>

          {/* Close Button (Mobile) */}
          <button
            onClick={onBackToHome}
            className="lg:hidden w-10 h-10 rounded-full border border-white/[0.18] flex items-center justify-center text-white"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Mobile Demo Mode Pill */}
        <div className="lg:hidden mb-3">
          <div className="inline-flex items-center gap-2 pl-2 pr-4 py-1 rounded-full bg-white/[0.04] border border-white/[0.16]">
            <span className="w-[22px] h-[22px] rounded-full bg-[#C6FF3D] flex items-center justify-center text-[#0B1026]">
              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
            </span>
            <span className="font-semibold text-[12px] text-white">Demo mode</span>
            <span className="text-[12px] text-white/72">No wallet needed</span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* HERO TITLE & DESCRIPTION                                           */}
        {/* ================================================================== */}
        <div className="mt-2 lg:mt-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-16">
          <div>
            <div className="hidden lg:block font-mono-code text-[13px] leading-[17px] tracking-[0.5px] text-[#C6FF3D] mb-2.5">
              [ Try the widget ]
            </div>
            <h1 className="text-[30px] leading-[36px] lg:text-[48px] lg:leading-[56px] font-medium tracking-[-1px] lg:tracking-[-1.5px]">
              <span className="text-white">Send a tip. </span>
              <span className="text-white/[0.42]">Watch it land.</span>
            </h1>
          </div>

          <p className="text-[14px] leading-[22px] lg:text-[16px] lg:leading-[26px] text-white/[0.62] max-w-[513px]">
            <span className="hidden lg:inline">
              On the left is the card your fans see. Send a test tip and watch what shows up on your stream and in your dashboard. Nothing here touches a real wallet.
            </span>
            <span className="lg:hidden">
              {stepState === '03_landed'
                ? 'The tip landed. Switch to Your view to see the alert and the dashboard.'
                : 'This is the card your fans see. Send a test tip, then switch to Your view.'}
            </span>
          </p>
        </div>

        {/* ================================================================== */}
        {/* INTERACTIVE STEP RAIL (Desktop)                                    */}
        {/* Allows natural progression OR direct state jumping                 */}
        {/* ================================================================== */}
        <div className="hidden lg:flex items-center justify-between pt-4 mt-8 border-t border-white/[0.08]">
          <div className="flex items-center gap-16 xl:gap-36">
            {/* Step 01 */}
            <button
              onClick={() => setStepState('01_pick')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              {stepState === '01_pick' || stepState === '01b_message' ? (
                <span className="w-7 h-7 rounded-full bg-[#C6FF3D] border border-[#C6FF3D] font-mono-code font-semibold text-[12px] text-[#0B1026] flex items-center justify-center">
                  01
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full bg-[#C6FF3D]/14 border border-[#C6FF3D]/40 font-mono-code text-[12px] text-[#C6FF3D] flex items-center justify-center">
                  ✓
                </span>
              )}
              <span
                className={`text-[14px] ${
                  stepState === '01_pick' || stepState === '01b_message'
                    ? 'text-white font-medium'
                    : 'text-white/78'
                }`}
              >
                Pick an amount
              </span>
            </button>

            {/* Step 02 */}
            <button
              onClick={() => {
                setAutoAdvance(false);
                setStepState('02_sending');
              }}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              {stepState === '02_sending' ? (
                <span className="w-7 h-7 rounded-full bg-[#C6FF3D] border border-[#C6FF3D] font-mono-code font-semibold text-[12px] text-[#0B1026] flex items-center justify-center">
                  02
                </span>
              ) : stepState === '03_landed' ? (
                <span className="w-7 h-7 rounded-full bg-[#C6FF3D]/14 border border-[#C6FF3D]/40 font-mono-code text-[12px] text-[#C6FF3D] flex items-center justify-center">
                  ✓
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full border border-white/18 font-mono-code text-[12px] text-white/60 flex items-center justify-center">
                  02
                </span>
              )}
              <span
                className={`text-[14px] ${
                  stepState === '02_sending'
                    ? 'text-white font-medium'
                    : stepState === '03_landed'
                    ? 'text-white/78'
                    : 'text-white/50'
                }`}
              >
                Send the tip
              </span>
            </button>

            {/* Step 03 */}
            <button
              onClick={() => {
                setAutoAdvance(false);
                setStepState('03_landed');
              }}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              {stepState === '03_landed' ? (
                <span className="w-7 h-7 rounded-full bg-[#C6FF3D] border border-[#C6FF3D] font-mono-code font-semibold text-[12px] text-[#0B1026] flex items-center justify-center">
                  03
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full border border-white/18 font-mono-code text-[12px] text-white/60 flex items-center justify-center">
                  03
                </span>
              )}
              <span
                className={`text-[14px] ${
                  stepState === '03_landed' ? 'text-white font-medium' : 'text-white/50'
                }`}
              >
                See it land
              </span>
            </button>
          </div>

          {/* Quick state switcher pills for easy inspection of all 4 Figma states */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-full p-1">
            {(
              [
                { id: '01_pick', label: '01 Pick' },
                { id: '01b_message', label: '01b Message' },
                { id: '02_sending', label: '02 Sending' },
                { id: '03_landed', label: '03 Landed' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setAutoAdvance(false);
                  setStepState(st.id);
                }}
                className={`px-2.5 py-1 rounded-full font-mono-code text-[11px] transition cursor-pointer ${
                  stepState === st.id
                    ? 'bg-[#C6FF3D] text-[#0B1026] font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================== */}
        {/* MOBILE VIEW TABS ("Fan's view" | "Your view")                      */}
        {/* ================================================================== */}
        <div className="lg:hidden mt-5 space-y-3">
          <div className="w-full p-[5px] rounded-full bg-white/[0.06] border border-white/[0.1] grid grid-cols-2">
            <button
              onClick={() => setMobileViewTab('fan')}
              className={`h-[40px] rounded-full font-semibold text-[14px] transition ${
                mobileViewTab === 'fan' ? 'bg-white text-[#0B1026]' : 'text-white/62'
              }`}
            >
              Fan’s view
            </button>
            <button
              onClick={() => setMobileViewTab('creator')}
              className={`h-[40px] rounded-full font-semibold text-[14px] flex items-center justify-center gap-2 transition ${
                mobileViewTab === 'creator' ? 'bg-white text-[#0B1026]' : 'text-white/62'
              }`}
            >
              <span>Your view</span>
              {stepState === '03_landed' && mobileViewTab !== 'creator' && (
                <span className="w-2 h-2 rounded-full bg-[#C6FF3D]" />
              )}
            </button>
          </div>

          {/* Mobile quick state bar */}
          <div className="flex items-center justify-center gap-1 bg-white/[0.04] border border-white/10 rounded-full p-1">
            {(
              [
                { id: '01_pick', label: '01' },
                { id: '01b_message', label: '01b' },
                { id: '02_sending', label: '02' },
                { id: '03_landed', label: '03' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setAutoAdvance(false);
                  setStepState(st.id);
                }}
                className={`flex-1 py-1 rounded-full font-mono-code text-[11px] transition ${
                  stepState === st.id
                    ? 'bg-[#C6FF3D] text-[#0B1026] font-semibold'
                    : 'text-white/60'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================== */}
        {/* DESKTOP SPLIT VIEW (Left: Fan's view 440px, Right: Your view 736px) */}
        {/* ================================================================== */}
        <div className="hidden lg:block mt-8 space-y-3">
          {/* Column Labels */}
          <div className="grid grid-cols-12 gap-6 text-[13px] leading-[17px]">
            <div className="col-span-5 max-w-[440px] flex items-center justify-between">
              <div>
                <strong className="font-semibold text-white">Fan’s view</strong>
                <span className="text-white/60"> · startip.app/{targetCreatorProfile?.username || creatorUsername}</span>
              </div>
              <span className="font-mono-code text-white/60">01</span>
            </div>
            <div className="col-span-7 flex items-center justify-between">
              <div>
                <strong className="font-semibold text-white">Your view</strong>
                <span className="text-white/60"> · stream overlay and dashboard</span>
              </div>
              <span className="font-mono-code text-white/60">02</span>
            </div>
          </div>

          {/* Split Columns */}
          <div className="flex items-start gap-6">
            {/* Left Framed Container (440px) */}
            <div className="relative w-[440px] shrink-0 p-10 bg-white/[0.03] border border-white/[0.12]">
              <CornerHandles variant="white" size={9} />
              {renderFanTipCard()}
            </div>

            {/* Right Column (736px) */}
            <div className="flex-1 min-w-0">{renderCreatorView()}</div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* MOBILE TAB CONTENT                                                 */}
        {/* ================================================================== */}
        <div className="lg:hidden mt-4">
          {mobileViewTab === 'fan' ? (
            <div className="space-y-4">
              {renderFanTipCard()}
              {stepState !== '03_landed' && (
                <p className="text-center text-[12px] text-white/50">
                  Demo tips use a StarTip test wallet. No real money moves.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {renderCreatorView()}
              {/* Mobile Call to Action Banner when on Your View */}
              <div className="p-5 bg-[#C6FF3D] text-[#0B1026] space-y-3">
                <div className="space-y-1">
                  <div className="font-bold text-[18px] leading-[24px] tracking-[-0.5px]">
                    That’s StarTip.
                  </div>
                  <p className="text-[13px] leading-[20px] text-[#2B3410]">
                    Your own tip page takes two minutes and costs nothing.
                  </p>
                </div>
                <button
                  onClick={onStartForFree}
                  className="w-full h-[52px] rounded-full bg-[#0B1026] text-white font-semibold text-[15px] flex items-center justify-center gap-2"
                >
                  <span>Create your tip widget</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* BOTTOM BAR (Desktop)                                               */}
        {/* State 01/01b/02: Demo note bar | State 03: Lime CTA banner         */}
        {/* ================================================================== */}
        <div className="hidden lg:block mt-8">
          {stepState === '03_landed' ? (
            <div className="w-full px-7 py-6 bg-[#C6FF3D] border border-[#C6FF3D] text-[#0B1026] flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold text-[22px] leading-[28px] tracking-[-0.5px] text-[#0B1026]">
                  That’s what your fans get. And what you get.
                </div>
                <div className="text-[14px] leading-[20px] text-[#2B3410]">
                  Your own tip page takes two minutes to set up and costs nothing.
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleResetDemo}
                  className="h-[48px] px-5 rounded-full border border-[#0B1026]/30 hover:bg-[#0B1026]/5 font-semibold text-[15px] text-[#0B1026] transition cursor-pointer"
                >
                  Try it again
                </button>
                <button
                  onClick={onStartForFree}
                  className="h-[48px] px-5 rounded-full bg-[#0B1026] hover:bg-[#0B1026]/90 text-white font-semibold text-[15px] flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Create your tip widget</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full px-6 py-5 bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[14px] leading-[20px] text-white/[0.62]">
                <Info className="w-[18px] h-[18px] text-white shrink-0" />
                <span>
                  Demo mode uses a StarTip test wallet. No real money moves and nothing is saved.
                </span>
              </div>
              <span className="font-mono-code text-[12px] leading-[20px] text-white/[0.62]">
                Stellar testnet
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
