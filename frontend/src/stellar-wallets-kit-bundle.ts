import { 
  StellarWalletsKit, 
  Networks, 
  SwkAppDarkTheme, 
  SwkAppLightTheme,
  KitEventType,
  ModuleType
} from '@creit.tech/stellar-wallets-kit';
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule, ALBEDO_ID } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule, XBULL_ID } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { LobstrModule, LOBSTR_ID } from '@creit.tech/stellar-wallets-kit/modules/lobstr';

export class TestnetFaucetModule {
  public moduleType = ModuleType.HOT_WALLET;
  public productId = "testnet_faucet";
  public productName = "Instant Testnet Faucet";
  public productUrl = "https://stellar.org";
  public productIcon = "https://stellar.creit.tech/wallet-icons/albedo.png";

  public activeKeypair: any = null;

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async getAddress(): Promise<{ address: string }> {
    const sdk = (window as any).StellarSdk;
    if (!sdk) {
      throw new Error("Stellar SDK is loading, please retry in a moment.");
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

  public async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<{ signedTxXdr: string }> {
    if (!this.activeKeypair) {
      throw new Error("No active keypair in Testnet Faucet module");
    }
    const sdk = (window as any).StellarSdk;
    const passphrase = opts?.networkPassphrase || "Test SDF Network ; September 2015";
    const tx = new sdk.Transaction(xdr, passphrase);
    tx.sign(this.activeKeypair);
    return { signedTxXdr: tx.toXDR() };
  }
}

export function initDefaultStellarKit() {
  if (typeof StellarWalletsKit === 'undefined') return;
  try {
    const modules: any[] = [];
    modules.push(new FreighterModule());
    modules.push(new AlbedoModule());
    modules.push(new xBullModule());
    modules.push(new LobstrModule());
    modules.push(new TestnetFaucetModule());

    StellarWalletsKit.init({
      modules: modules,
      network: Networks.TESTNET,
      theme: SwkAppDarkTheme
    });
    console.log('[StarTip] Official StellarWalletsKit initialized with all modules');
  } catch (err) {
    console.warn('[StarTip] StellarWalletsKit init notice:', err);
  }
}

(window as any).StellarWalletsKit = StellarWalletsKit;
(window as any).StellarWalletsKitNetworks = Networks;
(window as any).SwkAppDarkTheme = SwkAppDarkTheme;
(window as any).SwkAppLightTheme = SwkAppLightTheme;
(window as any).KitEventType = KitEventType;
(window as any).FreighterModule = FreighterModule;
(window as any).AlbedoModule = AlbedoModule;
(window as any).xBullModule = xBullModule;
(window as any).LobstrModule = LobstrModule;
(window as any).TestnetFaucetModule = TestnetFaucetModule;
(window as any).initDefaultStellarKit = initDefaultStellarKit;
(window as any).FREIGHTER_ID = FREIGHTER_ID;
(window as any).ALBEDO_ID = ALBEDO_ID;
(window as any).XBULL_ID = XBULL_ID;
(window as any).LOBSTR_ID = LOBSTR_ID;
