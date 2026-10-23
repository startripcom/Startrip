import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useSearchParams,
  Navigate,
} from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { DemoWidgetPage } from './components/DemoWidgetPage';
import { CreatorDashboard } from './components/CreatorDashboard';
import { WalletOnboardingModal } from './components/WalletOnboardingModal';
import { PublicTipPage } from './components/PublicTipPage';
import { WalletProvider, useWallet } from './context/WalletContext';
import { Wallet, ArrowUpRight } from 'lucide-react';

function LandingRoute({ onOpenWalletModal }: { onOpenWalletModal: () => void }) {
  const navigate = useNavigate();
  return (
    <LandingPage
      onOpenDemo={() => {
        navigate('/demo');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onOpenDashboard={() => {
        navigate('/dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onOpenWalletModal={onOpenWalletModal}
    />
  );
}

function DashboardRoute({ onOpenWalletModal }: { onOpenWalletModal: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || undefined) as any;
  const { isAuthenticated, connectWallet, isConnecting } = useWallet();
  const token = typeof window !== 'undefined' ? localStorage.getItem('startip_session_token') : null;

  // If not authenticated and no token in localStorage, show a clean authentication prompt
  if (!isAuthenticated && !token) {
    return (
      <div className="min-h-screen bg-[#070A1A] flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-[460px] w-full rounded-[28px] bg-[#0E1333] border border-white/15 p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-[#C6FF3D] text-[#0B1026] flex items-center justify-center mx-auto">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.5px]">Creator Dashboard</h2>
            <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
              Connect your verified Stellar wallet to view your metrics, customize your widget, and manage stream alerts.
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                const res = await connectWallet();
                if (res && !res.is_registered) {
                  onOpenWalletModal();
                }
              } catch (e) {
                // error handled in context
              }
            }}
            disabled={isConnecting}
            className="w-full h-[52px] rounded-full bg-[#C6FF3D] hover:brightness-95 text-[#0B1026] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Connect Wallet with Stellar Wallets Kit</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-white/50 hover:text-white transition cursor-pointer underline"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CreatorDashboard
      mode="full"
      initialTab={tabParam}
      onOpenDemo={() => {
        navigate('/demo');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onBackToLanding={() => {
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    />
  );
}

function DemoRoute({ onOpenWalletModal }: { onOpenWalletModal: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const creator = searchParams.get('creator') || 'tobibuilds';

  return (
    <DemoWidgetPage
      targetCreator={creator}
      onBackToHome={() => {
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onStartForFree={onOpenWalletModal}
    />
  );
}

function CreatorSlugRoute() {
  return <PublicTipPage />;
}

function SignupRoute() {
  const navigate = useNavigate();
  return (
    <WalletOnboardingModal
      isOpen={true}
      isStandalonePage={true}
      onClose={() => navigate('/')}
      onSuccess={() => {
        navigate('/dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    />
  );
}

function AppContent() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { needsRegistration } = useWallet();
  const navigate = useNavigate();

  // If newly connected wallet requires registration, open profile modal
  useEffect(() => {
    if (needsRegistration) {
      setWalletModalOpen(true);
    }
  }, [needsRegistration]);

  return (
    <div className="min-h-screen bg-[#070A1A]">
      <Routes>
        <Route path="/" element={<LandingRoute onOpenWalletModal={() => setWalletModalOpen(true)} />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="/onboarding" element={<SignupRoute />} />
        <Route path="/dashboard" element={<DashboardRoute onOpenWalletModal={() => setWalletModalOpen(true)} />} />
        <Route path="/demo" element={<DemoRoute onOpenWalletModal={() => setWalletModalOpen(true)} />} />
        <Route path="/tip/:creatorUsername" element={<CreatorSlugRoute />} />
        <Route path="/:creatorUsername" element={<CreatorSlugRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <WalletOnboardingModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onSuccess={() => {
          setWalletModalOpen(false);
          navigate('/dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI exception in StarTip:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A1A] flex items-center justify-center p-6 text-white text-center">
          <div className="max-w-[480px] w-full rounded-3xl bg-[#0E1333] border border-white/15 p-8 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C6FF3D]/20 text-[#C6FF3D] flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-xs text-white/60 leading-relaxed font-mono-code bg-black/40 p-3 rounded-lg overflow-x-auto text-left">
              {this.state.error?.message || 'Unknown runtime error'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="px-6 py-2.5 rounded-full bg-[#C6FF3D] text-[#0B1026] text-xs font-bold hover:brightness-95 transition cursor-pointer"
            >
              Reload StarTip
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </WalletProvider>
    </ErrorBoundary>
  );
}
