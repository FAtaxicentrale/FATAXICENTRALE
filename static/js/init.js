// Import all required modules
import { config } from './config.js';
import { formatPrice, debounce } from './utils.js';
import { LocationService } from './location.js';
import { AddressSuggestions } from './addressSuggestions.js';
import { PriceCalculator } from './priceCalculator.js';
import { MapManager } from './map.js';
import { IdealPayment } from './idealPayment.js';
import { LanguageSettings } from './languageSettings.js';
import { FormHandler } from './formHandler.js';

/**
 * Hoofdapplicatie klasse voor de FA Taxi boeking
 */
class App {
    constructor() {
        this.modules = {};
        this.initialized = false;
        this.appElement = document.getElementById('app');
    }

    /**
     * Laadt het HTML template voor de boekingspagina
     * @returns {Promise<string>} De HTML van het template of een foutmelding
     */
    async loadTemplate() {
        try {
            const response = await fetch('templates/booking-form.html');
            if (!response.ok) throw new Error('Kon het template niet laden');
            return await response.text();
        } catch (error) {
            console.error('Fout bij het laden van het template:', error);
            return `
                <div style="color: red; padding: 20px; text-align: center;">
                    <h2>Fout bij het laden</h2>
                    <p>Er is een fout opgetreden bij het laden van de applicatie.</p>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; cursor: pointer;">
                        Probeer opnieuw
                    </button>
                </div>
            `;
        }
    }

    /**
     * Toont een foutmelding aan de gebruiker
     * @param {string} message - Het foutbericht dat getoond moet worden
     */
    showError(message) {
        if (this.appElement) {
            this.appElement.innerHTML = `
                <div style="color: red; padding: 20px; text-align: center;">
                    <h2>Er is een fout opgetreden</h2>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; cursor: pointer;">
                        Vernieuw de pagina
                    </button>
                </div>
            `;
        }
    }

    /**
     * Initialiseert de applicatie
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('Initializing FA Taxi application...');
        
        try {
            // Laad eerst de template
            const template = await this.loadTemplate();
            if (this.appElement) {
                this.appElement.innerHTML = template;
            }
            
            // Initialiseer alle modules nadat de DOM is geladen
            await this.initializeModules();
            
            this.initialized = true;
            console.log('Applicatie succesvol geïnitialiseerd');
            
        } catch (error) {
            console.error('Fout tijdens initialisatie:', error);
            this.showError('Er is een fout opgetreden bij het initialiseren van de applicatie');
        }
    }
    
    /**
     * Initialiseert alle modules van de applicatie
     */
    async initializeModules() {
        try {
            // Initialize all modules
            this.modules.languageSettings = new LanguageSettings();
            this.modules.mapManager = new MapManager();
            this.modules.priceCalculator = new PriceCalculator();
            this.modules.addressSuggestions = new AddressSuggestions();
            this.modules.idealPayment = new IdealPayment();
            this.modules.formHandler = new FormHandler(this);
            this.modules.locationService = new LocationService();
            
            // Initialiseer de kaart als het element bestaat
            const mapElement = document.getElementById('map');
            if (mapElement) {
                await this.modules.mapManager.initializeMap('map');
            }
            
            // Initialiseer event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Fout bij het initialiseren van modules:', error);
            throw error;
        }
    }
    
    /**
     * Stelt alle event listeners in voor de applicatie
     */
    setupEventListeners() {
        console.log('Event listeners worden ingesteld...');
        
        // Voeg hier eventuele globale event listeners toe
        const form = document.getElementById('booking-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e);
            });
        }
    }
    
    /**
     * Handelt het verzenden van het formulier af
     * @param {Event} event - Het submit event
     */
    async handleFormSubmit(event) {
        console.log('Formulier verzonden');
        // Hier komt de logica voor het verwerken van het formulier
    }
}

// Exporteer de App klasse
export { App };
export default App;
