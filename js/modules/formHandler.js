/**
 * FormHandler Module
 * Behandelt formulierinzendingen, gegevensverzameling en formuliermanipulatie
 */

export class FormHandler {
  /**
   * Maakt een nieuwe FormHandler instantie
   * @param {Object} options - Configuratieopties
   * @param {string} options.formSelector - CSS selector voor het formulier
   * @param {Object} modules - Gedeelde modules (ui, validator, booking)
   */
  constructor({ formSelector, modules } = {}) {
    this.config = {
      formSelector: formSelector || '#bookingForm',
      inputSelectors: {
        pickup: '#pickup',
        destination: '#destination',
        date: '#date',
        time: '#time',
        name: '#name',
        email: '#email',
        phone: '#phone',
        passengers: '#passengers',
        notes: '#notes'
      }
    };
    
    this.modules = modules || {};
    this.form = null;
    this.elements = {};
    this.initialized = false;
    this.submitting = false;
    
    // Bind methodes
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.resetForm = this.resetForm.bind(this);
  }

  /**
   * Initialiseer de formulierhandler
   * @returns {Promise<boolean>} Of initialisatie succesvol was
   */
  async initialize() {
    try {
      // Zoek het formulier
      this.form = document.querySelector(this.config.formSelector);
      
      if (!this.form) {
        console.warn(`Geen formulier gevonden met selector "${this.config.formSelector}"`);
        return false;
      }
      
      // Cache formulierelementen
      this._cacheElements();
      
      // Voeg event listeners toe
      this._setupEventListeners();
      
      // Initialiseer UI componenten
      await this._initializeUIComponents();
      
      this.initialized = true;
      console.log('Formulierhandler geïnitialiseerd');
      return true;
      
    } catch (error) {
      console.error('Fout bij initialiseren formulierhandler:', error);
      this.modules.ui?.showError('Er is een fout opgetreden bij het laden van het formulier.');
      return false;
    }
  }
  
  /**
   * Cache DOM-elementen voor snellere toegang
   * @private
   */
  _cacheElements() {
    this.elements = {};
    
    // Cache alle inputvelden
    Object.entries(this.config.inputSelectors).forEach(([key, selector]) => {
      this.elements[key] = this.form.querySelector(selector);
    });
    
    // Cache andere belangrijke elementen
    this.elements.submitButton = this.form.querySelector('button[type="submit"]');
    this.elements.priceDisplay = document.getElementById('priceDisplay');
  }
  
  /**
   * Stel event listeners in
   * @private
   */
  _setupEventListeners() {
    // Formulierinzending
    this.form.addEventListener('submit', this.handleSubmit);
    
    // Live validatie bij input
    Object.values(this.elements).forEach(element => {
      if (element && element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.addEventListener('input', this.handleInput);
        element.addEventListener('blur', this.handleInput);
      }
    });
    
    // Prijsberekening bij wijziging van belangrijke velden
    const priceTriggerFields = ['pickup', 'destination', 'date', 'time', 'passengers'];
    priceTriggerFields.forEach(field => {
      const element = this.elements[field];
      if (element) {
        element.addEventListener('change', () => this._updatePrice());
      }
    });
  }
  
  /**
   * Initialiseer UI-componenten
   * @private
   */
  async _initializeUIComponents() {
    try {
      // Initialiseer datum- en tijdvelden
      this._setupDateTimeFields();
      
      // Initialiseer telefoonnummer masker
      this._setupPhoneMask();
      
      // Initialiseer adres suggesties
      await this._setupAddressAutocomplete();
      
    } catch (error) {
      console.error('Fout bij initialiseren UI-componenten:', error);
      throw error;
    }
  }
  
  /**
   * Stel datum- en tijdvelden in
   * @private
   */
  _setupDateTimeFields() {
    const { date, time } = this.elements;
    
    if (date) {
      // Stel minimale datum in op vandaag
      const today = new Date();
      date.min = today.toISOString().split('T')[0];
      
      // Als er nog geen waarde is, stel dan morgen in als standaard
      if (!date.value) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        date.value = tomorrow.toISOString().split('T')[0];
      }
    }
    
    if (time) {
      // Als er nog geen waarde is, stel dan het huidige tijdstip in
      if (!time.value) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        time.value = `${hours}:${minutes}`;
      }
    }
  }
  
  /**
   * Stel telefoonnummer masker in
   * @private
   */
  _setupPhoneMask() {
    const { phone } = this.elements;
    if (!phone) return;
    
    // Eenvoudige client-side validatie voor telefoonnummers
    phone.addEventListener('input', (e) => {
      // Alleen cijfers, spaties, +, - en haakjes toestaan
      e.target.value = e.target.value.replace(/[^0-9+\s\-\(\)]/g, '');
    });
  }
  
  /**
   * Stel adresautocomplete in
   * @private
   */
  async _setupAddressAutocomplete() {
    const { pickup, destination } = this.elements;
    
    // Implementeer hier de adresautocomplete logica
    // Dit zou een externe API kunnen gebruiken zoals Google Places of een andere geocoding service
    
    // Voorbeeld: basisimplementatie zonder externe afhankelijkheden
    [pickup, destination].forEach(input => {
      if (!input) return;
      
      input.addEventListener('focus', () => {
        // Toon suggesties of voer een zoekopdracht uit
        console.log(`Zoeken naar adressen voor: ${input.id}`);
      });
    });
  }
  
  /**
   * Behandel formulierinzending
   * @param {Event} e - Formulier submit event
   */
  async handleSubmit(e) {
    e.preventDefault();
    
    if (this.submitting) return;
    this.submitting = true;
    
    try {
      // Valideer het formulier
      const isValid = await this._validateForm();
      if (!isValid) {
        this.modules.ui?.showError('Controleer de rode velden en probeer het opnieuw.');
        return;
      }
      
      // Toon laadindicator
      this.modules.ui?.showLoader(true, 'Bezig met verwerken van uw boeking...');
      
      // Verzamel formuliergegevens
      const formData = this._collectFormData();
      
      // Verstuur de boeking
      const result = await this.modules.booking?.submitBooking(formData);
      
      if (result.success) {
        // Toon succesbericht
        this.modules.ui?.showSuccess('Uw boeking is succesvol ontvangen! Wij nemen zo snel mogelijk contact met u op.');
        
        // Reset het formulier
        this.resetForm();
      } else {
        // Toon foutmelding
        this.modules.ui?.showError(result.message || 'Er is een fout opgetreden bij het verwerken van uw boeking.');
      }
      
    } catch (error) {
      console.error('Fout bij verwerken formulier:', error);
      this.modules.ui?.showError('Er is een onverwachte fout opgetreden. Probeer het later opnieuw.');
    } finally {
      // Verberg laadindicator
      this.modules.ui?.showLoader(false);
      this.submitting = false;
    }
  }
  
  /**
   * Valideer het volledige formulier
   * @returns {boolean} Of het formulier geldig is
   * @private
   */
  async _validateForm() {
    if (!this.modules.validator) return true;
    
    // Verzamel alle veldwaarden
    const formValues = {};
    Object.entries(this.config.inputSelectors).forEach(([key]) => {
      if (this.elements[key]) {
        formValues[key] = this.elements[key].value.trim();
      }
    });
    
    // Valideer de velden
    const validationResult = await this.modules.validator.validateForm(formValues);
    
    // Markeer ongeldige velden
    if (validationResult.errors && Object.keys(validationResult.errors).length > 0) {
      this.modules.ui?.highlightErrors(validationResult.errors);
      return false;
    }
    
    return true;
  }
  
  /**
   * Verzamel gegevens uit het formulier
   * @returns {Object} Geformatteerde formuliergegevens
   * @private
   */
  _collectFormData() {
    const data = {};
    
    Object.entries(this.config.inputSelectors).forEach(([key]) => {
      if (this.elements[key]) {
        data[key] = this.elements[key].value.trim();
      }
    });
    
    // Voeg extra gegevens toe
    data.timestamp = new Date().toISOString();
    
    return data;
  }
  
  /**
   * Werk de prijsweergave bij
   * @private
   */
  async _updatePrice() {
    try {
      const { pickup, destination, date, time, passengers } = this.elements;
      
      // Controleer of alle benodigde velden zijn ingevuld
      if (!pickup?.value || !destination?.value || !date?.value || !time?.value) {
        return;
      }
      
      // Toon laadindicator
      this.modules.ui?.showLoader(true, 'Bezig met berekenen...');
      
      // Bereken de prijs (dit zou een API-call kunnen zijn)
      const priceData = {
        pickup: pickup.value,
        destination: destination.value,
        date: date.value,
        time: time.value,
        passengers: passengers?.value || 1
      };
      
      // Roep de booking module aan om de prijs te berekenen
      const price = await this.modules.booking?.calculatePrice(priceData);
      
      if (price !== undefined) {
        // Werk de UI bij met de nieuwe prijs
        this.modules.ui?.updatePriceDisplay(price);
      }
      
    } catch (error) {
      console.error('Fout bij bijwerken prijs:', error);
    } finally {
      // Verberg laadindicator
      this.modules.ui?.showLoader(false);
    }
  }
  
  /**
   * Behandel input events voor live validatie
   * @param {Event} e - Input event
   */
  handleInput(e) {
    if (!this.modules.validator) return;
    
    const field = e.target;
    const fieldName = field.name;
    
    if (!fieldName) return;
    
    // Valideer het veld
    const result = this.modules.validator.validateField(fieldName, field.value);
    
    // Werk de UI bij op basis van de validatieresultaten
    if (result.isValid) {
      field.classList.remove('is-invalid');
      
      // Verwijder eventuele foutmelding
      const errorElement = field.nextElementSibling;
      if (errorElement && errorElement.classList.contains('invalid-feedback')) {
        errorElement.remove();
      }
    } else {
      field.classList.add('is-invalid');
      
      // Toon foutmelding
      const existingError = field.nextElementSibling;
      if (existingError && existingError.classList.contains('invalid-feedback')) {
        existingError.textContent = result.message;
      } else {
        const errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback';
        errorElement.textContent = result.message;
        field.parentNode.insertBefore(errorElement, field.nextSibling);
      }
    }
  }
  
  /**
   * Reset het formulier naar de standaardwaarden
   */
  resetForm() {
    if (!this.form) return;
    
    this.form.reset();
    
    // Reset validatiefouten
    this.modules.ui?.clearErrorHighlights();
    
    // Reset prijsweergave
    if (this.elements.priceDisplay) {
      this.elements.priceDisplay.textContent = '€0,00';
    }
    
    // Reset datum en tijd naar standaardwaarden
    this._setupDateTimeFields();
  }

  /**
   * Verwerk formulierinzending
   * @param {Event} e - Het submit event
   * @returns {Promise<Object|boolean>} Formuliergegevens of false bij fout
   */
  async handleSubmit(e) {
    e.preventDefault();
    
    if (!this.initialized) {
      console.warn('Formulierhandler is niet geïnitialiseerd');
      return false;
    }
    
    try {
      // Valideer het formulier
      if (this.app.validator && !this.app.validator.validateForm()) {
        const errors = this.app.validator.getErrors?.() || [];
        console.warn('Formuliervalidatie mislukt:', errors);
        
        if (this.app.ui) {
          this.app.ui.showError('Controleer de gemarkeerde velden en probeer het opnieuw.');
          if (typeof this.app.ui.highlightErrors === 'function') {
            this.app.ui.highlightErrors(errors);
          }
        }
        
        return false;
      }
      
      // Toon laadindicator
      if (this.app.ui?.showLoader) {
        this.app.ui.showLoader(true, 'Bezig met verwerken...');
      }
      
      // Verzamel formuliergegevens
      const formData = this.getFormData();
      this.formData = formData;
      
      console.log('Formuliergegevens:', formData);
      
      // Trigger event voor andere modules
      const submitEvent = new CustomEvent('form:submit', { 
        detail: { formData },
        bubbles: true
      });
      this.form.dispatchEvent(submitEvent);
      
      return formData;
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      this.app.ui.showSuccess('Uw boeking is succesvol ontvangen!');
      
      // Reset form
      this.resetForm();
      
      // Show confirmation
      this.showBookingConfirmation(formData);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      this.app.ui.showError('Er is een fout opgetreden bij het verzenden van het formulier. Probeer het later opnieuw.');
    } finally {
      this.app.ui.showLoader(false);
    }
  }

  /**
   * Get form data as an object
   * @returns {Object} - Form data
   */
  getFormData() {
    if (!this.form) return {};
    
    const formData = new FormData(this.form);
    const data = {};
    
    // Convert FormData to plain object
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    // Add stops to the data
    const stops = [];
    document.querySelectorAll('.stop-input').forEach((stop, index) => {
      if (stop.value.trim()) {
        stops.push({
          id: stop.id,
          address: stop.value.trim()
        });
      }
    });
    
    if (stops.length > 0) {
      data.stops = stops;
    }
    
    return data;
  }

  /**
   * Reset the form
   */
  resetForm() {
    if (this.form) {
      this.form.reset();
    }
    
    // Clear any stops
    const stopsContainer = document.getElementById('stopsContainer');
    if (stopsContainer) {
      stopsContainer.innerHTML = '';
    }
    
    // Reset any UI elements
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
      resultDiv.innerHTML = '';
    }
    
    // Clear any validation errors
    this.app.validator.clearAllErrors();
  }

  /**
   * Show booking confirmation
   * @param {Object} bookingData - The booking data
   */
  showBookingConfirmation(bookingData) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;
    
    // Format booking details
    const formattedDate = new Date(bookingData.date).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Create confirmation HTML
    resultDiv.innerHTML = `
      <div class="confirmation">
        <div class="confirmation-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3>Bedankt voor uw boeking!</h3>
        <p>We hebben uw aanvraag ontvangen en nemen zo spoedig mogelijk contact met u op.</p>
        
        <div class="booking-details">
          <h4>Uw reservering</h4>
          <div class="detail-row">
            <span class="detail-label">Datum:</span>
            <span class="detail-value">${formattedDate} om ${bookingData.time}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Vanaf:</span>
            <span class="detail-value">${bookingData.pickup}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Naar:</span>
            <span class="detail-value">${bookingData.dropoff}</span>
          </div>
          ${bookingData.stops && bookingData.stops.length > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Tussenstops:</span>
              <ul class="stops-list">
                ${bookingData.stops.map(stop => `<li>${stop.address}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Aantal personen:</span>
            <span class="detail-value">${bookingData.passengers || 1}</span>
          </div>
        </div>
        
        <div class="confirmation-actions">
          <button id="newBookingBtn" class="btn btn-primary">Nieuwe boeking</button>
          <button id="printBookingBtn" class="btn btn-secondary">Afdrukken</button>
        </div>
      </div>
    `;
    
    // Add event listeners to buttons
    const newBookingBtn = document.getElementById('newBookingBtn');
    if (newBookingBtn) {
      newBookingBtn.addEventListener('click', () => {
        this.resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    
    const printBookingBtn = document.getElementById('printBookingBtn');
    if (printBookingBtn) {
      printBookingBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  /**
   * Add a stop to the journey
   */
  addStop() {
    const stopId = `stop-${Date.now()}`;
    const stopHtml = `
      <div class="form-group stop-group" id="stop-group-${stopId}" data-stop-id="${stopId}">
        <div class="input-group">
          <input type="text" id="${stopId}" class="form-control stop-input" 
                 placeholder="Vul tussenstop adres in" required>
          <button type="button" class="btn btn-danger remove-stop" data-stop="${stopId}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    const stopsContainer = document.getElementById('stopsContainer');
    if (stopsContainer) {
      stopsContainer.insertAdjacentHTML('beforeend', stopHtml);
      
      // Initialize autocomplete for the new stop
      this.initializeAddressAutocomplete(document.getElementById(stopId));
      
      // Add event listener to the remove button
      const removeBtn = document.querySelector(`#stop-group-${stopId} .remove-stop`);
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.removeStop(stopId);
        });
      }
    }
  }

  /**
   * Remove a stop from the journey
   * @param {string} stopId - The ID of the stop to remove
   */
  removeStop(stopId) {
    const stopElement = document.getElementById(`stop-group-${stopId}`);
    if (stopElement) {
      stopElement.remove();
    }
  }

  /**
   * Initialize input masks for phone numbers, etc.
   */
  initializeInputMasks() {
    // Phone number input
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        // Format as Dutch phone number: 06-12345678 or +31612345678
        if (value.startsWith('0')) {
          if (value.length > 2) {
            value = `${value.substring(0, 2)}-${value.substring(2)}`;
          }
          if (value.length > 10) {
            value = value.substring(0, 11);
          }
        } else if (value.startsWith('31')) {
          value = `+${value}`;
          if (value.length > 12) {
            value = value.substring(0, 12);
          }
        } else if (value.startsWith('+')) {
          if (value.length > 12) {
            value = value.substring(0, 12);
          }
        } else if (value.length > 10) {
          value = value.substring(0, 10);
        }
        
        e.target.value = value;
      });
    }
  }

  /**
   * Initialize address autocomplete
   * @param {HTMLElement} element - The input element to add autocomplete to (optional)
   */
  initializeAddressAutocomplete(element = null) {
    const inputs = element ? [element] : document.querySelectorAll('.address-input, .stop-input');
    
    inputs.forEach(input => {
      if (!input || input.dataset.autocompleteInitialized) return;
      
      // Mark as initialized
      input.dataset.autocompleteInitialized = 'true';
      
      // Add event listener for address input
      input.addEventListener('input', this.debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 3) return;
        
        try {
          // In a real app, you would call your geocoding API here
          // For example: const results = await geocodingService.search(query);
          
          // Simulated response
          const results = [
            { display_name: `${query}, Nederland`, lat: 52.37, lon: 4.89 },
            { display_name: `${query}straat, Amsterdam`, lat: 52.36, lon: 4.90 },
            { display_name: `${query}plein, Amsterdam`, lat: 52.35, lon: 4.91 }
          ];
          
          this.showAddressSuggestions(input, results);
        } catch (error) {
          console.error('Error fetching address suggestions:', error);
        }
      }, 300));
      
      // Hide suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!input.contains(e.target)) {
          this.hideAddressSuggestions(input);
        }
      });
    });
  }

  /**
   * Show address suggestions
   * @param {HTMLElement} input - The input element
   * @param {Array} suggestions - Array of address suggestions
   */
  showAddressSuggestions(input, suggestions) {
    // Remove existing suggestions
    this.hideAddressSuggestions(input);
    
    if (!suggestions || suggestions.length === 0) return;
    
    // Create suggestions container
    const container = document.createElement('div');
    container.className = 'address-suggestions';
    container.style.position = 'absolute';
    container.style.zIndex = '1000';
    container.style.width = '100%';
    container.style.maxHeight = '200px';
    container.style.overflowY = 'auto';
    container.style.backgroundColor = '#fff';
    container.style.border = '1px solid #ddd';
    container.style.borderRadius = '4px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
    // Position the container below the input
    const rect = input.getBoundingClientRect();
    container.style.top = `${rect.bottom + window.scrollY}px`;
    container.style.left = `${rect.left + window.scrollX}px`;
    container.style.width = `${rect.width}px`;
    
    // Add suggestions
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid #eee';
      item.textContent = suggestion.display_name;
      
      item.addEventListener('click', () => {
        input.value = suggestion.display_name;
        input.dataset.lat = suggestion.lat;
        input.dataset.lon = suggestion.lon;
        this.hideAddressSuggestions(input);
      });
      
      item.addEventListener('mouseover', () => {
        item.style.backgroundColor = '#f5f5f5';
      });
      
      item.addEventListener('mouseout', () => {
        item.style.backgroundColor = '';
      });
      
      container.appendChild(item);
    });
    
    // Add to document
    document.body.appendChild(container);
    input.dataset.suggestionsContainer = 'true';
  }

  /**
   * Hide address suggestions
   * @param {HTMLElement} input - The input element
   */
  hideAddressSuggestions(input) {
    const containers = document.querySelectorAll('.address-suggestions');
    containers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  }

  /**
   * Initialize date and time pickers
   */
  initializeDateTimePickers() {
    // Date picker
    const dateInput = document.getElementById('date');
    if (dateInput) {
      // Set minimum date to today
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
      
      // Set default date to today if not set
      if (!dateInput.value) {
        dateInput.value = today;
      }
    }
    
    // Time picker
    const timeInput = document.getElementById('time');
    if (timeInput && !timeInput.value) {
      // Set default time to next full hour
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      const hours = String(nextHour.getHours()).padStart(2, '0');
      const minutes = '00';
      timeInput.value = `${hours}:${minutes}`;
    }
  }

  /**
   * Debounce function to limit the rate at which a function is called
   * @param {Function} func - The function to debounce
   * @param {number} wait - The time to wait in milliseconds
   * @returns {Function} - The debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
