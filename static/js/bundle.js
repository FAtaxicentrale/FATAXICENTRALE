// Dit bestand wordt gegenereerd door de build tool
// Het bundelt alle JavaScript modules in één bestand

// Exporteer alle klassen naar het globale window object
import { LocationService } from './location.js';
import { AddressSuggestions } from './addressSuggestions.js';
import { PriceCalculator } from './priceCalculator.js';
import { MapManager } from './map.js';
import { IdealPayment } from './idealPayment.js';
import { LanguageSettings } from './languageSettings.js';
import { FormHandler } from './formHandler.js';
import { App } from './app.js';

// Maak klassen beschikbaar in het globale bereik
window.LocationService = LocationService;
window.AddressSuggestions = AddressSuggestions;
window.PriceCalculator = PriceCalculator;
window.MapManager = MapManager;
window.IdealPayment = IdealPayment;
window.LanguageSettings = LanguageSettings;
window.FormHandler = FormHandler;
window.App = App;

// Initialiseer de app wanneer het DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app; // Maak beschikbaar in het globale bereik
  
  app.initialize().catch(error => {
    console.error('Fout bij het starten van de applicatie:', error);
  });
});
