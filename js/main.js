/**
 * Hoofdapplicatiebestand
 * Initialiseert en coördineert alle applicatiecomponenten
 */

// Import modules
import { ui } from './modules/ui.js';
import { apiService, handleApiError } from './modules/api.service.js';
import { Validator } from './modules/validation.js';
import { Booking } from './modules/booking.js';

// Configuration
const APP_CONFIG = {
  // API settings
  api: {
    // API configuration is now handled by api.service.js
    baseUrls: {
      api: 'https://api.fataxi.nl/v1' // Base URL for our own API
    },
    
    // API keys from pricing config
    keys: {
      ...API_CONFIG.keys
    },
    
    // Request settings
    timeout: 15000, // 15 second timeout
    maxRetries: 3,  // Maximum number of retries for failed requests
    retryDelay: 1000, // Initial delay between retries in ms
    
    // Headers
    headers: {
      'X-Application': 'FA-TAXI-WEB',
      'X-Version': '1.0.0',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    
    // Simulation settings for development
    simulateDelay: process.env.NODE_ENV === 'development' ? 1000 : 0,
    simulateErrors: false
  },
  
  // UI-instellingen
  ui: {
    // Selectors
    loaderSelector: '#loader',
    errorSelector: '#error',
    successSelector: '#success',
    formSelector: '#bookingForm',
    priceDisplaySelector: '#priceDisplay',
    bookingDetailsSelector: '#bookingDetails',
    
    // Tijdsinstellingen
    animationDuration: 300,
    errorDisplayTime: 5000,
    successDisplayTime: 5000,
    
    // Standaardberichten
    messages: {
      loading: 'Bezig met verwerken...',
      bookingSuccess: 'Uw boeking is succesvol ontvangen!',
      genericError: 'Er is een fout opgetreden. Probeer het later opnieuw.',
      noInternet: 'Geen internetverbinding. Controleer uw netwerk en probeer het opnieuw.',
      serverError: 'De server is momenteel niet beschikbaar. Probeer het later opnieuw.'
    },
    
    // Callbacks
    onRetry: () => window.location.reload()
  },
  
  // Validatieregels
  validation: {
    required: ['pickup', 'destination', 'name', 'email', 'phone', 'date', 'time'],
    email: ['email'],
    phone: ['phone'],
    minLength: {
      name: 2,
      phone: 10
    },
    maxLength: {
      name: 100,
      email: 100,
      phone: 20,
      notes: 500
    },
    // Aangepaste validatieregels
    customRules: {
      futureDate: ['date']
    }
  },
  
  // Prijsberekening
  pricing: {
    basePrice: 7.50,
    pricePerKm: 2.50,
    minPrice: 10.00,
    maxPrice: 100.00,
    surgeMultiplier: 1.5,
    surgeHours: [
      { start: '16:00', end: '18:00', days: [1,2,3,4,5], multiplier: 1.3 },
      { start: '22:00', end: '06:00', days: [0,1,2,3,4,5,6], multiplier: 1.5 }
    ]
  }
};

/**
 * Hoofdapplicatieklasse
 */
class TaxiApp {
  constructor() {
    this.config = APP_CONFIG;
    this.modules = {};
    this.initialized = false;
    
    // Bind methodes
    this.initialize = this.initialize.bind(this);
    this._initializeModules = this._initializeModules.bind(this);
    this._handleApiError = this._handleApiError.bind(this);
    this._handleOnline = this._handleOnline.bind(this);
    this._handleOffline = this._handleOffline.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }
  
  /**
   * Initialiseer de applicatie
   */
  async initialize() {
    if (this.initialized) {
      console.warn('Applicatie is al geïnitialiseerd');
      return;
    }
    
    console.log('Initialiseer applicatie...');
    
    try {
      // Configureer de API
      this._configureAPI();
      
      // Initialiseer modules
      await this._initializeModules();
      
      // Stel event listeners in
      this._setupEventListeners();
      
      // Laad initiële data
      await this._loadInitialData();
      
      this.initialized = true;
      console.log('Applicatie succesvol geïnitialiseerd');
      
      // Laat weten dat de app klaar is voor gebruik
      document.dispatchEvent(new CustomEvent('app:ready', { detail: this }));
      
    } catch (error) {
      console.error('Fout bij initialiseren applicatie:', error);
      this._showFatalError('Kon de applicatie niet initialiseren');
    } finally {
      ui.hideLoader();
    }
  }
  
  /**
   * Configure the API
   * @private
   */
  _configureAPI() {
    // Create API instance with config
    this.api = new TaxiAPI({
      ...this.config.api,
      onUnauthorized: this._handleUnauthorized.bind(this)
    });
    
    // Set auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.api.setAuthToken(token);
    }
    
    // Add request/response interceptors for simulation in development
    if (this.config.api.simulateDelay > 0) {
      // Store original _fetchWithRetry method
      const originalFetch = this.api._fetchWithRetry.bind(this.api);
      
      // Override with delayed version
      this.api._fetchWithRetry = async (...args) => {
        await new Promise(resolve => 
          setTimeout(resolve, this.config.api.simulateDelay)
        );
        
        if (this.config.api.simulateErrors && Math.random() > 0.8) {
          throw {
            response: {
              status: 500,
              data: { message: 'Simulated server error' }
            }
          };
        }
        
        return originalFetch(...args);
      };
    }
    
    // Make API instance available globally for debugging
    if (process.env.NODE_ENV === 'development') {
      window.api = this.api;
    }
  }
  
  /**
   * Initialiseer alle modules
   * @private
   */
  async _initializeModules() {
    // Maak een gedeeld modules object
    this.modules = {};
    
    try {
      // Toon laadstatus
      ui.showLoader(true, 'Initialiseren...');
      
      // Initialiseer Validator
      console.log('Initialiseer Validator...');
      this.modules.validator = new Validator({
        rules: this.config.validation,
        messages: {
          required: 'Dit veld is verplicht',
          email: 'Voer een geldig e-mailadres in',
          phone: 'Voer een geldig telefoonnummer in',
          minLength: 'Minimaal {0} karakters vereist',
          maxLength: 'Maximaal {0} karakters toegestaan',
          futureDate: 'Selecteer een datum in de toekomst'
        }
      });
      
      // Initialiseer Booking
      console.log('Initialiseer Booking module...');
      this.modules.booking = new Booking({
        api: this.api,
        ui,
        validator: this.modules.validator,
        pricing: this.config.pricing
      });
      
      console.log('Modules succesvol geïnitialiseerd');
      
    } catch (error) {
      console.error('Fout bij initialiseren modules:', error);
      throw new Error('Kon de vereiste modules niet initialiseren');
    }
  }
  
  /**
   * Laad initiële data voor de applicatie
   * @private
   */
  async _loadInitialData() {
    try {
      // Toon laadindicator
      ui.showLoader(true, 'Applicatie laden...');
      
      // Laad hier eventuele initiële data
      // Bijvoorbeeld: lijst van beschikbare locaties, gebruikersvoorkeuren, etc.
      
      console.log('Initiële data geladen');
      
    } catch (error) {
      console.error('Fout bij laden initiële data:', error);
      this._handleApiError(error);
    } finally {
      ui.hideLoader();
    }
  }
  
  /**
   * Stel event listeners in voor de applicatie
   * @private
   */
  _setupEventListeners() {
    // Online/offline detectie
    window.addEventListener('online', this._handleOnline);
    window.addEventListener('offline', this._handleOffline);
    
    // Toetsenbord shortcuts
    document.addEventListener('keydown', this._handleKeyDown);
    
    // Service Worker registratie voor PWA-functionaliteit
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker geregistreerd:', registration.scope);
          })
          .catch(error => {
            console.error('ServiceWorker registratie mislukt:', error);
          });
      });
    }
  }
  
  /**
   * Behandel online gebeurtenis
   * @private
   */
  _handleOnline() {
    ui.showSuccess('U bent weer online', 3000);
    
    // Probeer de applicatie opnieuw te initialiseren bij herstel van verbinding
    if (!this.initialized) {
      this.initialize();
    }
  }
  
  /**
   * Behandel offline gebeurtenis
   * @private
   */
  _handleOffline() {
    ui.showError('U bent offline. Sommige functies zijn mogelijk niet beschikbaar.');
  }
  
  /**
   * Behandel toetsaanslagen
   * @param {KeyboardEvent} event - Toetsaanslag gebeurtenis
   * @private
   */
  _handleKeyDown(event) {
    // Druk op F12 voor debug info
    if (event.key === 'F12') {
      console.log('=== DEBUG INFO ===');
      console.log('Configuratie:', this.config);
      console.log('Modules:', this.modules);
      console.log('Huidige boeking:', this.modules.booking?.currentBooking);
      console.log('Netwerk status:', navigator.onLine ? 'Online' : 'Offline');
    }
  }
  
  /**
   * Handle API errors
   * @param {Error} error - The error that occurred
   * @param {string} [customMessage] - Optional custom error message
   * @private
   */
  _handleApiError(error, customMessage) {
    // Use the handleApiError helper from the API module
    try {
      handleApiError(error);
    } catch (apiError) {
      console.error('Error handling API error:', apiError);
      
      // Fallback to default error handling
      const message = customMessage || this.config.ui.messages.genericError;
      this.modules.ui.showError(message);
    }
    
    // Re-throw the error for further processing if needed
    return error.message || 'An unknown error occurred';
  }
  
  /**
   * Toon een fatale foutmelding
   * @param {string} message - Foutbericht
   * @private
   */
  _showFatalError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'fatal-error';
    errorContainer.innerHTML = `
      <div class="fatal-error-content">
        <h2>Er is een fout opgetreden</h2>
        <p>${message}</p>
        <button id="reloadApp" class="btn btn-primary">Opnieuw proberen</button>
      </div>
    `;
    
    // Verberg de hoofdinhoud
    const appContent = document.getElementById('app');
    if (appContent) {
      appContent.style.display = 'none';
    }
    
    // Voeg de foutmelding toe aan de body
    document.body.appendChild(errorContainer);
    
    // Voeg event listener toe voor de herlaadknop
    const reloadButton = document.getElementById('reloadApp');
    if (reloadButton) {
      reloadButton.addEventListener('click', () => window.location.reload());
    }
  }
  
  /**
   * Behandel onbevoegde toegang (401)
   * @private
   */
  _handleUnauthorized() {
    // Toon inlogscherm of redirect naar inlogpagina
    ui.showError('Uw sessie is verlopen. Log opnieuw in.');
    
    // Voer hier eventuele logout-logica uit
    localStorage.removeItem('authToken');
    
    // Optioneel: redirect naar inlogpagina na vertraging
    setTimeout(() => {
      window.location.href = '/inloggen';
    }, 3000);
  }
  
  /**
   * Vernietig de applicatie en ruim resources op
   */
  destroy() {
    // Roep de destroy-methode van alle modules aan
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.destroy === 'function') {
        module.destroy();
      }
    });
    
    // Verwijder event listeners
    window.removeEventListener('online', this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);
    document.removeEventListener('keydown', this._handleKeyDown);
    
    this.initialized = false;
    this.modules = {};
    
    console.log('Applicatie opgeruimd');
  }
}

// Maak en initialiseer de applicatie als de DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
  // Toon laadstatus
  console.log('DOM is geladen, start applicatie...');
  
  try {
    // Maak een nieuwe instantie van de applicatie
    const app = new TaxiApp();
    
    // Maak de app beschikbaar in de browser console voor debugging
    window.app = app;
    
    // Start de applicatie
    app.initialize().catch(error => {
      console.error('Onverwachte fout in applicatie:', error);
      
      // Toon een algemene foutmelding aan de gebruiker
      const errorElement = document.createElement('div');
      errorElement.className = 'global-error';
      errorElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #f8d7da;
        color: #721c24;
        padding: 15px;
        text-align: center;
        z-index: 9999;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      
      errorElement.innerHTML = `
        <strong>Er is een fout opgetreden</strong>
        <p>${error.message || 'Onbekende fout'}</p>
        <button onclick="window.location.reload()" style="
          background: #721c24;
          color: white;
          border: none;
          padding: 5px 15px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 5px;
        ">Pagina verversen</button>
      `;
      
      document.body.prepend(errorElement);
    });
    
  } catch (error) {
    console.error('Kritieke fout bij opstarten applicatie:', error);
    
    // Toon een eenvoudige foutmelding als alles misgaat
    document.body.innerHTML = `
      <div style="
        max-width: 600px;
        margin: 50px auto;
        padding: 20px;
        text-align: center;
        font-family: Arial, sans-serif;
      ">
        <h1>Er is een fout opgetreden</h1>
        <p>De applicatie kan niet worden gestart. Vernieuw de pagina of probeer het later opnieuw.</p>
        <p>${error.message || ''}</p>
        <button onclick="window.location.reload()" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 20px;
        ">Pagina verversen</button>
      </div>
    `;
  }
});
