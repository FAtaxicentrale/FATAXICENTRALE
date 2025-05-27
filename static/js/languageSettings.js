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

    getTranslation(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                return key; // Return de originele key als de vertaling niet gevonden is
            }
        }
        
        return value || key;
    }

    updateTranslations() {
        // Update alle elementen met data-translate attribuut
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getTranslation(key);
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
    }
}

// Exporteer de klasse
export { LanguageSettings };

// Maak beschikbaar in het globale bereik voor compatibiliteit
if (typeof window !== 'undefined') {
    window.LanguageSettings = LanguageSettings;
    window.languageSettings = new LanguageSettings();
}
