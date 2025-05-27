/**
 * FA Taxi Booking Application
 * Main Entry Point
 */

class App {
  constructor() {
    console.log('Initializing App...');
    this.map = null;
    this.routeLayer = null;
    this.startMarker = null;
    this.endMarker = null;
    
    // Initialize with global instances or create new ones if needed
    this.translations = window.translations || new window.Translations();
    this.draftManager = window.draftManager || new window.DraftManager();
    this.addressSuggestions = window.addressSuggesties || new window.AddressSuggestions();
    
    // Initialize the app
    this.initializeApp().catch(error => {
      console.error('Failed to initialize app:', error);
      this.showError('Er is een fout opgetreden bij het opstarten van de applicatie.');
    });
  }

  async initializeApp() {
    console.log('Initializing application components...');
    
    try {
      // Initialize language settings
      await this.setupLanguage();
      
      // Initialize map
      if (typeof this.initMap === 'function') {
        await this.initMap();
      } else {
        console.warn('initMap method not found');
      }
      
      // Set up event listeners
      if (typeof this.setupEventListeners === 'function') {
        this.setupEventListeners();
      } else {
        console.warn('setupEventListeners method not found');
      }
      
      // Initialize draft manager
      if (typeof this.initDraftManager === 'function') {
        await this.initDraftManager();
      } else {
        console.warn('initDraftManager method not found');
      }
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Error in initializeApp:', error);
      this.showError('Er is een fout opgetreden bij het initialiseren van de applicatie: ' + error.message);
      throw error; // Re-throw to be caught by the constructor
    }
  }
  
  // Setup language settings
  async setupLanguage() {
    console.log('Setting up language...');
    try {
      // Default to Dutch if no language is set
      const defaultLanguage = 'nl';
      const savedLanguage = localStorage.getItem('preferredLanguage') || defaultLanguage;
      
      if (this.translations && typeof this.translations.setLanguage === 'function') {
        await this.translations.setLanguage(savedLanguage);
        console.log(`Language set to: ${savedLanguage}`);
      } else {
        console.warn('Translations module not properly initialized');
      }
      
      // Update the UI to reflect the current language
      this.updateUILanguage(savedLanguage);
      
    } catch (error) {
      console.error('Error in setupLanguage:', error);
      throw error;
    }
  }
  
  // Update UI elements based on language
  updateUILanguage(language) {
    console.log(`Updating UI for language: ${language}`);
    // Add code here to update UI elements based on language
    // For example: document.documentElement.lang = language;
  }
  
  // Show error message to the user
  showError(message, elementId = 'error-message') {
    console.error('Showing error to user:', message);
    
    // Try to find the error container
    let errorContainer = document.getElementById(elementId);
    
    // Create error container if it doesn't exist
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.id = elementId;
      errorContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        background-color: #ffebee;
        color: #d32f2f;
        border: 1px solid #ef9a9a;
        border-radius: 4px;
        max-width: 400px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      `;
      document.body.appendChild(errorContainer);
    }
    
    // Set the error message
    errorContainer.textContent = message;
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 10000);
    
    return errorContainer;
  }

  // Initialize map
  async initMap() {
    console.log('Initializing map...');
    try {
      if (window.MapManager) {
        this.map = new window.MapManager('map', {
          zoom: 12,
          center: [52.3676, 4.9041] // Amsterdam als standaard
        });
        console.log('Map initialized');
      } else {
        console.warn('MapManager not available');
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      throw error;
    }
  }

  // Set up event listeners
  setupEventListeners() {
    console.log('Setting up event listeners...');
    try {
      // Voorbeeld: document.getElementById('someButton').addEventListener('click', ...)
      console.log('Event listeners set up');
    } catch (error) {
      console.error('Error setting up event listeners:', error);
      throw error;
    }
  }

  // Initialize draft manager
  async initDraftManager() {
    console.log('Initializing draft manager...');
    try {
      if (this.draftManager && typeof this.draftManager.load === 'function') {
        await this.draftManager.load();
        console.log('Draft manager initialized');
      } else {
        console.warn('DraftManager not properly initialized');
      }
    } catch (error) {
      console.error('Error initializing draft manager:', error);
      throw error;
    }
  }

  // Initialize the application when the DOM is loaded
  static initialize() {
    console.log('App.initialize() called');
    try {
      // Check if app is already initialized
      if (window.app) {
        console.warn('App is already initialized');
        return window.app;
      }
      
      // Create and expose the app instance
      const app = new App();
      window.app = app;

      // Initialize global components if they exist
      if (window.FormHandler && typeof window.FormHandler === 'function') {
        try {
          window.formHandler = new window.FormHandler(app);
          console.log('FormHandler initialized');
        } catch (error) {
          console.error('Error initializing FormHandler:', error);
        }
      } else {
        console.warn('FormHandler not found');
      }

      if (window.idealPayment && typeof window.idealPayment.initialize === 'function') {
        try {
          window.idealPayment.initialize();
          console.log('iDEAL Payment initialized');
        } catch (error) {
          console.error('Error initializing iDEAL Payment:', error);
        }
      } else {
        console.warn('iDEAL Payment not found');
      }
      
      // Set default language
      if (window.languageSettings) {
        const userLang = (navigator.language || 'nl').split('-')[0];
        window.languageSettings.setLanguage(userLang === 'nl' ? 'nl' : 'en');
      }
      
      console.log('Application initialized successfully');
      return app;
    } catch (error) {
      console.error('Error initializing application:', error);
      const errorElement = document.createElement('div');
      errorElement.className = 'global-error';
      errorElement.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; z-index: 10000;';
      errorElement.textContent = 'Er is een fout opgetreden bij het initialiseren van de applicatie. Vernieuw de pagina of neem contact op met de beheerder.';
      document.body.appendChild(errorElement);
    }
  }
}

// Initialize the application when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.initialize());
} else {
  // DOMContentLoaded has already fired
  App.initialize();
}
