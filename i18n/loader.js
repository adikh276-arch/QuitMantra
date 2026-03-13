const i18n = {
    locale: 'en',
    ready: false,
    translations: {},
    supportedLocales: ['en', 'es', 'fr', 'pt', 'de', 'ar', 'hi', 'bn', 'zh', 'ja', 'id', 'tr', 'vi', 'ko', 'ru', 'it', 'pl', 'th', 'tl'],

    async init() {
        console.log('i18n: starting init');
        this.detectLanguage();
        try {
            await this.loadTranslations(this.locale);
        } catch (e) {
            console.error('i18n: load failed during init', e);
        }
        this.translatePage();
        this.updateHtmlLang();
        this.ready = true;
        
        // Sync dropdown value
        const langSelect = document.getElementById('lang-select');
        if (langSelect) langSelect.value = this.locale;

        // Notify that we are ready
        window.dispatchEvent(new CustomEvent('i18nReady', { detail: { language: this.locale } }));
        console.log(`i18n ready: ${this.locale}`);
    },

    detectLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        const storedLang = localStorage.getItem('language');
        const browserLang = navigator.language.split('-')[0];

        if (langParam && this.supportedLocales.includes(langParam)) {
            this.locale = langParam;
        } else if (storedLang && this.supportedLocales.includes(storedLang)) {
            this.locale = storedLang;
        } else if (this.supportedLocales.includes(browserLang)) {
            this.locale = browserLang;
        } else {
            this.locale = 'en';
        }

        localStorage.setItem('language', this.locale);
    },

    async setLanguage(lang) {
        if (!this.supportedLocales.includes(lang)) return;
        this.locale = lang;
        localStorage.setItem('language', lang);
        
        // Update URL parameter without full reload
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.pushState({}, '', url.pathname + url.search + url.hash);

        await this.loadTranslations(lang);
        this.translatePage();
        this.updateHtmlLang();
        
        // Dispatch custom event for parts of the app that need to re-render (like the Quiz)
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    },

    async loadTranslations(lang) {
        console.log(`i18n: loading ${lang}`);
        try {
            // Find our own script path to get a base URL
            const script = document.querySelector('script[src*="i18n/loader.js"]');
            const scriptSrc = script ? script.src : window.location.origin + '/quit_assessments/i18n/loader.js';
            const localesPath = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) + 'locales/';
            
            const response = await fetch(`${localesPath}${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.translations = await response.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to English if not already English
            if (lang !== 'en') {
                await this.loadTranslations('en');
            }
        }
    },

    t(key, params = {}) {
        let text = this.translations[key] || key;
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    },

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Handle placeholders or titles if needed
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.innerHTML = translation;
            }
        });
    },

    updateHtmlLang() {
        document.documentElement.lang = this.locale;
        document.documentElement.dir = (this.locale === 'ar') ? 'rtl' : 'ltr';
    }
};

window.i18n = i18n;
document.addEventListener('DOMContentLoaded', () => i18n.init());
