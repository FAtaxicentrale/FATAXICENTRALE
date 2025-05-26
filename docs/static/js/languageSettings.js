// Taalinstellingen module
class LanguageSettings {
    constructor() {
        this.currentLanguage = 'nl';
        this.translations = {
            nl: {
                'title': 'Taxi Boeking',
                'from': 'Van',
                'to': 'Naar',
                'price': 'Prijs',
                'phone': 'Telefoon',
                'terms': 'Ik ga akkoord met de voorwaarden',
                'pay': 'Betalen',
                'error': {
                    'login': 'U moet eerst inloggen',
                    'phone': 'Voer een geldig telefoonnummer in',
                    'price': 'Voer een geldige prijs in',
                    'terms': 'U moet akkoord gaan met de voorwaarden',
                    'ideal': 'Er is een fout opgetreden bij het starten van de iDEAL betaling'
                }
            },
            en: {
                'title': 'Taxi Booking',
                'from': 'From',
                'to': 'To',
                'price': 'Price',
                'phone': 'Phone',
                'terms': 'I agree to the terms and conditions',
                'pay': 'Pay',
                'error': {
                    'login': 'You must log in first',
                    'phone': 'Enter a valid phone number',
                    'price': 'Enter a valid price',
                    'terms': 'You must agree to the terms and conditions',
                    'ideal': 'An error occurred while starting the iDEAL payment'
                }
            }
        };
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            this.updateTranslations();
        }
    }

    getTranslation(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    updateTranslations() {
        // Update alle elementen met data-translate attribuut
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getTranslation(key);
            if (element.tagName === 'INPUT') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update error messages
        document.querySelectorAll('[data-error]').forEach(element => {
            const key = element.getAttribute('data-error');
            const translation = this.getTranslation(`error.${key}`);
            element.textContent = translation;
        });
    }

    static initialize() {
        const settings = new LanguageSettings();
        const languageSelect = document.getElementById('language-select');
        
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                settings.setLanguage(e.target.value);
            });
        }

        // Stel standaard taal in
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && settings.translations[savedLanguage]) {
            settings.setLanguage(savedLanguage);
        }

        return settings;
    }
}

// Maak beschikbaar in het globale bereik
if (typeof window !== 'undefined') {
  window.LanguageSettings = LanguageSettings;
  
  // Maak een instantie beschikbaar
  window.languageSettings = new LanguageSettings();
}
