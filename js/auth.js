const Auth = {
    userId: null,
    
    async init() {
        this.showLoader();
        
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (token) {
            await this.handleHandshake(token);
        } else {
            const storedId = sessionStorage.getItem('user_id');
            if (storedId) {
                this.userId = storedId;
                this.hideLoader();
            } else {
                // Phase 7 - Step 4: Failure Handling
                window.location.href = 'https://api.mantracare.com/token'; // Redirect to get token
            }
        }
    },

    async handleHandshake(token) {
        try {
            // My backend URL
            const response = await fetch('/quit_assessments/api/auth/handshake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            if (!response.ok) throw new Error('Auth failed');
            
            const data = await response.json();
            this.userId = data.user_id;
            sessionStorage.setItem('user_id', this.userId);
            
            // Phase 7 - Step 3: Remove token from URL
            const url = new URL(window.location);
            url.searchParams.delete('token');
            window.history.replaceState({}, '', url.pathname + url.search);
            
            this.hideLoader();
        } catch (err) {
            console.error('Handshake failed:', err);
            window.location.href = 'https://api.mantracare.com/token';
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
        window.dispatchEvent(new CustomEvent('authReady'));
    }
};

window.Auth = Auth;
document.addEventListener('DOMContentLoaded', () => Auth.init());
