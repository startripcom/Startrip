import React from 'react';

export function StarFourPoint({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 1.8L14.85 9.15L22.2 12L14.85 14.85L12 22.2L9.15 14.85L1.8 12L9.15 9.15L12 1.8Z"
        fill={color}
      />
    </svg>
  );
}

export function StellarNetworkIcon({ className = "w-3.5 h-3.5", color = "#0B1026" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="2.2" fill={color} stroke={color} strokeWidth="1.1" />
      <ellipse
        cx="8"
        cy="8"
        rx="6.5"
        ry="2.6"
        transform="rotate(-22 8 8)"
        stroke={color}
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function UsdcBadge({ size = 18 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex items-center justify-center rounded-full bg-[#2775CA] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.35)] text-white font-extrabold text-[11px] leading-none shrink-0"
    >
      $
    </span>
  );
}

export function XlmBadge({ size = 18 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex items-center justify-center rounded-full bg-[#0B1026] shadow-[inset_0_0_0_1.5px_rgba(198,255,61,0.35)] shrink-0"
    >
      <StarFourPoint className="w-2.5 h-2.5" color="#C6FF3D" />
    </span>
  );
}

export function WalletLogo({
  name,
  size = 30,
}: {
  name: 'freighter' | 'lobstr' | 'xbull' | 'albedo' | 'hana' | 'walletconnect';
  size?: number;
}) {
  const radius = size >= 40 ? 'rounded-[12px]' : size >= 28 ? 'rounded-[8px]' : 'rounded-[6px]';

  if (name === 'freighter') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`${radius} bg-gradient-to-br from-[#6A4CF5] to-[#3B1FA8] flex items-center justify-center shrink-0 shadow-inner`}
      >
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none">
          <path d="M5 7H19L16 12H9L5 7Z" fill="#FFFFFF" />
          <path d="M7 14H15L13 18H5L7 14Z" fill="#C6FF3D" />
        </svg>
      </div>
    );
  }
  if (name === 'lobstr') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`${radius} bg-gradient-to-br from-[#FF5B37] to-[#D92B04] flex items-center justify-center shrink-0 shadow-inner`}
      >
        <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
          <circle cx="12" cy="12" r="7" stroke="#FFFFFF" strokeWidth="2.4" />
          <path d="M9 12L11.5 14.5L15.5 9.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (name === 'xbull') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`${radius} bg-gradient-to-br from-[#1C2340] to-[#0B1026] border border-white/15 flex items-center justify-center shrink-0`}
      >
        <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
          <path d="M5 6L12 13L19 6" stroke="#C6FF3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 18L12 13L17 18" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (name === 'albedo') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`${radius} bg-gradient-to-br from-[#00C2FF] to-[#0066FF] flex items-center justify-center shrink-0`}
      >
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none">
          <polygon points="12,4 20,19 4,19" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
          <circle cx="12" cy="14" r="2" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }
  if (name === 'hana') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`${radius} bg-[#FDECEC] border border-[#F8C8C8] flex items-center justify-center shrink-0`}
      >
        <span className="font-sans font-extrabold text-[16px] leading-none text-[#A61B1B]">
          H
        </span>
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={`${radius} bg-gradient-to-br from-[#3B99FC] to-[#1D68D8] flex items-center justify-center shrink-0`}
    >
      <svg viewBox="0 0 24 24" className="w-[66%] h-[66%]" fill="none">
        <path
          d="M6.5 9.5C9.5 6.5 14.5 6.5 17.5 9.5M4 12.5L7.5 16L12 11.5L16.5 16L20 12.5"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function CornerHandles({
  variant = 'white',
  size = 9,
}: {
  variant?: 'white' | 'dark' | 'bordered';
  size?: number;
}) {
  const baseClass =
    variant === 'white'
      ? 'bg-white'
      : variant === 'dark'
      ? 'bg-[#0B1026]'
      : 'bg-white border-[1.5px] border-[#0B1026]';
  const offset = -Math.floor(size / 2);

  return (
    <>
      <span
        style={{ width: size, height: size, top: offset, left: offset }}
        className={`

 pointer-events-none absolute rounded-[2px] z-20 ${baseClass}`}
      />
      <span
        style={{ width: size, height: size, top: offset, right: offset }}
        className={`pointer-events-none absolute rounded-[2px] z-20 ${baseClass}`}
      />
      <span
        style={{ width: size, height: size, bottom: offset, left: offset }}
        className={`pointer-events-none absolute rounded-[2px] z-20 ${baseClass}`}
      />
      <span
        style={{ width: size, height: size, bottom: offset, right: offset }}
        className={`pointer-events-none absolute rounded-[2px] z-20 ${baseClass}`}
      />
    </>
  );
}

export function StellarCoinsGraphic({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative w-[280px] h-[155px] mx-auto select-none">
        {/* USDC Coin */}
        <div
          className="absolute left-[44px] top-0 w-[126px] h-[126px] rounded-full flex items-center justify-center z-10"
          style={{
            background: 'radial-gradient(50% 50% at 50% 50%, #7FB4FF 0%, #2775CA 46%, #164E8F 100%)',
            boxShadow:
              '0px 18px 30px rgba(39, 117, 202, 0.35), inset -6px -8px 14px rgba(0, 0, 0, 0.25), inset 5px 6px 11px rgba(255, 255, 255, 0.35)',
          }}
        >
          <div className="w-[88px] h-[88px] rounded-full border-[3.6px] border-white/90 flex items-center justify-center">
            <span className="font-extrabold text-[40px] leading-none text-white">$</span>
          </div>
        </div>

        {/* XLM Coin */}
        <div
          className="absolute left-[128px] top-[38px] w-[110px] h-[110px] rounded-full flex flex-col items-center justify-center gap-0.5 z-20"
          style={{
            background: 'radial-gradient(50% 50% at 50% 50%, #3A4272 0%, #141A3A 50%, #05071A 100%)',
            boxShadow:
              '0px 0px 36px rgba(198, 255, 61, 0.55), 0px 0px 0px 2px rgba(198, 255, 61, 0.55), inset 6px 7px 12px rgba(255, 255, 255, 0.12), inset -8px -9px 16px rgba(0, 0, 0, 0.4)',
          }}
        >
          <span className="font-mono-code font-semibold text-[16px] leading-[21px] tracking-[0.6px] text-[#C6FF3D]">
            XLM
          </span>
          <span className="font-bold text-[6.5px] leading-[8px] tracking-[0.9px] text-[#C6FF3D]/70 uppercase">
            STELLAR
          </span>
        </div>

        {/* Sparkle 1 */}
        <div className="absolute left-[26px] top-[102px] z-30">
          <StarFourPoint className="w-4 h-4" color="#8FD400" />
        </div>
        {/* Sparkle 2 */}
        <div className="absolute left-[242px] top-[12px] z-30">
          <StarFourPoint className="w-3 h-3" color="#4A2FC2" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-[360px] h-[250px] select-none shrink-0">
      {/* USDC Coin */}
      <div
        className="absolute left-[20px] top-[10px] w-[206px] h-[206px] rounded-full flex items-center justify-center z-10"
        style={{
          background: 'radial-gradient(50% 50% at 50% 50%, #7FB4FF 0%, #2775CA 46%, #164E8F 100%)',
          boxShadow:
            '0px 30px 50px rgba(39, 117, 202, 0.35), inset -10px -14px 24px rgba(0, 0, 0, 0.25), inset 8px 10px 18px rgba(255, 255, 255, 0.35)',
        }}
      >
        <div className="w-[143px] h-[143px] rounded-full border-[6px] border-white/90 flex items-center justify-center">
          <span className="font-extrabold text-[66px] leading-[84px] text-white">$</span>
        </div>
      </div>

      {/* XLM Coin */}
      <div
        className="absolute left-[154px] top-[74px] w-[178px] h-[178px] rounded-full flex flex-col items-center justify-center gap-0.5 z-20"
        style={{
          background: 'radial-gradient(50% 50% at 50% 50%, #3A4272 0%, #141A3A 50%, #05071A 100%)',
          boxShadow:
            '0px 0px 0px 3px rgba(198, 255, 61, 0.55), 0px 0px 50px rgba(198, 255, 61, 0.55), inset -10px -12px 22px rgba(0, 0, 0, 0.4), inset 8px 10px 16px rgba(255, 255, 255, 0.12)',
        }}
      >
        <span className="font-mono-code font-semibold text-[26px] leading-[34px] tracking-[1px] text-[#C6FF3D]">
          XLM
        </span>
        <span className="font-bold text-[10px] leading-[13px] tracking-[1.5px] text-[#C6FF3D]/70 uppercase">
          STELLAR
        </span>
      </div>

      {/* Sparkle 1 */}
      <div className="absolute left-0 top-[178px] z-30">
        <StarFourPoint className="w-[26px] h-[26px]" color="#8FD400" />
      </div>
      {/* Sparkle 2 */}
      <div className="absolute left-[338px] top-[32px] z-30">
        <StarFourPoint className="w-[18px] h-[18px]" color="#4A2FC2" />
      </div>
    </div>
  );
}
