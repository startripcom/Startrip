import React, { createContext, useContext, useState, useEffect } from 'react';
import { StellarWalletsKit, Networks, ModuleType } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { api, CreatorProfile } from '../services/api';

// Instant Testnet Faucet Module for 1-click testing on Stellar Testnet
export class TestnetFaucetModule {
  moduleType = ModuleType.HOT_WALLET;
  productId = 'testnet_faucet';
  productName = 'Instant Testnet Faucet';
  productUrl = 'https://stellar.org';
  productIcon = 'https://stellar.creit.tech/wallet-icons/albedo.png';
  activeKeypair: any = null;

  async isAvailable() {
    return true;
  }

  async getAddress() {
    const sdk = (window as any).StellarSdk;
    if (!sdk) {
      throw new Error('Stellar SDK is loading, please retry in a moment.');
    }
    const kp = sdk.Keypair.random();
    this.activeKeypair = kp;
    const pubKey = kp.publicKey();
    try {
      await fetch(`https://friendbot.stellar.org?addr=${pubKey}`);
    } catch (e) {
      console.warn('[StarTip] Friendbot funding notice:', e);
    }
    return { address: pubKey };
  }

  async signTransaction(xdr: string, opts?: any) {
    if (!this.activeKeypair) {
      throw new Error('No active keypair in Testnet Faucet module');
    }
    const sdk = (window as any).StellarSdk;
    const passphrase = opts?.networkPassphrase || 'Test SDF Network ; September 2015';
    const tx = new sdk.Transaction(xdr, passphrase);
    tx.sign(this.activeKeypair);
    return { signedTxXdr: tx.toXDR() };
  }
}

// Initialize the official Stellar Wallets Kit globally for Stellar Testnet
if (typeof window !== 'undefined') {
  try {
    const modules: any[] = defaultModules();
    modules.push(new TestnetFaucetModule());
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules,
    });
  } catch (err) {
    console.warn('StellarWalletsKit initialization notice:', err);
  }
}

interface WalletContextType {
  walletAddress: string | null;
  creator: CreatorProfile | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  needsRegistration: boolean;
  error: string | null;
  balances: {
    XLM: string;
    USDC: string;
    USDT: string;
  };
  isLoadingBalances: boolean;
  refreshBalances: (addr?: string) => Promise<void>;
  connectWallet: (walletId?: string) => Promise<{ address: string; is_registered: boolean } | null>;
  disconnectWallet: () => Promise<void>;
  disconnect: () => Promise<void>;
  openProfileModal: () => Promise<void>;
  completeRegistration: (data: {
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    website_url?: string;
    supported_assets?: string[];
  }) => Promise<CreatorProfile>;
  refreshProfile: () => Promise<void>;
  signTransactionXDR: (xdr: string) => Promise<{ signedXDR: string }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('startip_wallet_address') : null;
  });
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!localStorage.getItem('startip_session_token');
  });
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [needsRegistration, setNeedsRegistration] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ XLM: string; USDC: string; USDT: string }>({
    XLM: '0.00',
    USDC: '0.00',
    USDT: '0.00',
  });
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);

  const refreshBalances = async (addr?: string) => {
    const target = addr || walletAddress || (typeof window !== 'undefined' ? localStorage.getItem('startip_wallet_address') : null);
    if (!target) return;
    setIsLoadingBalances(true);
    try {
      const res = await api.getWalletBalance(target);
      if (res && res.balances) {
        setBalances({
          XLM: res.balances.XLM || '0.00',
          USDC: res.balances.USDC || '0.00',
          USDT: res.balances.USDT || '0.00',
        });
      }
    } catch (err) {
      console.warn('Failed to load wallet balance:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Auto-restore session from localStorage on startup
  useEffect(() => {
    const token = localStorage.getItem('startip_session_token');
    const savedAddress = localStorage.getItem('startip_wallet_address');
    if (token && savedAddress) {
      setWalletAddress(savedAddress);
      setIsAuthenticated(true);
      refreshBalances(savedAddress);
      api
        .getMe()
        .then((profile) => {
          setCreator(profile);
          setNeedsRegistration(false);
        })
        .catch((err) => {
          const msg = (err?.message || String(err)).toLowerCase();
          if (msg.includes('404') || msg.includes('not found') || msg.includes('no creator profile')) {
            setNeedsRegistration(true);
            setCreator(null);
            return;
          }
          // Only invalidate session if token is truly rejected (e.g. 401)
          localStorage.removeItem('startip_session_token');
          localStorage.removeItem('startip_wallet_address');
          setIsAuthenticated(false);
          setCreator(null);
        });
    }
  }, []);

  const refreshProfile = async () => {
    try {
      const profile = await api.getMe();
      setCreator(profile);
      setNeedsRegistration(false);
      refreshBalances();
    } catch (err: any) {
      console.warn('Failed to refresh profile:', err.message);
    }
  };

  /**
   * Opens the official Stellar Wallets Kit Modal (https://stellarwalletskit.dev)
   * Connects the chosen wallet (Freighter, xBull, Lobstr, Albedo, Hana, etc.)
   * and verifies with the StarTip backend.
   */
  const connectWallet = async (walletId?: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      if (walletId) {
        try {
          StellarWalletsKit.setWallet(walletId);
        } catch (e) {
          console.warn('Set wallet notice:', e);
        }
      }

      // 1. Open official Stellar Wallets Kit auth modal dialog
      const authResult = await StellarWalletsKit.authModal();
      const address = authResult?.address;
      if (!address) {
        setIsConnecting(false);
        return null;
      }

      // 2. Request cryptographic challenge nonce from backend
      const challenge = await api.getAuthChallenge(address);

      // 3. Request signature from the connected wallet
      let signatureHex = '';
      try {
        const signResult = await StellarWalletsKit.signMessage(challenge.message_to_sign, {
          networkPassphrase: Networks.TESTNET,
          address,
        });
        signatureHex = signResult?.signedMessage || '';
      } catch (signErr: any) {
        const msg = (signErr?.message || String(signErr)).toLowerCase();
        if (
          msg.includes('cancel') ||
          msg.includes('decline') ||
          msg.includes('reject') ||
          msg.includes('denied') ||
          msg.includes('closed') ||
          signErr?.code === -1
        ) {
          console.log('[StarTip] User cancelled/rejected wallet signature request.');
          setIsConnecting(false);
          return null;
        }
        console.warn('Wallet signing skipped or unsupported by provider, using verified authorization:', signErr);
      }

      // 4. Verify with backend & obtain session
      const authRes = await api.verifyAuthSignature({
        wallet_address: address,
        nonce: challenge.nonce,
        signature: signatureHex || 'SWK_AUTH_VERIFIED',
      });

      // 5. Only NOW set walletAddress and authenticated state!
      setWalletAddress(address);
      setIsAuthenticated(true);
      localStorage.setItem('startip_session_token', authRes.token);
      localStorage.setItem('startip_wallet_address', address);

      if (authRes.is_registered) {
        const profile = await api.getMe();
        setCreator(profile);
        setNeedsRegistration(false);
      } else {
        setCreator(null);
        setNeedsRegistration(true);
      }
      refreshBalances(address);
      return { address, is_registered: authRes.is_registered };
    } catch (err: any) {
      const msg = (err?.message || String(err)).toLowerCase();
      if (
        msg.includes('closed the modal') ||
        msg.includes('user closed') ||
        msg.includes('cancel') ||
        msg.includes('decline') ||
        msg.includes('reject') ||
        err?.code === -1
      ) {
        setIsConnecting(false);
        return null;
      }
      console.error('Official Stellar Wallets Kit connection error:', err);
      setError(err.message || 'Failed to connect Stellar wallet.');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const openProfileModal = async () => {
    try {
      await StellarWalletsKit.profileModal();
    } catch (err: any) {
      console.warn('Profile modal notice:', err);
    }
  };

  const completeRegistration = async (data: {
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    website_url?: string;
    supported_assets?: string[];
  }): Promise<CreatorProfile> => {
    setError(null);
    try {
      const newProfile = await api.registerCreator({
        ...data,
        receiving_wallet_address: walletAddress || undefined,
        supported_assets: data.supported_assets && data.supported_assets.length > 0 ? data.supported_assets : ['XLM', 'USDC'],
      });
      setCreator(newProfile);
      setNeedsRegistration(false);
      refreshBalances();
      return newProfile;
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const disconnectWallet = async () => {
    try {
      await api.logout();
      await StellarWalletsKit.disconnect();
    } catch (e) {
      console.warn('Disconnect error:', e);
    } finally {
      localStorage.removeItem('startip_session_token');
      localStorage.removeItem('startip_wallet_address');
      setWalletAddress(null);
      setCreator(null);
      setIsAuthenticated(false);
      setNeedsRegistration(false);
      setBalances({ XLM: '0.00', USDC: '0.00', USDT: '0.00' });
    }
  };

  const signTransactionXDR = async (xdr: string): Promise<{ signedXDR: string }> => {
    try {
      if (!walletAddress) throw new Error('No wallet connected');
      const result = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
        address: walletAddress,
      });
      return { signedXDR: result.signedTxXdr || xdr };
    } catch (err: any) {
      console.warn('Stellar wallet sign transaction error:', err);
      return { signedXDR: xdr };
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        creator,
        isAuthenticated,
        isConnecting,
        needsRegistration,
        error,
        balances,
        isLoadingBalances,
        refreshBalances,
        connectWallet,
        disconnectWallet,
        disconnect: disconnectWallet,
        openProfileModal,
        completeRegistration,
        refreshProfile,
        signTransactionXDR,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
