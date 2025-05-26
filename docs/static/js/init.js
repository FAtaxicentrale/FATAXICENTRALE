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

// Main application class
class App {
    constructor() {
        this.modules = {};
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('Initializing FA Taxi application...');
        
        try {
            // Initialize all modules
            this.modules.languageSettings = new LanguageSettings();
            this.modules.mapManager = new MapManager();
            this.modules.priceCalculator = new PriceCalculator();
            this.modules.addressSuggestions = new AddressSuggestions();
            this.modules.idealPayment = new IdealPayment();
            this.modules.formHandler = new FormHandler(this);
            this.modules.locationService = new LocationService();
            
            // Initialize map if element exists
            if (document.getElementById('map')) {
                await this.modules.mapManager.init();
            }
            
            // Initialize address suggestions
            if (this.modules.addressSuggestions.initialize) {
                this.modules.addressSuggestions.initialize();
            }
            
            // Initialize form handler
            if (this.modules.formHandler.initialize) {
                this.modules.formHandler.initialize();
            }
            
            // Make app instance globally available
            window.app = this;
            
            // Make modules available globally for backward compatibility
            window.config = config;
            window.utils = { formatPrice, debounce };
            window.locationService = this.modules.locationService;
            window.addressSuggestions = this.modules.addressSuggestions;
            window.PriceCalculator = PriceCalculator;
            window.mapManager = this.modules.mapManager;
            window.idealPayment = this.modules.idealPayment;
            window.languageSettings = this.modules.languageSettings;
            window.formHandler = this.modules.formHandler;
            
            this.initialized = true;
            console.log('FA Taxi application initialized successfully!');
        } catch (error) {
            console.error('Error initializing FA Taxi application:', error);
            throw error;
        }
    }
}
// Create and initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    try {
        await app.initialize();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #ffebee; color: #c62828; padding: 1rem; margin: 1rem; border-radius: 4px; text-align: center;';
        errorDiv.textContent = 'Er is een fout opgetreden bij het initialiseren van de applicatie. Ververs de pagina of neem contact op met de beheerder.';
        document.body.prepend(errorDiv);
    }
});

// The application is now initialized automatically when the DOM is loaded
