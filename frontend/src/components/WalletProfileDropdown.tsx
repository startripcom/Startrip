import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Coins,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { UsdcBadge, XlmBadge, StarFourPoint } from './Icons';
import { formatAssetAmount } from '../utils/formatters';

interface WalletProfileDropdownProps {
  theme?: 'dark' | 'light';
  onNavigateToSettings?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToWidgets?: () => void;
}

export function WalletProfileDropdown({
  theme = 'light',
  onNavigateToSettings,
  onNavigateToDashboard,
  onNavigateToWidgets,
}: WalletProfileDropdownProps) {
  const {
    walletAddress,
    creator,
    isAuthenticated,
    balances,
    isLoadingBalances,
    refreshBalances,
    disconnectWallet,
    connectWallet,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<'XLM' | 'USDC' | 'USDT'>('USDC');
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!walletAddress) return;
    navigator.clipboard?.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await refreshBalances();
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await disconnectWallet();
  };

  if (!isAuthenticated && !walletAddress) {
    return (
      <button
        onClick={() => connectWallet()}
        className={`h-9 px-3.5 rounded-full font-semibold text-xs transition flex items-center gap-2 cursor-pointer ${
          theme === 'dark'
            ? 'bg-[#C6FF3D] text-[#0B1026] hover:brightness-95'
            : 'bg-[#0B1026] text-[#C6FF3D] hover:bg-[#1E2548]'
        }`}
      >
        <Wallet className="w-3.5 h-3.5" />
        <span>Connect Wallet</span>
      </button>
    );
  }

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
    : 'Wallet';

  const avatarChar = (creator?.display_name || creator?.username || walletAddress?.slice(2) || 'C')
    .charAt(0)
    .toUpperCase();

  // Active balance display for selected asset (formatted to 2 decimal places)
  const rawActiveBalance =
    selectedAsset === 'XLM'
      ? balances.XLM
      : selectedAsset === 'USDC'
      ? balances.USDC
      : balances.USDT;
  const activeBalance = formatAssetAmount(rawActiveBalance);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Profile Trigger Button (Replaces the Testnet Icon/Pill) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group h-[38px] pl-1.5 pr-3 rounded-full border transition-all flex items-center gap-2 cursor-pointer select-none ${
          theme === 'dark'
            ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.18] text-white shadow-sm'
            : 'bg-white hover:bg-[#F6F7FB] border-[#E4E7F2] text-[#0B1026] shadow-sm'
        }`}
        title="View Profile and Live Stellar Balances"
      >
        {/* Avatar or Initial Badge */}
        <div className="w-[28px] h-[28px] rounded-full overflow-hidden bg-gradient-to-tr from-[#6A4CF5] to-[#C6FF3D] flex items-center justify-center p-[1px] shrink-0">
          {creator?.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.display_name || 'Profile'}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-[#0B1026] flex items-center justify-center text-[#C6FF3D] font-bold text-[11px]">
              {avatarChar}
            </div>
          )}
        </div>

        {/* Live Balance / Name Chip */}
        <div className="flex flex-col text-left leading-tight min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold truncate max-w-[100px] sm:max-w-[130px]">
              {creator?.display_name || creator?.username || shortAddress}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" title="Live Stellar Testnet" />
          </div>
          <div className="text-[10px] font-mono-code font-semibold opacity-75">
            {activeBalance} {selectedAsset}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Profile & Live Balances Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[330px] sm:w-[360px] max-w-[calc(100vw-24px)] rounded-2xl bg-white text-[#0B1026] border border-[#E4E7F2] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          style={{ filter: 'drop-shadow(0 20px 25px rgba(11, 16, 38, 0.15))' }}
        >
          {/* Header: User Profile Info */}
          <div className="flex items-start justify-between pb-3.5 border-b border-[#EEF0F7]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-[#0B1026] text-[#C6FF3D] flex items-center justify-center font-extrabold text-base shrink-0 border-2 border-[#C6FF3D]">
                {creator?.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt={creator.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{avatarChar}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-[15px] leading-tight text-[#0B1026] truncate">
                  {creator?.display_name || 'Creator Profile'}
                </div>
                <div className="text-xs font-mono-code text-[#646A8A] truncate">
                  {creator?.username ? `@${creator.username}` : 'Registered Creator'}
                </div>
              </div>
            </div>

            {/* Network Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F6EC] text-[#15803D] text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3 text-[#15803D]" />
              Testnet
            </span>
          </div>

          {/* Wallet Address Section with 1-click Copy */}
          <div className="mt-3.5 p-3 rounded-xl bg-[#F6F7FB] border border-[#E4E7F2]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#646A8A] mb-1.5">
              <span>Connected Stellar Address</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyAddress}
                  className="px-2 py-0.5 rounded-md hover:bg-white text-[10.5px] font-bold text-[#0B1026] flex items-center gap-1 transition"
                  title="Copy full public address"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#10B981]" />
                      <span className="text-[#10B981]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#646A8A]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                {walletAddress && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-md hover:bg-white text-[#646A8A] hover:text-[#0B1026]"
                    title="View on Stellar Expert Explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="font-mono-code text-[11.5px] text-[#0B1026] break-all font-semibold leading-relaxed">
              {walletAddress || 'No wallet address'}
            </div>
          </div>

          {/* Live Balances Section (XLM, USDC, USDT) */}
          <div className="mt-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#4A5070] uppercase tracking-wider">
                Live On-Chain Balances
              </span>
              <button
                onClick={handleRefresh}
                disabled={isLoadingBalances}
                className="text-[11px] font-bold text-[#6A4CF5] hover:text-[#5233E3] flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                title="Refresh balances from Stellar Horizon"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                <span>{isLoadingBalances ? 'Syncing…' : 'Refresh'}</span>
              </button>
            </div>

            {/* Asset Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#EEF0F7]">
              {(['XLM', 'USDC', 'USDT'] as const).map((asset) => (
                <button
                  key={asset}
                  type="button"
                  onClick={() => setSelectedAsset(asset)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedAsset === asset
                      ? 'bg-white text-[#0B1026] shadow-sm'
                      : 'text-[#646A8A] hover:text-[#0B1026]'
                  }`}
                >
                  {asset === 'USDC' && <UsdcBadge size={14} />}
                  {asset === 'XLM' && <XlmBadge size={14} />}
                  {asset === 'USDT' && (
                    <span className="w-3.5 h-3.5 rounded-full bg-[#26A17B] text-white text-[9px] font-bold flex items-center justify-center">
                      ₮
                    </span>
                  )}
                  <span>{asset}</span>
                </button>
              ))}
            </div>

            {/* Balance Card Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* XLM Box */}
              <div
                onClick={() => setSelectedAsset('XLM')}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  selectedAsset === 'XLM'
                    ? 'border-[#6A4CF5] bg-[#F4F1FF]'
                    : 'border-[#E4E7F2] bg-white hover:bg-[#F6F7FB]'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#646A8A]">
                  <XlmBadge size={12} />
                  <span>XLM</span>
                </div>
                <div className="mt-1 font-mono-code font-bold text-xs text-[#0B1026] truncate" title={balances.XLM}>
                  {formatAssetAmount(balances.XLM)}
                </div>
              </div>

              {/* USDC Box */}
              <div
                onClick={() => setSelectedAsset('USDC')}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  selectedAsset === 'USDC'
                    ? 'border-[#6A4CF5] bg-[#F4F1FF]'
                    : 'border-[#E4E7F2] bg-white hover:bg-[#F6F7FB]'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#646A8A]">
                  <UsdcBadge size={12} />
                  <span>USDC</span>
                </div>
                <div className="mt-1 font-mono-code font-bold text-xs text-[#0B1026] truncate" title={balances.USDC}>
                  {formatAssetAmount(balances.USDC)}
                </div>
              </div>

              {/* USDT Box */}
              <div
                onClick={() => setSelectedAsset('USDT')}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  selectedAsset === 'USDT'
                    ? 'border-[#6A4CF5] bg-[#F4F1FF]'
                    : 'border-[#E4E7F2] bg-white hover:bg-[#F6F7FB]'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#646A8A]">
                  <span className="w-3 h-3 rounded-full bg-[#26A17B] text-white text-[8px] font-bold flex items-center justify-center">
                    ₮
                  </span>
                  <span>USDT</span>
                </div>
                <div className="mt-1 font-mono-code font-bold text-xs text-[#0B1026] truncate" title={balances.USDT}>
                  {formatAssetAmount(balances.USDT)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Links */}
          <div className="mt-3.5 pt-3 border-t border-[#EEF0F7] space-y-1">
            {onNavigateToDashboard && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToDashboard();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#0B1026] hover:bg-[#F6F7FB] flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <StarFourPoint className="w-3.5 h-3.5" color="#6A4CF5" />
                  <span>Creator Dashboard</span>
                </div>
                <span className="text-[11px] text-[#646A8A]">Overview →</span>
              </button>
            )}

            {onNavigateToWidgets && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToWidgets();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#0B1026] hover:bg-[#F6F7FB] flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>My Tip Links & Widgets</span>
                </div>
                <span className="text-[11px] text-[#646A8A]">Manage →</span>
              </button>
            )}

            {onNavigateToSettings && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToSettings();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#0B1026] hover:bg-[#F6F7FB] flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-[#646A8A]" />
                  <span>Account & Profile Settings</span>
                </div>
                <span className="text-[11px] text-[#646A8A]">Edit →</span>
              </button>
            )}

            {/* Logout / Disconnect Button */}
            <button
              onClick={handleLogout}
              className="w-full mt-1 px-3 py-2 rounded-xl text-xs font-bold text-[#E5484D] hover:bg-[#FDF2F2] flex items-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect & Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
