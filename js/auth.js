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
                // Phase 7 - Step 4: Failure Handling
                window.location.href = 'https://api.mantracare.com/token'; // Redirect to get token
            }
        }
    },

    async handleHandshake(token) {
        console.log('Auth: handling handshake with token');
        try {
            // Find base path for API
            const script = document.querySelector('script[src*="js/auth.js"]');
            const scriptSrc = script ? script.src : window.location.origin + '/quit_assessments/js/auth.js';
            const apiPath = scriptSrc.substring(0, scriptSrc.indexOf('/quit_assessments/') + '/quit_assessments/'.length) + 'api/auth/handshake';

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
            // Ensure hash and other search params are preserved
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
            loader.innerHTML = `
                <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;">
                    <div class="loader-spinner" style="width:40px;height:40px;border:3px solid var(--border);border-top:3px solid var(--primary);border-radius:50%;animation:spin 1s linear infinite;"></div>
                    <p style="margin-top:16px;font-family:inherit;color:var(--ink-2);font-size:14px;" data-i18n="auth.loading">Authenticating...</p>
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
document.addEventListener('DOMContentLoaded', () => Auth.init());
