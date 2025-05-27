/**
 * FA Taxi Boeking Applicatie
 * Hoofdingangspunt van de applicatie
 */

// Gebruik globale variabelen in plaats van imports
const MapManager = window.MapManager;
const AddressSuggestions = window.AddressSuggestions;
const PriceCalculator = window.PriceCalculator;
const FormHandler = window.FormHandler;
const LanguageSettings = window.LanguageSettings;

class App {
  constructor() {
    // Basis eigenschappen
    this.initialized = false;
    this.modules = {
      map: null,
      addressSuggestions: null,
      priceCalculator: null,
      formHandler: null
    };
    
    // Bind methoden
    this.initialize = this.initialize.bind(this);
    this.initializeMap = this.initializeMap.bind(this);
    this.initializeAddressSuggestions = this.initializeAddressSuggestions.bind(this);
    this.initializeForm = this.initializeForm.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.calculatePrice = this.calculatePrice.bind(this);
    this.showError = this.showError.bind(this);
    this.showSuccess = this.showSuccess.bind(this);
  }
  
  /**
   * Initialiseer de applicatie
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Initialiseren FA Taxi Boeking...');
      
      // Initialiseer kaart
      await this.initializeMap();
      
      // Initialiseer adressuggesties
      this.initializeAddressSuggestions();
      
      // Initialiseer prijscalculator
      this.initializePriceCalculator();
      
      // Initialiseer formulier
      this.initializeForm();
      
      this.initialized = true;
      console.log('FA Taxi Boeking succesvol geïnitialiseerd');
      
      // Verberg laadscherm indien aanwezig
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Fout bij initialiseren:', error);
      this.showError('Er is een fout opgetreden bij het initialiseren van de applicatie.');
    }
  }
  
  /**
   * Initialiseer de kaartmodule
   */
  async initializeMap() {
    try {
      this.modules.map = new MapManager();
      await this.modules.map.initializeMap('map');
      
      // Centreer op de huidige locatie van de gebruiker (indien toegestaan)
      try {
        await this.modules.map.centerOnUserLocation();
      } catch (error) {
        console.warn('Kon niet centreren op gebruikerslocatie:', error.message);
        // Standaardweergave instellen (bijv. Amsterdam)
        this.modules.map.map.setView([52.3676, 4.9041], 12);
      }
      
    } catch (error) {
      console.error('Fout bij initialiseren kaart:', error);
      throw new Error('Kon de kaart niet initialiseren. Vernieuw de pagina om het opnieuw te proberen.');
    }
  }
  
  /**
   * Initialiseer adressuggesties
   */
  initializeAddressSuggestions() {
    try {
      this.modules.addressSuggestions = new AddressSuggestions();
      
      // Initialiseer suggesties voor ophaaladres
      this.modules.addressSuggestions.init(
        'pickupAddress',
        'pickupSuggestions',
        (suggestion) => this.onAddressSelected(suggestion, 'pickup')
      );
      
      // Initialiseer suggesties voor afzetadres
      this.modules.addressSuggestions.init(
        'dropoffAddress',
        'dropoffSuggestions',
        (suggestion) => this.onAddressSelected(suggestion, 'dropoff')
      );
      
    } catch (error) {
      console.error('Fout bij initialiseren adressuggesties:', error);
      // Ga door zonder adressuggesties
    }
  }
  
  /**
   * Initialiseer de prijscalculator
   */
  initializePriceCalculator() {
    this.modules.priceCalculator = new PriceCalculator();
  }
  
  /**
   * Initialiseer het boekingsformulier
   */
  initializeForm() {
    try {
      this.modules.formHandler = new FormHandler(this);
    } catch (error) {
      console.error('Fout bij initialiseren formulier:', error);
      throw new Error('Kon het boekingsformulier niet initialiseren.');
    }
  }
  
  /**
   * Callback voor geselecteerd adres
   * @param {Object} suggestion - Geselecteerde adressuggestie
   * @param {string} type - Type adres ('pickup' of 'dropoff')
   */
  onAddressSelected(suggestion, type) {
    if (!suggestion || !this.modules.map) return;
    
    const { lat, lng } = suggestion;
    const markerOptions = {
      title: type === 'pickup' ? 'Ophaaladres' : 'Afzetadres',
      draggable: true
    };
    
    // Update marker op de kaart
    if (type === 'pickup') {
      if (this.pickupMarker) {
        this.modules.map.removeLayer(this.pickupMarker);
      }
      this.pickupMarker = this.modules.map.addMarker([lat, lng], markerOptions);
      
      // Centreer kaart op het geselecteerde adres
      this.modules.map.map.setView([lat, lng], 15);
      
    } else {
      if (this.dropoffMarker) {
        this.modules.map.removeLayer(this.dropoffMarker);
      }
      this.dropoffMarker = this.modules.map.addMarker([lat, lng], markerOptions);
    }
    
    // Als beide adressen zijn geselecteerd, bereken dan de route
    if (this.pickupMarker && this.dropoffMarker) {
      this.calculateRoute();
    }
  }
  
  /**
   * Bereken de route tussen ophaal- en afzetadres
   */
  async calculateRoute() {
    if (!this.pickupMarker || !this.dropoffMarker) return;
    
    try {
      const start = this.pickupMarker.getLatLng();
      const end = this.dropoffMarker.getLatLng();
      
      // Toon laadindicator
      this.showLoading('Route wordt berekend...');
      
      // Bereken route
      const routeInfo = await this.modules.map.showRoute(
        [start.lat, start.lng],
        [end.lat, end.lng]
      );
      
      // Bereken prijs
      if (routeInfo) {
        this.calculatePrice(routeInfo.distance, routeInfo.duration);
      }
      
      // Verberg laadindicator
      this.hideLoading();
      
    } catch (error) {
      console.error('Fout bij berekenen route:', error);
      this.showError('Kon de route niet berekenen. Controleer de adressen en probeer het opnieuw.');
      this.hideLoading();
    }
  }
  
  /**
   * Bereken de prijs voor een rit
   * @param {number} distance - Afstand in kilometers
   * @param {number} duration - Duur in minuten
   */
  calculatePrice(distance, duration) {
    if (!this.modules.priceCalculator) return;
    
    try {
      // Bereken basisprijs
      const priceInfo = this.modules.priceCalculator.calculateTotalPrice({
        distance,
        duration,
        dateTime: new Date(),
        paymentMethod: 'pin',
        passengers: parseInt(document.getElementById('passengers')?.value) || 1,
        isAirport: this.isAirportDestination()
      });
      
      // Update de prijsweergave
      this.updatePriceDisplay(priceInfo);
      
    } catch (error) {
      console.error('Fout bij berekenen prijs:', error);
    }
  }
  
  /**
   * Controleer of de bestemming een luchthaven is
   * @returns {boolean} Of de bestemming een luchthaven is
   */
  isAirportDestination() {
    const dropoffInput = document.getElementById('dropoffAddress');
    if (!dropoffInput) return false;
    
    const airportNames = this.modules.priceCalculator.surcharges.airport.locations;
    return airportNames.some(airport => 
      dropoffInput.value.toLowerCase().includes(airport.toLowerCase())
    );
  }
  
  /**
   * Update de prijsweergave in de UI
   * @param {Object} priceInfo - Prijsinformatie
   */
  updatePriceDisplay(priceInfo) {
    // Update de prijsweergave
    const priceElement = document.getElementById('priceEstimate');
    if (priceElement) {
      priceElement.textContent = priceInfo.formatted;
    }
    
    // Toon eventuele toeslagen
    this.updateSurchargesDisplay(priceInfo.surcharges);
  }
  
  /**
   * Update de weergave van toeslagen
   * @param {Object} surcharges - Toeslaginformatie
   */
  updateSurchargesDisplay(surcharges) {
    const container = document.getElementById('surchargesContainer');
    if (!container) return;
    
    // Maak de container leeg
    container.innerHTML = '';
    
    // Voeg elke toeslag toe
    Object.entries(surcharges).forEach(([key, value]) => {
      if (value > 0) {
        const item = document.createElement('div');
        item.className = 'surcharge-item';
        item.innerHTML = `
          <span class="surcharge-label">${this.getSurchargeLabel(key)}:</span>
          <span class="surcharge-value">€${value.toFixed(2)}</span>
        `;
        container.appendChild(item);
      }
    });
  }
  
  /**
   * Haal een leesbaar label op voor een toeslag
   * @param {string} key - Toeslagsleutel
   * @returns {string} Leesbaar label
   */
  getSurchargeLabel(key) {
    const labels = {
      night: 'Nachttoeslag',
      weekend: 'Weekendtoeslag',
      holiday: 'Feestdagtoeslag',
      airport: 'Luchthaventoeslag',
      payment: 'Betaalmethode',
      extraPassenger: 'Extra passagiers',
      luggage: 'Bagage',
      pets: 'Huisdieren',
      waiting: 'Wachttijd'
    };
    
    return labels[key] || key;
  }
  
  /**
   * Handvat voor het indienen van het formulier
   * @param {Object} formData - Formuliergegevens
   * @returns {Promise<Object>} Resultaat van de boeking
   */
  async submitBooking(formData) {
    console.log('Boeking verzonden:', formData);
    
    // Hier zou je de boeking naar de server sturen
    // Dit is een mock-implementatie
    try {
      // Simuleer een netwerkverzoek
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Controleer of er een fout moet worden gesimuleerd (voor testdoeleinden)
      if (formData.email && formData.email.includes('error')) {
        throw new Error('Er is een fout opgetreden bij het verwerken van uw boeking.');
      }
      
      // Retourneer succes
      return {
        success: true,
        bookingId: 'BK' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        message: 'Uw boeking is succesvol ontvangen!'
      };
      
    } catch (error) {
      console.error('Fout bij verzenden boeking:', error);
      return {
        success: false,
        message: error.message || 'Er is een fout opgetreden bij het verwerken van uw boeking.'
      };
    }
  }
  
  /**
   * Toon een foutmelding
   * @param {string} message - Foutmelding
   */
  showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
      
      // Verberg na 10 seconden
      setTimeout(() => {
        errorContainer.style.display = 'none';
      }, 10000);
    } else {
      alert(message); // Fallback
    }
  }
  
  /**
   * Toon een succesbericht
   * @param {string} message - Succesbericht
   */
  showSuccess(message) {
    const successContainer = document.getElementById('successContainer');
    if (successContainer) {
      successContainer.textContent = message;
      successContainer.style.display = 'block';
      
      // Verberg na 10 seconden
      setTimeout(() => {
        successContainer.style.display = 'none';
      }, 10000);
    } else {
      alert(message); // Fallback
    }
  }
  
  /**
   * Toon een laadindicator
   * @param {string} message - Bericht bij de laadindicator
   */
  showLoading(message = 'Even geduld...') {
    let loadingElement = document.getElementById('loadingIndicator');
    
    if (!loadingElement) {
      loadingElement = document.createElement('div');
      loadingElement.id = 'loadingIndicator';
      loadingElement.className = 'loading-indicator';
      loadingElement.innerHTML = `
        <div class="spinner"></div>
        <div class="message">${message}</div>
      `;
      document.body.appendChild(loadingElement);
    } else {
      loadingElement.querySelector('.message').textContent = message;
      loadingElement.style.display = 'flex';
    }
  }
  
  /**
   * Verberg de laadindicator
   */
  hideLoading() {
    const loadingElement = document.getElementById('loadingIndicator');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }
  
  /**
   * Vernietig de applicatie en ruim eventuele resources op
   */
  destroy() {
    // Vernietig modules
    if (this.modules.map) {
      this.modules.map.destroy();
    }
    
    if (this.modules.addressSuggestions) {
      this.modules.addressSuggestions.destroy();
    }
    
    if (this.modules.formHandler) {
      this.modules.formHandler.destroy();
    }
    
    // Verwijder eventuele event listeners
    window.removeEventListener('resize', this.handleResize);
    
    this.initialized = false;
    console.log('Applicatie opgeruimd');
  }
}

// Maak een enkele instantie van de app beschikbaar
const app = new App();

// Initialiseer de app wanneer het DOM geladen is
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
  app.initialize();
}

// Maak de app beschikbaar in het globale bereik voor debugging
export default app;
