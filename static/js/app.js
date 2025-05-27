// Importeer alle benodigde modules
import { config } from './config.js';
import { formatPrice, debounce } from './utils.js';
import { LocationService } from './location.js';
import { AddressSuggestions } from './addressSuggestions.js';
import { PriceCalculator } from './priceCalculator.js';
import { MapManager } from './map.js';
import { IdealPayment } from './idealPayment.js';
import { LanguageSettings } from './languageSettings.js';
import { FormHandler } from './formHandler.js';

// Zorg ervoor dat de klassen beschikbaar zijn in het globale bereik
if (typeof window !== 'undefined') {
  window.LocationService = LocationService;
  window.AddressSuggestions = AddressSuggestions;
  window.PriceCalculator = PriceCalculator;
  window.MapManager = MapManager;
  window.IdealPayment = IdealPayment;
  window.LanguageSettings = LanguageSettings;
  window.FormHandler = FormHandler;
}

// Hoofdapplicatie klasse
export class App {
    constructor() {
        this.modules = {
            languageSettings: new LanguageSettings(),
            locationService: new LocationService(),
            addressSuggestions: new AddressSuggestions(),
            priceCalculator: new PriceCalculator(),
            mapManager: new MapManager(),
            idealPayment: new IdealPayment()
        };
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('Bezig met initialiseren van de applicatie...');

            // Initialiseer de kaart eerst als deze bestaat
            if (document.getElementById('map') && this.modules.mapManager.init) {
                await this.modules.mapManager.init();
                console.log('Kaart module geïnitialiseerd');
            }

            // Initialiseer adres suggesties
            if (this.modules.addressSuggestions.initialize) {
                this.modules.addressSuggestions.initialize();
                console.log('Adres suggesties geïnitialiseerd');
            }

            // Initialiseer de form handler als laatste
            try {
                this.modules.formHandler = new FormHandler({
                    languageSettings: this.modules.languageSettings,
                    mapManager: this.modules.mapManager,
                    priceCalculator: this.modules.priceCalculator,
                    addressSuggestions: this.modules.addressSuggestions,
                    idealPayment: this.modules.idealPayment,
                    locationService: this.modules.locationService
                });
                
                if (this.modules.formHandler.initialize) {
                    this.modules.formHandler.initialize();
                    console.log('Formulier handler geïnitialiseerd');
                }
            } catch (error) {
                console.error('Fout bij het initialiseren van de formulier handler:', error);
                throw error; // Gooi de fout door naar de aanroepende code
            }
            
            // Voeg event listeners toe
            this.addEventListeners();
            
            this.initialized = true;
            console.log('Applicatie succesvol geïnitialiseerd');
            
        } catch (error) {
            console.error('Fout bij het initialiseren van de applicatie:', error);
            this.showError('Er is een fout opgetreden bij het laden van de applicatie');
            throw error; // Gooi de fout door naar de aanroepende code
        }
    }

    async loadModules() {
        const modulePaths = [
            './config.js',
            './utils.js',
            './location.js',
            './addressSuggestions.js',
            './idealPayment.js',
            './languageSettings.js',
            './priceCalculator.js',
            './formHandler.js',
            './ui.js',
            './validator.js',
            // Opmerking: map.js wordt apart geladen om laadvolgorde te garanderen,
            './map.js'
        ];

        // Laad alle modules parallel
        const loadedModules = await Promise.all(modulePaths.map(loadModule));
        
        // Sla de modules op in het modules object
        [
            'config', 'utils', 'location', 'addressSuggestions',
            'idealPayment', 'languageSettings', 'priceCalculator',
            'formHandler', 'ui', 'validator'
        ].forEach((name, index) => {
            this.modules[name] = loadedModules[index];
        });
    }

    async initializeUI() {
        try {
            // Initialiseer de UI componenten
            if (this.modules.ui?.UI) {
                this.ui = new this.modules.ui.UI();
                
                // Geef de benodigde managers door aan de UI
                const managers = {
                    mapManager: this.modules.map || window.mapManager,
                    bookingManager: this.modules.booking?.bookingManager
                };
                
                await this.ui.initialize(managers);
                console.log('UI succesvol geïnitialiseerd');
            }

            // Initialiseer adressuggesties als aparte module
            if (this.modules.addressSuggestions?.AddressSuggestions) {
                this.addressSuggestions = new this.modules.addressSuggestions.AddressSuggestions();
                await this.initializeAddressSuggestions();
                console.log('Adres suggesties succesvol geïnitialiseerd');
            }
        } catch (error) {
            console.error('Fout bij het initialiseren van de UI componenten:', error);
            throw error;
        }
    }

    async initializeAddressSuggestions() {
        try {
            // Voeg hier de adres suggesties initialisatie code toe
            console.log('Adres suggesties initialiseren...');
            // ... bestaande code voor adres suggesties ...
        } catch (error) {
            console.error('Fout bij het initialiseren van adres suggesties:', error);
        }
    }

    /**
     * Voeg event listeners toe aan de pagina elementen
     */
    addEventListeners() {
        // Voeg hier event listeners toe voor knoppen en formulieren
        const berekenKnop = document.getElementById('btnBereken');
        if (berekenKnop) {
            berekenKnop.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleBerekenClick();
            });
        }

        // Voeg event listeners toe voor adresvelden
        const adresVelden = ['ophaaladres', 'afzetadres'];
        adresVelden.forEach(veldId => {
            const veld = document.getElementById(veldId);
            if (veld) {
                veld.addEventListener('input', debounce(() => {
                    this.updateAdresSuggesties(veldId);
                }, 300));
            }
        });

        console.log('Event listeners toegevoegd');
    }

    /**
     * Toon een foutmelding aan de gebruiker
     * @param {string} message - De foutmelding om weer te geven
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Verwijder bestaande foutmeldingen
        const bestaandeFoutmeldingen = document.querySelectorAll('.error-message');
        bestaandeFoutmeldingen.forEach(el => el.remove());
        
        // Voeg de nieuwe foutmelding toe
        const form = document.querySelector('form');
        if (form) {
            form.prepend(errorDiv);
        } else {
            document.body.prepend(errorDiv);
        }
        
        // Verwijder de foutmelding na 5 seconden
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    /**
     * Behandel het klikken op de bereken knop
     */
    async handleBerekenClick() {
        try {
            if (this.modules.formHandler && this.modules.formHandler.handleSubmit) {
                await this.modules.formHandler.handleSubmit();
            } else {
                console.error('Formulier handler is niet correct geïnitialiseerd');
                this.showError('Er is een fout opgetreden bij het verwerken van het formulier');
            }
        } catch (error) {
            console.error('Fout bij het verwerken van het formulier:', error);
            this.showError('Er is een fout opgetreden bij het verwerken van het formulier');
        }
    }

    /**
     * Werk adressuggesties bij voor een veld
     * @param {string} veldId - Het ID van het adresveld
     */
    updateAdresSuggesties(veldId) {
        if (this.modules.addressSuggestions && this.modules.addressSuggestions.getSuggestions) {
            const veld = document.getElementById(veldId);
            if (veld) {
                this.modules.addressSuggestions.getSuggestions(veld, `${veldId}-suggesties`);
            }
        }
    }
}

// Initialiseer de applicatie wanneer het DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app; // Maak beschikbaar in het globale bereik
    
    // Start de applicatie
    app.initialize().catch(error => {
        console.error('Fout bij het starten van de applicatie:', error);
        // Toon een gebruiksvriendelijke foutmelding
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Er is een fout opgetreden bij het laden van de applicatie. Vernieuw de pagina of probeer het later opnieuw.';
        document.body.prepend(errorDiv);
    });
});

