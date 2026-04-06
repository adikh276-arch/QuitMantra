const Auth = {
    userId: null,
    ready: false,

    // ─── Deep-link hash storage key ───────────────────────────────────────────
    // localStorage survives the round-trip platform → token API → platform
    // because localStorage is scoped to origin (platform.mantracare.com).
    // sessionStorage would work too for same-origin round-trips, but localStorage
    // is safer across browser tab/session edge-cases.
    HASH_KEY: 'quit_deeplink_hash',

    async init() {
        console.log('Auth: starting init');
        this.showLoader();

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            await this.handleHandshake(token);
        } else {
            const storedId = sessionStorage.getItem('user_id');
            if (storedId) {
                console.log('Auth: existing user session found', storedId);
                this.userId = storedId;
                this.hideLoader();
            } else {
                console.log('Auth: no token or session, redirecting to token API');

                // Save the desired deep-link hash BEFORE we leave this page.
                // localStorage persists on platform.mantracare.com through the
                // platform → token API → platform redirect round-trip.
                const currentHash = window.location.hash;
                if (currentHash && currentHash !== '#') {
                    localStorage.setItem(this.HASH_KEY, currentHash);
                    console.log('Auth: saved deep-link hash to localStorage:', currentHash);
                }

                // Also try threading it as a query param through the token API
                // (works if api.mantracare.com/token forwards extra params).
                let tokenUrl = 'https://api.mantracare.com/token';
                if (currentHash && currentHash !== '#') {
                    tokenUrl += '?redirect_hash=' + encodeURIComponent(currentHash);
                }
                window.location.href = tokenUrl;
            }
        }
    },

    async handleHandshake(token) {
        console.log('Auth: handling handshake with token');
        try {
            const apiPath = '/quit_assessments/api/auth/handshake';

            const response = await fetch(apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.userId = data.user_id;
            sessionStorage.setItem('user_id', this.userId);

            // ── Restore deep-link hash ────────────────────────────────────────
            // We try three sources in priority order:
            //
            //   1. redirect_hash query param  — set by this auth.js when platform
            //      itself triggers the token redirect, forwarded by the token API.
            //
            //   2. localStorage quit_deeplink_hash — set by this auth.js when
            //      platform triggers the redirect; survives the same-origin
            //      round-trip (platform → token API → platform).
            //
            //   3. Nothing. The user came from the web subdomain which does not
            //      (yet) pass the deep-link through. In that case we land on the
            //      home page as before. The web team needs to pass
            //      redirect_hash=<hash> when calling the token API.

            const url = new URL(window.location);
            url.searchParams.delete('token');

            // Priority 1: query param forwarded through the token API.
            let restoredHash = url.searchParams.get('redirect_hash') || '';
            if (restoredHash) {
                console.log('Auth: restoring hash from redirect_hash param:', restoredHash);
                url.searchParams.delete('redirect_hash');
            }

            // Priority 2: localStorage (platform-initiated round-trip).
            if (!restoredHash) {
                restoredHash = localStorage.getItem(this.HASH_KEY) || '';
                if (restoredHash) {
                    console.log('Auth: restoring hash from localStorage:', restoredHash);
                }
            }

            // Always clean up the stored hash.
            localStorage.removeItem(this.HASH_KEY);

            if (restoredHash && restoredHash !== '#') {
                url.hash = restoredHash;
            }

            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
            console.log('Auth: final URL after handshake:', window.location.href);

            this.hideLoader();
        } catch (err) {
            console.error('Auth: handshake failed:', err);
            localStorage.removeItem(this.HASH_KEY);
            this.hideLoader();
        }
    },

    showLoader() {
        let loader = document.getElementById('auth-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'auth-loader';

            const loadingText = (window.i18n && window.i18n.t) ? window.i18n.t('auth.loading') : 'Authenticating...';

            loader.innerHTML = `
                <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;">
                    <div class="loader-spinner" style="width:40px;height:40px;border:3px solid var(--border);border-top:3px solid var(--primary);border-radius:50%;animation:spin 1s linear infinite;"></div>
                    <p style="margin-top:16px;font-family:inherit;color:var(--ink-2);font-size:14px;" data-i18n="auth.loading">${loadingText}</p>
                </div>
                <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(loader);
        }
        document.body.style.overflow = 'hidden';
    },

    hideLoader() {
        const loader = document.getElementById('auth-loader');
        if (loader) loader.remove();
        document.body.style.overflow = '';
        this.ready = true;
        window.dispatchEvent(new CustomEvent('authReady', { detail: { userId: this.userId } }));
    }
};

window.Auth = Auth;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
    Auth.init();
}
