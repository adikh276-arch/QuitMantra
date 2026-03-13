const i18n = {
    locale: 'en',
    translations: {},
    supportedLocales: ['en', 'es', 'fr', 'pt', 'de', 'ar', 'hi', 'bn', 'zh', 'ja', 'id', 'tr', 'vi', 'ko', 'ru', 'it', 'pl', 'th', 'tl'],

    async init() {
        this.detectLanguage();
        await this.loadTranslations(this.locale);
        this.translatePage();
        this.updateHtmlLang();
        console.log(`i18n initialized: ${this.locale}`);
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
        await this.loadTranslations(lang);
        this.translatePage();
        this.updateHtmlLang();
        
        // Dispatch custom event for parts of the app that need to re-render (like the Quiz)
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    },

    async loadTranslations(lang) {
        try {
            // Get the base path from the URL to handle subpaths correctly
            const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
            const response = await fetch(`${path}i18n/locales/${lang}.json`);
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
