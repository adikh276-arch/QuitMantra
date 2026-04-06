const Auth = {
    userId: null,
    ready: false,
    
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
                console.log('Auth: no token or session, redirecting');

                // Encode the current hash (e.g. #substance=alcohol&view=quiz) as a
                // plain query param so it survives the full cross-domain redirect
                // chain. Hashes are always stripped by browsers when crossing origins,
                // and sessionStorage is origin-scoped, so this is the only reliable way.
                const currentHash = window.location.hash;
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
            // Use explicit absolute path for the platform subpath
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
            
            // Remove token from URL, then restore any saved deep-link hash.
            const url = new URL(window.location);
            url.searchParams.delete('token');

            // Method 1: redirect_hash was threaded through the token API as a query param.
            // The token API should echo it back in the redirect to platform (or it
            // lands on platform's URL as-is if the API passes query params through).
            const redirectHash = url.searchParams.get('redirect_hash');
            if (redirectHash) {
                url.hash = redirectHash; // e.g. #substance=alcohol&view=quiz
                url.searchParams.delete('redirect_hash');
            }

            // Method 2 (fallback): in case the api.mantracare.com/token endpoint
            // doesn't forward query params, we also check sessionStorage (works when
            // the redirect stays on the same origin or the token API is on the same
            // parent domain with shared storage).
            if (!redirectHash) {
                const savedHash = sessionStorage.getItem('post_auth_hash');
                if (savedHash && savedHash !== '#') {
                    url.hash = savedHash;
                    sessionStorage.removeItem('post_auth_hash');
                }
            }

            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
            
            this.hideLoader();
        } catch (err) {
            console.error('Auth: handshake failed:', err);
            // Even if it fails, we set ready so the page shows something (maybe with a restricted view or another go at login)
            this.hideLoader();
            // window.location.href = 'https://api.mantracare.com/token';
        }
    },

    showLoader() {
        let loader = document.getElementById('auth-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'auth-loader';
            
            // Try to translate immediately if i18n is available
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
