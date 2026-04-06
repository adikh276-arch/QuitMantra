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
                
                const url = new URL(window.location);
                if (url.hash) {
                    // Migrate legacy hash links to search params
                    const hashParams = new URLSearchParams(url.hash.substring(1));
                    for (const [k, v] of hashParams) {
                        url.searchParams.set(k, v);
                    }
                    url.hash = '';
                    window.history.replaceState({}, '', url.pathname + url.search);
                }
                this.hideLoader();
            } else {
                console.log('Auth: no token or session, redirecting');
                // Phase 7 - Step 4: Failure Handling
                let paramsToSave = window.location.search;
                if (!paramsToSave && window.location.hash) {
                    paramsToSave = '?' + window.location.hash.substring(1);
                }
                if (paramsToSave) {
                    const tempParams = new URLSearchParams(paramsToSave);
                    tempParams.delete('token');
                    if (tempParams.toString()) {
                        sessionStorage.setItem('saved_params', '?' + tempParams.toString());
                    }
                }
                
                let targetUrl = 'https://web.mantracare.com/app/quit_assessments';
                if (window.location.search) targetUrl += window.location.search;
                else if (window.location.hash) targetUrl += '?' + window.location.hash.substring(1);
                
                window.location.href = targetUrl;
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
            
            // Phase 7 - Step 3: Remove token from URL
            const url = new URL(window.location);
            url.searchParams.delete('token');
            
            // Migrate any legacy hash to search params
            if (url.hash) {
                const legacyHash = new URLSearchParams(url.hash.substring(1));
                for (const [k, v] of legacyHash) url.searchParams.set(k, v);
                url.hash = '';
            }
            
            const savedParams = sessionStorage.getItem('saved_params');
            if (savedParams) {
                const sp = new URLSearchParams(savedParams);
                for (const [k, v] of sp) url.searchParams.set(k, v);
                sessionStorage.removeItem('saved_params');
            }

            // Reconstruct URL with search params
            window.history.replaceState({}, '', url.pathname + url.search);
            
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
