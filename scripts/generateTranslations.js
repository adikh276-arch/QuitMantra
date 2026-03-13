const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const TARGET_LANGS = ['es', 'fr', 'pt', 'de', 'ar', 'hi', 'bn', 'zh', 'ja', 'id', 'tr', 'vi', 'ko', 'ru', 'it', 'pl', 'th', 'tl'];

const SOURCE_FILE = path.join(__dirname, '../i18n/locales/en.json');
const OUTPUT_DIR = path.join(__dirname, '../i18n/locales');

async function translateText(text, targetLang) {
    if (!text || text.trim() === '') return text;
    
    // Skip if it looks like an HTML tag only or placeholder
    if (text.match(/^<.*>$/)) return text;

    try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                target: targetLang,
                format: 'html' // Use HTML format to preserve tags like <strong> and <em>
            })
        });

        const data = await response.json();
        if (data.data && data.data.translations && data.data.translations[0]) {
            return data.data.translations[0].translatedText;
        } else {
            console.error(`Translation failed for ${targetLang}:`, data);
            return text;
        }
    } catch (error) {
        console.error(`Error translating to ${targetLang}:`, error);
        return text;
    }
}

async function translateObject(obj, targetLang) {
    const translated = {};
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            console.log(`Translating [${targetLang}] ${key}...`);
            translated[key] = await translateText(obj[key], targetLang);
        } else {
            translated[key] = obj[key];
        }
    }
    return translated;
}

async function main() {
    if (!API_KEY) {
        console.error('Error: GOOGLE_TRANSLATE_API_KEY not found in .env');
        process.exit(1);
    }

    if (!fs.existsSync(SOURCE_FILE)) {
        console.error('Error: en.json not found');
        process.exit(1);
    }

    const sourceData = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));

    for (const lang of TARGET_LANGS) {
        console.log(`Starting translation for: ${lang}`);
        const translatedData = await translateObject(sourceData, lang);
        const outputFile = path.join(OUTPUT_DIR, `${lang}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(translatedData, null, 2));
        console.log(`Saved ${lang}.json`);
    }

    console.log('All translations complete!');
}

main();
