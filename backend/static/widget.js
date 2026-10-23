/**
 * StarTip Universal Creator Tipping Embed Script
 * 
 * Embed options:
 * 1. Floating Button & Popup Modal (Default):
 *    <script src="https://startip.app/embed/<username>/widget.js?widget=<slug>" async></script>
 * 
 * 2. Custom Button on your site:
 *    <button data-startip-open>Tip Me</button>
 *    <!-- Optional: hide the floating corner button with ?button=false -->
 *    <script src="https://startip.app/embed/<username>/widget.js?widget=<slug>&button=false" async></script>
 *    <!-- Or trigger via JS: window.StarTip.open() -->
 * 
 * 3. Embed the Window Directly (Inline):
 *    <div id="startip-widget"></div>
 *    <script src="https://startip.app/embed/<username>/widget.js?widget=<slug>" async></script>
 *    <!-- Or specify ?mode=inline -->
 */
(function() {
  'use strict';

  function findTargetScript() {
    if (document.currentScript && !document.currentScript.hasAttribute('data-startip-loaded')) {
      return document.currentScript;
    }
    const scripts = document.querySelectorAll('script[src*="widget.js"], script[src*="/embed/"]');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (!scripts[i].hasAttribute('data-startip-loaded')) {
        return scripts[i];
      }
    }
    return scripts[scripts.length - 1] || null;
  }

  let hostDepsLoaded = false;
  function loadHostDependencies(baseUrl) {
    if (hostDepsLoaded) return;
    hostDepsLoaded = true;

    if (!window.StellarSdk) {
      const s1 = document.createElement('script');
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/stellar-sdk/12.3.0/stellar-sdk.min.js';
      s1.async = true;
      document.head.appendChild(s1);
    }
    if (!window.StellarWalletsKit) {
      const s2 = document.createElement('script');
      s2.src = `${baseUrl}/static/stellar-wallets-kit.bundle.js`;
      s2.async = true;
      s2.onload = () => {
        if (typeof window.initDefaultStellarKit === 'function') {
          window.initDefaultStellarKit();
        }
      };
      document.head.appendChild(s2);
    } else if (typeof window.initDefaultStellarKit === 'function') {
      window.initDefaultStellarKit();
    }
  }

  async function handleHostSendTip(baseUrl, iframeWindow, payload) {
    function sendStatus(text, statusType = 'info') {
      iframeWindow.postMessage({ type: 'startip:status', text, statusType }, '*');
    }

    try {
      sendStatus("Opening official Stellar Wallets Kit...", "info");

      if (typeof window.initDefaultStellarKit === 'function') {
        window.initDefaultStellarKit();
      }
      if (typeof window.StellarWalletsKit === 'undefined') {
        throw new Error("Stellar Wallets Kit library is loading. Please click Send Tip again in a moment.");
      }

      // 1. Open official Stellar Wallets Kit modal on window.top
      // Because this runs on window.top, browser extensions (Freighter, xBull, etc.) are immediately detected!
      const authResult = await window.StellarWalletsKit.authModal();
      if (!authResult || !authResult.address) {
        throw new Error("No wallet connected.");
      }

      const supporterWallet = authResult.address;
      const selectedMod = window.StellarWalletsKit.selectedModule;
      const providerName = selectedMod ? (selectedMod.productName || selectedMod.id) : "Stellar Wallet";

      sendStatus(`Connected to ${providerName}: ${supporterWallet.slice(0, 4)}...${supporterWallet.slice(-4)}. Preparing transaction...`, "info");

      // 2. Create Payment Request on Backend
      const reqPayload = {
        creator_username: payload.creatorUsername,
        asset_code: payload.asset,
        amount: payload.amount,
        supporter_name: payload.supporterName || 'Anonymous',
        message: payload.message || '',
        supporter_wallet: supporterWallet
      };
      if (payload.widgetSlug) {
        reqPayload.widget_slug = payload.widgetSlug;
      }

      const reqResp = await fetch(`${baseUrl}/api/payments/create-request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload)
      });
      const reqData = await reqResp.json();
      if (!reqResp.ok) {
        throw new Error(typeof reqData.error === 'string' ? reqData.error : (reqData.error?.detail || JSON.stringify(reqData)));
      }
      const refId = reqData.reference_id;

      // 3. Build Unsigned Transaction XDR
      sendStatus("Building Stellar transaction XDR...", "info");
      const xdrResp = await fetch(`${baseUrl}/api/payments/build-xdr/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_id: refId,
          supporter_wallet: supporterWallet
        })
      });
      const xdrData = await xdrResp.json();
      if (!xdrResp.ok) {
        throw new Error(xdrData.error || "Failed to build transaction XDR on Stellar Testnet.");
      }

      // 4. Sign Transaction via Supporter's Wallet using StellarWalletsKit
      sendStatus(`Please approve and sign the payment in ${providerName}...`, "info");
      const signResult = await window.StellarWalletsKit.signTransaction(xdrData.unsigned_xdr, {
        networkPassphrase: xdrData.network_passphrase,
        address: supporterWallet
      });

      const signedXdr = typeof signResult === 'string' ? signResult : (signResult.signedTxXdr || signResult.xdr || signResult);
      if (!signedXdr) {
        throw new Error("Transaction signing was cancelled by the wallet.");
      }

      // 5. Submit Signed Transaction to Horizon
      sendStatus("Broadcasting signed transaction to Stellar Testnet...", "info");
      const formBody = new URLSearchParams();
      formBody.append('tx', signedXdr);
      const horizonUrl = "https://horizon-testnet.stellar.org";
      const subResp = await fetch(`${horizonUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString()
      });
      const subData = await subResp.json();
      if (!subResp.ok || !subData.successful) {
        const errCodes = subData.extras?.result_codes?.transaction || subData.detail || 'Horizon rejected transaction';
        throw new Error(`Stellar Horizon submission failed: ${errCodes}`);
      }
      const onChainTxHash = subData.hash;

      // 6. Verify and Confirm on Backend
      sendStatus(`Confirmed on Stellar: <strong>${onChainTxHash.slice(0, 10)}...</strong>. Finalizing...`, "info");
      const verifyResp = await fetch(`${baseUrl}/api/payments/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_id: refId,
          stellar_tx_hash: onChainTxHash
        })
      });
      const verifyData = await verifyResp.json();
      if (!verifyResp.ok) {
        throw new Error(typeof verifyData.error === 'string' ? verifyData.error : JSON.stringify(verifyData));
      }

      iframeWindow.postMessage({
        type: 'startip:tip_success',
        txHash: onChainTxHash,
        amount: payload.amount,
        asset: payload.asset,
        explorerUrl: verifyData.stellar_explorer_url || `https://stellar.expert/explorer/testnet/tx/${onChainTxHash}`
      }, '*');

    } catch (err) {
      if (err && (err.code === -1 || (err.message && err.message.includes("closed")))) {
        sendStatus("Tip cancelled: Wallet selection modal was closed.", "info");
      } else {
        sendStatus(err.message || String(err), "error");
      }
    }
  }

  function initStarTip() {
    const scriptEl = findTargetScript();
    if (!scriptEl) return;

    // Mark as processed
    scriptEl.setAttribute('data-startip-loaded', 'true');

    let scriptSrc = scriptEl.src || '';
    let creator = scriptEl.getAttribute('data-creator') || '';
    let widgetSlug = scriptEl.getAttribute('data-widget') || '';
    let targetId = scriptEl.getAttribute('data-target') || '';
    let mode = scriptEl.getAttribute('data-mode') || ''; // 'modal' | 'inline'
    let showButton = scriptEl.getAttribute('data-button') !== 'false';
    let baseUrl = '';

    if (scriptSrc) {
      try {
        const parsedUrl = new URL(scriptSrc, window.location.href);
        baseUrl = parsedUrl.origin;

        // Path pattern: /embed/<username>/widget.js
        const pathMatch = parsedUrl.pathname.match(/\/embed\/([a-zA-Z0-9_\-\.]+)\/widget\.js/i);
        if (pathMatch && pathMatch[1] && pathMatch[1] !== 'widget') {
          if (!creator) creator = decodeURIComponent(pathMatch[1]);
        }

        // Query params
        if (!widgetSlug && parsedUrl.searchParams.has('widget')) {
          widgetSlug = parsedUrl.searchParams.get('widget') || '';
        }
        if (!creator && parsedUrl.searchParams.has('creator')) {
          creator = parsedUrl.searchParams.get('creator') || '';
        }
        if (!mode && parsedUrl.searchParams.has('mode')) {
          mode = parsedUrl.searchParams.get('mode') || '';
        }
        if (parsedUrl.searchParams.has('button') && parsedUrl.searchParams.get('button') === 'false') {
          showButton = false;
        }
        if (!targetId && parsedUrl.searchParams.has('target')) {
          targetId = parsedUrl.searchParams.get('target') || '';
        }
      } catch (err) {
        console.warn('[StarTip] Error parsing script src URL:', err);
      }
    }

    // Check server-provided defaults if available
    if (!creator && window.__STARTIP_DEFAULT_CREATOR__) {
      creator = window.__STARTIP_DEFAULT_CREATOR__;
    }
    if (!widgetSlug && window.__STARTIP_DEFAULT_WIDGET__) {
      widgetSlug = window.__STARTIP_DEFAULT_WIDGET__;
    }

    // Default baseUrl
    if (!baseUrl) {
      baseUrl = window.location.origin;
    }

    if (!creator) {
      console.error('[StarTip] Creator handle not specified. Usage: <script src="https://startip.app/embed/<username>/widget.js" async></script>');
      return;
    }

    // Preload dependencies & register host payment listener
    loadHostDependencies(baseUrl);
    if (!window.__STARTIP_SEND_TIP_LISTENER_BOUND__) {
      window.__STARTIP_SEND_TIP_LISTENER_BOUND__ = true;
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'startip:send_tip' && e.data.payload) {
          handleHostSendTip(baseUrl, e.source, e.data.payload);
        }
      });
    }

    // Build iframe URL
    let embedUrl = `${baseUrl}/embed/${encodeURIComponent(creator)}/`;
    const params = new URLSearchParams();
    if (widgetSlug && widgetSlug !== 'main' && widgetSlug !== 'default') {
      params.set('widget', widgetSlug);
    }
    const qs = params.toString();
    if (qs) {
      embedUrl += `?${qs}`;
    }

    // Determine Mode:
    // If targetId is provided or an element with #startip-widget or [data-startip-widget] exists on page,
    // OR if mode === 'inline', render inline window.
    // Otherwise, default to floating button + popup modal!
    const explicitContainer = (targetId && document.getElementById(targetId)) ||
      document.getElementById('startip-widget') ||
      document.querySelector('[data-startip-widget]');

    if (mode === 'inline' || (explicitContainer && mode !== 'modal' && mode !== 'float')) {
      createInlineWidget(scriptEl, explicitContainer, creator, embedUrl);
    } else {
      createPopupModalWidget(creator, embedUrl, showButton);
    }
  }

  function createInlineWidget(scriptEl, container, creator, embedUrl) {
    if (!container) {
      container = document.createElement('div');
      container.className = 'startip-embed-container';
      container.style.cssText = 'width: 100%; max-width: 400px; margin: 16px auto; display: flex; justify-content: center; box-sizing: border-box;';

      if (scriptEl && scriptEl.parentNode && scriptEl.parentNode !== document.head) {
        scriptEl.parentNode.insertBefore(container, scriptEl.nextSibling);
      } else {
        if (document.body) {
          document.body.appendChild(container);
        } else {
          document.addEventListener('DOMContentLoaded', () => document.body.appendChild(container));
        }
      }
    }

    const iframeId = 'startip-iframe-' + Math.random().toString(36).substring(2, 9);
    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.src = embedUrl;
    iframe.style.cssText = 'width: 100%; max-width: 358px; height: 680px; min-height: 600px; border: none; border-radius: 28px; box-shadow: 0px 24px 56px rgba(11, 16, 38, 0.16), 0px 2px 4px rgba(11, 16, 38, 0.06); background: transparent; display: block; overflow: hidden;';
    iframe.setAttribute('title', `Tip ${creator} on StarTip`);
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', 'clipboard-write; payment');

    // Auto-resize handler
    function handleResize(e) {
      if (e.data && e.data.type === 'startip:resize' && e.data.height) {
        if (e.source === iframe.contentWindow) {
          iframe.style.height = `${Math.max(e.data.height, 580) + 12}px`;
        }
      }
    }
    window.addEventListener('message', handleResize);

    container.innerHTML = '';
    container.appendChild(iframe);
  }

  function createPopupModalWidget(creator, embedUrl, showFloatingButton) {
    // Avoid duplicate initialization
    if (document.getElementById(`startip-modal-overlay-${creator}`)) return;

    // Inject styles
    const style = document.createElement('style');
    style.id = `startip-styles-${creator}`;
    style.textContent = `
      .startip-float-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999998;
        background: #0B1026;
        color: #FFFFFF;
        font-family: 'Onest', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 15px;
        font-weight: 700;
        padding: 12px 22px;
        border-radius: 999px;
        box-shadow: 0 12px 32px rgba(11, 16, 38, 0.35), 0 0 18px rgba(198, 255, 61, 0.35);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
        border: 1.5px solid rgba(198, 255, 61, 0.5);
        box-sizing: border-box;
      }
      .startip-float-btn:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 16px 36px rgba(11, 16, 38, 0.45), 0 0 26px rgba(198, 255, 61, 0.7);
        border-color: #C6FF3D;
      }
      .startip-float-btn:active {
        transform: translateY(0) scale(0.98);
      }
      .startip-float-icon {
        color: #C6FF3D;
        font-size: 16px;
        line-height: 1;
        display: flex;
        align-items: center;
      }
      @media (max-width: 600px) {
        .startip-float-btn {
          bottom: 16px;
          right: 16px;
          padding: 10px 18px;
          font-size: 13.5px;
        }
      }

      .startip-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(7, 10, 26, 0.65);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 999990;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.25s ease, visibility 0.25s ease;
        padding: 16px;
        box-sizing: border-box;
      }
      .stellar-wallets-kit {
        z-index: 10000000 !important;
      }
      .startip-modal-overlay.startip-open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      .startip-modal-box {
        position: relative;
        width: 100%;
        max-width: 358px;
        max-height: 94vh;
        transform: translateY(20px) scale(0.96);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        justify-content: center;
        box-sizing: border-box;
      }
      .startip-modal-overlay.startip-open .startip-modal-box {
        transform: translateY(0) scale(1);
      }
      .startip-modal-close {
        position: absolute;
        top: -12px;
        right: -12px;
        width: 34px;
        height: 34px;
        background: #0B1026;
        color: #FFFFFF;
        border: 2px solid rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 18px;
        font-weight: 700;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        z-index: 25;
        transition: all 0.2s ease;
        outline: none;
      }
      .startip-modal-close:hover {
        background: #0B1026;
        color: #C6FF3D;
        border-color: #C6FF3D;
        transform: scale(1.08);
      }
      .startip-iframe-el {
        width: 100%;
        max-width: 358px;
        height: 650px;
        max-height: 92vh;
        border: none;
        border-radius: 28px;
        box-shadow: 0px 24px 56px rgba(11, 16, 38, 0.2), 0px 2px 4px rgba(11, 16, 38, 0.08);
        display: block;
        background: transparent;
      }
    `;
    document.head.appendChild(style);

    // Modal Overlay
    const overlay = document.createElement('div');
    overlay.id = `startip-modal-overlay-${creator}`;
    overlay.className = 'startip-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Tip @${creator}`);

    const box = document.createElement('div');
    box.className = 'startip-modal-box';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'startip-modal-close';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Close tip modal');
    closeBtn.innerHTML = '&times;';

    const iframe = document.createElement('iframe');
    iframe.className = 'startip-iframe-el';
    iframe.src = embedUrl;
    iframe.setAttribute('title', `Tip ${creator} on StarTip`);
    iframe.setAttribute('allow', 'clipboard-write; payment');

    box.appendChild(closeBtn);
    box.appendChild(iframe);
    overlay.appendChild(box);

    const storageKey = `startip_modal_open_${creator}`;

    // Modal Control functions
    function openModal() {
      overlay.classList.add('startip-open');
      document.body.style.overflow = 'hidden';
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch (e) {}
    }

    function closeModal() {
      overlay.classList.remove('startip-open');
      document.body.style.overflow = '';
      try {
        sessionStorage.removeItem(storageKey);
      } catch (e) {}
    }

    function toggleModal() {
      if (overlay.classList.contains('startip-open')) {
        closeModal();
      } else {
        openModal();
      }
    }

    // Modal ONLY closes when clicking the explicit close button!
    // Tapping outside or refreshing the page will NOT close the tip window.
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeModal();
    };

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'startip:close') {
        closeModal();
      }
      if (e.data && e.data.type === 'startip:resize' && e.data.height) {
        if (e.source === iframe.contentWindow) {
          iframe.style.height = `${Math.min(e.data.height, window.innerHeight * 0.92)}px`;
        }
      }
    });

    // Mount floating button if enabled
    let btn = null;
    if (showFloatingButton) {
      btn = document.createElement('div');
      btn.id = `startip-float-btn-${creator}`;
      btn.className = 'startip-float-btn';
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('aria-label', `Tip @${creator}`);
      btn.innerHTML = `<span class="startip-float-icon">⚡</span><span>Tip @${creator}</span>`;
      btn.onclick = openModal;
      btn.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      };
    }

    // Attach click listeners to custom buttons on host site
    function bindCustomButtons() {
      const customElements = document.querySelectorAll('[data-startip-open], [data-startip-trigger], .startip-open-btn');
      customElements.forEach((el) => {
        if (!el.hasAttribute('data-startip-bound')) {
          el.setAttribute('data-startip-bound', 'true');
          el.addEventListener('click', (ev) => {
            ev.preventDefault();
            openModal();
          });
        }
      });
    }

    // Expose Global StarTip API for custom buttons and scripts
    window.StarTip = window.StarTip || {};
    window.StarTip.open = openModal;
    window.StarTip.close = closeModal;
    window.StarTip.toggle = toggleModal;
    window.StarTip.isOpen = () => overlay.classList.contains('startip-open');

    function mount() {
      if (btn) document.body.appendChild(btn);
      document.body.appendChild(overlay);
      bindCustomButtons();

      // Check if modal was open prior to page refresh
      try {
        if (sessionStorage.getItem(storageKey) === 'true') {
          openModal();
        }
      } catch (e) {}

      // Observe dynamically added elements for data-startip-open
      if (window.MutationObserver) {
        const observer = new MutationObserver(bindCustomButtons);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }

    if (document.body) {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount);
    }
  }

  // Execution bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStarTip);
  } else {
    initStarTip();
  }
})();
