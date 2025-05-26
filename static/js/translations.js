// Controleer of de klasse al bestaat om dubbele declaraties te voorkomen
if (typeof window.Translations === 'undefined') {
  /**
   * Translations for the taxi booking application
   */
  class Translations {
    constructor() {
      this.translations = {
        nl: {
          h1: 'FA TAXI Service',
          h2: 'TAXI 4 Personen',
          tussenstopBtn: '➕ Tussenstop toevoegen',
          labelTijdstip: '🕒 Gewenst tijdstip 🕒',
          labelBetaal: '💳 Kies een betaalmethode 💳',
          labelKorting: '💰 Kortingscode 💰',
          labelOpmerkingen: '✏️ Opmerkingen ✏️',
          idealPayBtn: 'Direct betalen via iDEAL',
          textareaPH: 'Bijvoorbeeld: helpen met bagage, bijzonderheden, etc.',
          adminSpecificaties: 'Admin specificaties',
          selectIdeal: '🌐 IDEAL Online-Betaal-Link',
          selectTikkie: '🔗 Tikkie',
          selectPin: '💳 Pin bij chauffeur',
          selectCash: '💶 Contant',
          ophaal: '📍 OPHAAL ADRES 📍',
          afzet: '📍 AFZET ADRES 📍',
          reserveren: '📅 Reserveren? €17,50 📅',
          huisdieren: '🐶 Huisdieren €5,- 🐶',
          spoed: '🚀 Spoedrit €10 🚀',
          akkoord: '🚨 Annuleringskosten €10,- 🚨',
          bereken: '🚖 Bereken ritprijs 🚖',
          ph: 'Bijv. Stationsplein 1, Amsterdam',
          dh: 'Bijv. Damrak 50, Amsterdam',
          locatieBtn: '📍 Mijn locatie'
        },
        en: {
          h1: 'FA TAXI Service',
          h2: 'TAXI 4 Persons',
          tussenstopBtn: '➕ Add stopover',
          labelTijdstip: '🕒 Desired time 🕒',
          labelBetaal: '💳 Choose a payment method 💳',
          labelKorting: '💰 Discount code 💰',
          labelOpmerkingen: '✏️ Comments ✏️',
          idealPayBtn: 'Pay directly via iDEAL',
          textareaPH: 'For example: help with luggage, special requests, etc.',
          adminSpecificaties: 'Admin specifications',
          selectIdeal: '🌐 IDEAL Online Payment Link',
          selectTikkie: '🔗 Tikkie',
          selectPin: '💳 Card at driver',
          selectCash: '💶 Cash',
          ophaal: '📍 Pickup Address 📍',
          afzet: '📍 Drop-off Address 📍',
          reserveren: '📅 Reserve? €17,50 📅',
          huisdieren: '🐶 Pets €5,- 🐶',
          spoed: '🚀 Express ride €10 🚀',
          akkoord: '🚨 Cancellation fee €10,- 🚨',
          bereken: '🚖 Calculate fare 🚖',
          ph: 'E.g., Station Square 1, Amsterdam',
          dh: 'E.g., Damrak 50, Amsterdam',
          locatieBtn: '📍 My location'
        }
      };
      this.currentLanguage = 'nl';
    }

    setLanguage(lang) {
      if (this.translations[lang]) {
        this.currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
        return true;
      }
      return false;
    }

    t(key, params = {}) {
      const keys = key.split('.');
      let value = this.translations[this.currentLanguage];
      
      for (const k of keys) {
        if (value && value[k] !== undefined) {
          value = value[k];
        } else {
          console.warn(`Translation key not found: ${key}`);
          return key; // Return the original key if translation not found
        }
      }
      
      // Replace placeholders if any
      return Object.keys(params).reduce(
        (str, param) => str.replace(new RegExp(`{{${param}}}`, 'g'), params[param]),
        value
      );
    }
  }

  // Maak de klasse beschikbaar in de globale scope
  window.Translations = Translations;
}

// Maak een instantie beschikbaar voor direct gebruik, maar alleen als deze nog niet bestaat
if (typeof window.translations === 'undefined' && typeof window.Translations !== 'undefined') {
  window.translations = new window.Translations();
}
