/**
 * StarTip Backend REST API Client
 */

export interface CreatorProfile {
  id?: number;
  wallet_address: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  banner_url?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  receiving_wallet_address: string;
  supported_assets: string[];
  widget_config?: WidgetConfig;
  widgets?: WidgetConfig[];
  created_at?: string;
}

export interface WidgetConfig {
  id?: number;
  name?: string;
  slug?: string;
  widget_title: string;
  welcome_message: string;
  avatar_url?: string;
  banner_url?: string;
  theme: 'dark' | 'light' | 'midnight' | 'cyber';
  primary_color: string;
  preset_amounts_xlm: number[];
  preset_amounts_usdc: number[];
  preset_amounts_usdt?: number[];
  allow_custom_amount: boolean;
  allow_supporter_message: boolean;
  filter_remarks?: boolean;
  banned_words?: string[];
  filter_action?: 'mask' | 'block';
  overlay_token: string;
  alert_sound_enabled: boolean;
  alert_duration_seconds: number;
  is_default?: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardMetrics {
  total_xlm_tips: string | number;
  total_usdc_tips: string | number;
  total_tips_count: number;
  tips_today_count: number;
  tips_today_xlm: string | number;
  tips_today_usdc: string | number;
  recent_tips: Array<{
    id: string;
    supporter_name: string;
    supporter_wallet: string;
    asset_code: string;
    amount: string;
    message: string;
    stellar_tx_hash: string;
    created_at: string;
  }>;
  top_supporters: Array<{
    supporter_name: string;
    supporter_wallet: string;
    total_amount: string;
    asset_code: string;
    tips_count: number;
  }>;
  biggest_tip?: {
    id: string;
    supporter_name: string;
    amount: string;
    asset_code: string;
    message: string;
    stellar_tx_hash?: string;
    created_at: string;
  } | null;
  widget_status: {
    is_active: boolean;
    theme: string;
    primary_color: string;
    overlay_token: string;
  };
}

export interface WalletBalanceResponse {
  address: string;
  network: string;
  balances: {
    XLM: string;
    USDC: string;
    USDT: string;
    [key: string]: string;
  };
  cached: boolean;
}

export interface TipHistoryItem {
  id: number;
  reference_id: string;
  creator_username: string;
  creator_display_name: string;
  supporter_wallet: string;
  supporter_name: string;
  message: string;
  asset_code: 'XLM' | 'USDC' | 'USDT';
  amount: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed' | 'rejected';
  stellar_tx_hash: string | null;
  stellar_explorer_url: string | null;
  ledger_sequence?: number | null;
  ledger_closed_at?: string | null;
  widget_id?: number | null;
  widget_name?: string | null;
  created_at: string;
}

export interface EmbedCodeResponse {
  creator_username: string;
  widget_name?: string;
  widget_slug?: string;
  direct_link: string;
  iframe_code: string;
  javascript_code: string;
  overlay_url: string;
}

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('startip_session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractErrorMessage(errJson: any, status: number): string {
  if (!errJson) return `Request failed with status ${status}`;
  if (typeof errJson === 'string') return errJson;

  let target = errJson.error?.detail ?? errJson.error ?? errJson.detail ?? errJson;

  if (target && typeof target === 'object' && target.detail && typeof target.detail !== 'object') {
    target = target.detail;
  }

  if (typeof target === 'string') return target;

  if (Array.isArray(target)) {
    return target.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(' ');
  }

  if (typeof target === 'object' && target !== null) {
    const messages: string[] = [];
    for (const [key, val] of Object.entries(target)) {
      if (key === 'type' || key === 'status_code' || key === 'success') continue;
      const formattedKey =
        key === 'non_field_errors' || key === 'detail' || key === 'error' ? '' : `${key.replace(/_/g, ' ')}: `;
      if (Array.isArray(val)) {
        messages.push(`${formattedKey}${val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}`);
      } else if (typeof val === 'string') {
        messages.push(`${formattedKey}${val}`);
      } else if (val && typeof val === 'object') {
        messages.push(`${formattedKey}${extractErrorMessage(val, status)}`);
      }
    }
    if (messages.length > 0) {
      return messages.join('. ');
    }
  }

  try {
    return JSON.stringify(errJson);
  } catch {
    return `Request failed with status ${status}`;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      errorDetail = extractErrorMessage(errJson, res.status);
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Wallet Authentication ---
  async getAuthChallenge(walletAddress: string): Promise<{
    wallet_address: string;
    nonce: string;
    message_to_sign: string;
    expires_at: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/challenge/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
    return handleResponse(res);
  },

  async verifyAuthSignature(params: {
    wallet_address: string;
    nonce: string;
    signature: string;
  }): Promise<{
    token: string;
    wallet_address: string;
    expires_at: string;
    is_registered: boolean;
    username: string | null;
  }> {
    const res = await fetch(`${API_BASE}/auth/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await handleResponse<{
      token: string;
      wallet_address: string;
      expires_at: string;
      is_registered: boolean;
      username: string | null;
    }>(res);
    if (data.token) {
      localStorage.setItem('startip_session_token', data.token);
      localStorage.setItem('startip_wallet_address', data.wallet_address);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
    } finally {
      localStorage.removeItem('startip_session_token');
      localStorage.removeItem('startip_wallet_address');
    }
  },

  // --- Creator Profile & Onboarding ---
  async getMe(): Promise<CreatorProfile> {
    const res = await fetch(`${API_BASE}/creators/me/`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<CreatorProfile>(res);
  },

  async registerCreator(payload: {
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    website_url?: string;
    receiving_wallet_address?: string;
    supported_assets?: string[];
  }): Promise<CreatorProfile> {
    const res = await fetch(`${API_BASE}/creators/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<CreatorProfile>(res);
  },

  async updateProfile(payload: Partial<CreatorProfile>): Promise<CreatorProfile> {
    const res = await fetch(`${API_BASE}/creators/me/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<CreatorProfile>(res);
  },

  async getWalletBalance(address?: string): Promise<WalletBalanceResponse> {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    const res = await fetch(`${API_BASE}/wallet/balance/${query}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<WalletBalanceResponse>(res);
  },

  async getPublicCreator(username: string, widget?: string): Promise<CreatorProfile> {
    const query = widget ? `?widget=${encodeURIComponent(widget)}` : '';
    const res = await fetch(`${API_BASE}/creators/${encodeURIComponent(username)}/${query}`);
    return handleResponse<CreatorProfile>(res);
  },

  // --- Multi-Widget & Tip Links ---
  async getWidgets(): Promise<WidgetConfig[]> {
    const res = await fetch(`${API_BASE}/creators/me/widgets/`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<WidgetConfig[]>(res);
  },

  async createWidget(payload: Partial<WidgetConfig>): Promise<WidgetConfig> {
    const res = await fetch(`${API_BASE}/creators/me/widgets/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<WidgetConfig>(res);
  },

  async updateWidget(id: number, payload: Partial<WidgetConfig>): Promise<WidgetConfig> {
    const res = await fetch(`${API_BASE}/creators/me/widgets/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<WidgetConfig>(res);
  },

  async deleteWidget(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/creators/me/widgets/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // --- Dashboard & Analytics ---
  async getDashboard(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/creators/me/dashboard/`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<DashboardMetrics>(res);
  },

  async updateWidgetConfig(payload: Partial<WidgetConfig>, widgetId?: number): Promise<WidgetConfig> {
    const query = widgetId ? `?widget_id=${widgetId}` : '';
    const res = await fetch(`${API_BASE}/creators/me/widget-config/${query}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<WidgetConfig>(res);
  },

  async getEmbedCodes(username: string, widgetIdOrSlug?: string | number): Promise<EmbedCodeResponse> {
    const query = widgetIdOrSlug ? `?widget=${encodeURIComponent(String(widgetIdOrSlug))}` : '';
    const res = await fetch(`${API_BASE}/creators/${encodeURIComponent(username)}/embed-code/${query}`);
    return handleResponse<EmbedCodeResponse>(res);
  },

  // --- Payments Engine ---
  async createPaymentRequest(payload: {
    creator_username: string;
    asset_code: 'XLM' | 'USDC' | 'USDT';
    amount: number | string;
    supporter_name?: string;
    message?: string;
    supporter_wallet?: string;
    widget_id?: number;
    widget_slug?: string;
  }): Promise<{
    reference_id: string;
    creator_username: string;
    creator_display_name: string;
    recipient_address: string;
    asset_code: string;
    amount: string;
    supporter_name: string;
    message: string;
    status: string;
    created_at: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/create-request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async buildTransactionXDR(payload: {
    reference_id: string;
    supporter_wallet: string;
  }): Promise<{
    reference_id: string;
    unsigned_xdr: string;
    network_passphrase: string;
    recipient_address: string;
    amount: string;
    asset_code: string;
    estimated_network_fee_stroops: number;
  }> {
    const res = await fetch(`${API_BASE}/payments/build-xdr/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async verifyPayment(payload: {
    reference_id: string;
    stellar_tx_hash: string;
  }): Promise<TipHistoryItem> {
    const res = await fetch(`${API_BASE}/payments/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<TipHistoryItem>(res);
  },

  async getTipHistory(params?: {
    asset?: string;
    status?: string;
    widget_id?: string | number;
    search?: string;
  }): Promise<TipHistoryItem[]> {
    const query = new URLSearchParams();
    if (params?.asset && params.asset !== 'ALL') query.set('asset', params.asset);
    if (params?.status) query.set('status', params.status);
    if (params?.widget_id && params.widget_id !== 'ALL') query.set('widget_id', String(params.widget_id));
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/payments/tips/?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<TipHistoryItem[]>(res);
  },

  async getCreatorTips(_handleOrWallet?: string): Promise<TipHistoryItem[]> {
    try {
      const history = await this.getTipHistory({ status: 'confirmed' });
      return Array.isArray(history) ? history : [];
    } catch (e) {
      console.warn('Failed to fetch creator tips for diffing:', e);
      return [];
    }
  },

  // --- Alerts & Overlay ---
  async triggerTestAlert(payload: {
    overlay_token: string;
    amount?: string;
    asset_code?: string;
    supporter_name?: string;
    message?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/alerts/test/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // --- OpenAI Message Moderation & Thank-You ---
  async moderateMessage(message: string): Promise<{
    is_safe: boolean;
    flagged_categories: string[];
    clean_message: string;
    engine: string;
  }> {
    const res = await fetch(`${API_BASE}/ai/moderate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return handleResponse(res);
  },

  async generateThankYouNote(payload: {
    creator_name: string;
    supporter_name?: string;
    amount: string;
    asset_code: string;
    supporter_message?: string;
    tone?: 'warm' | 'playful' | 'formal';
  }): Promise<{ thank_you_note: string; tone: string }> {
    const res = await fetch(`${API_BASE}/ai/generate-thank-you/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // --- Image Upload ---
  async uploadImage(file: File): Promise<{
    success: boolean;
    url: string;
    filename: string;
    size?: number;
  }> {
    const formData = new FormData();
    formData.append('image', file);
    const headers: Record<string, string> = {};
    const auth = getAuthHeader();
    if (auth.Authorization) {
      headers['Authorization'] = auth.Authorization;
    }
    const res = await fetch(`${API_BASE}/upload/image/`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  // --- System Health ---
  async getHealth(): Promise<{
    status: string;
    database: string;
    stellar_network: string;
    stellar_horizon: string;
    version: string;
  }> {
    const res = await fetch(`${API_BASE}/health/`);
    return handleResponse(res);
  },
};
