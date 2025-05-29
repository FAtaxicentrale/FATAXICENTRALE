/**
 * UI Module
 * Beheert alle UI-updates en interacties voor de applicatie
 */
export class UI {
  /**
   * Maakt een nieuwe UI instantie
   * @param {Object} config - Configuratieopties
   */
  constructor(config = {}) {
    // Standaard configuratie
    this.config = {
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
        genericError: 'Er is een fout opgetreden. Probeer het later opnieuw.'
      },
      
      // Callbacks
      onRetry: null,
      
      // Overschrijf met meegegeven configuratie
      ...config
    };
    
    // State
    this.isInitialized = false;
    this.isLoading = false;
    this.activeTimeouts = new Set();
    
    // DOM elementen cache
    this.elements = {};
    
    // Bind methodes
    this._handleErrorClose = this._handleErrorClose.bind(this);
    this._handleSuccessClose = this._handleSuccessClose.bind(this);
    this._handleRetry = this._handleRetry.bind(this);
  }
  
  /**
   * Initialiseer de UI-componenten
   * @returns {boolean} Of initialisatie succesvol was
   */
  initialize() {
    try {
      if (this.isInitialized) {
        console.warn('UI is al geïnitialiseerd');
        return true;
      }
      
      console.log('Initialiseer UI...');
      
      // Cache DOM-elementen
      this.elements = {
        loader: document.querySelector(this.config.loaderSelector),
        error: document.querySelector(this.config.errorSelector),
        success: document.querySelector(this.config.successSelector),
        form: document.querySelector(this.config.formSelector),
        priceDisplay: document.querySelector(this.config.priceDisplaySelector),
        bookingDetails: document.querySelector(this.config.bookingDetailsSelector),
        
        // Formuliervelden
        pickupInput: document.getElementById('pickup'),
        destinationInput: document.getElementById('destination'),
        dateInput: document.getElementById('date'),
        timeInput: document.getElementById('time'),
        nameInput: document.getElementById('name'),
        emailInput: document.getElementById('email'),
        phoneInput: document.getElementById('phone'),
        notesInput: document.getElementById('notes'),
        submitButton: document.querySelector(`${this.config.formSelector} button[type="submit"]`)
      };
      
      // Voeg event listeners toe
      this._setupEventListeners();
      
      // Markeer als geïnitialiseerd
      this.isInitialized = true;
      console.log('UI succesvol geïnitialiseerd');
      
      return true;
      
    } catch (error) {
      console.error('Fout bij initialiseren UI:', error);
      this.showError('Kon de gebruikersinterface niet initialiseren');
      return false;
    }
  }
  
  /**
   * Stel event listeners in
   * @private
   */
  _setupEventListeners() {
    // Foutmelding sluiten
    if (this.elements.error) {
      const closeBtn = this.elements.error.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', this._handleErrorClose);
      }
    }
    
    // Succesmelding sluiten
    if (this.elements.success) {
      const closeBtn = this.elements.success.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', this._handleSuccessClose);
      }
    }
  }
  
  /**
   * Toon een laadindicator
   * @param {boolean} show - Of de laadindicator getoond moet worden
   * @param {string} message - Optioneel bericht bij de laadindicator
   */
  showLoader(show = true, message = '') {
    try {
      if (!this.elements.loader) return;
      
      this.isLoading = show;
      
      if (show) {
        // Update bericht indien opgegeven
        if (message && this.elements.loader.querySelector('.loader-message')) {
          this.elements.loader.querySelector('.loader-message').textContent = message;
        }
        
        // Toon de laadindicator
        this.elements.loader.style.display = 'flex';
        setTimeout(() => {
          this.elements.loader.classList.add('active');
        }, 10);
        
        // Schakel het formulier uit tijdens het laden
        if (this.elements.form) {
          this.elements.form.style.opacity = '0.7';
          this.elements.form.style.pointerEvents = 'none';
        }
      } else {
        // Verberg de laadindicator
        this.elements.loader.classList.remove('active');
        
        const hideLoader = () => {
          this.elements.loader.style.display = 'none';
          this.elements.loader.removeEventListener('transitionend', hideLoader);
        };
        
        this.elements.loader.addEventListener('transitionend', hideLoader);
        
        // Schakel het formulier weer in
        if (this.elements.form) {
          this.elements.form.style.opacity = '';
          this.elements.form.style.pointerEvents = '';
        }
      }
    } catch (error) {
      console.error('Fout bij tonen/verbergen laadindicator:', error);
    }
  }
  
  /**
   * Toon een foutmelding
   * @param {string|Error} message - Foutmelding of Error object
   * @param {number} duration - Hoe lang de melding zichtbaar blijft in ms (0 = permanent)
   */
  showError(message, duration = 5000) {
    try {
      if (!this.elements.error) return;
      
      // Verwijder bestaande timeouts voor foutmeldingen
      this._clearTimeouts('error');
      
      // Zet het foutbericht
      const errorMessage = message instanceof Error ? message.message : message;
      const messageElement = this.elements.error.querySelector('.message');
      if (messageElement) {
        messageElement.textContent = errorMessage;
      }
      
      // Toon de foutmelding
      this.elements.error.style.display = 'block';
      setTimeout(() => {
        this.elements.error.classList.add('active');
      }, 10);
      
      // Verberg na opgegeven duur (tenzij duration 0 is)
      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          this.hideError();
          this.activeTimeouts.delete(timeoutId);
        }, duration);
        
        this.activeTimeouts.add(timeoutId);
      }
      
    } catch (error) {
      console.error('Fout bij tonen foutmelding:', error);
    }
  }
  
  /**
   * Verberg de foutmelding
   */
  hideError() {
    if (!this.elements.error) return;
    
    this.elements.error.classList.remove('active');
    
    const hideError = () => {
      this.elements.error.style.display = 'none';
      this.elements.error.removeEventListener('transitionend', hideError);
    };
    
    this.elements.error.addEventListener('transitionend', hideError);
  }
  
  /**
   * Toon een succesmelding
   * @param {string} message - Succesbericht
   * @param {number} duration - Hoe lang de melding zichtbaar blijft in ms (0 = permanent)
   */
  showSuccess(message = '', duration = 5000) {
    try {
      if (!this.elements.success) return;
      
      // Verwijder bestaande timeouts voor succesmeldingen
      this._clearTimeouts('success');
      
      // Zet het succesbericht
      const messageElement = this.elements.success.querySelector('.message');
      if (messageElement) {
        messageElement.textContent = message || this.config.messages.bookingSuccess;
      }
      
      // Toon de succesmelding
      this.elements.success.style.display = 'block';
      setTimeout(() => {
        this.elements.success.classList.add('active');
      }, 10);
      
      // Verberg na opgegeven duur (tenzij duration 0 is)
      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          this.hideSuccess();
          this.activeTimeouts.delete(timeoutId);
        }, duration);
        
        this.activeTimeouts.add(timeoutId);
      }
      
    } catch (error) {
      console.error('Fout bij tonen succesmelding:', error);
    }
  }
  
  /**
   * Verberg de succesmelding
   */
  hideSuccess() {
    if (!this.elements.success) return;
    
    this.elements.success.classList.remove('active');
    
    const hideSuccess = () => {
      this.elements.success.style.display = 'none';
      this.elements.success.removeEventListener('transitionend', hideSuccess);
    };
    
    this.elements.success.addEventListener('transitionend', hideSuccess);
  }
  
  /**
   * Toon prijsinformatie
   * @param {Object} priceInfo - Prijsinformatie
   */
  showPrice(priceInfo) {
    if (!this.elements.priceDisplay) return;
    
    try {
      const { amount, currency = 'EUR', estimatedDuration, isEstimate = true } = priceInfo;
      
      // Formatteer het bedrag
      const formattedAmount = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
      
      // Update de UI
      this.elements.priceDisplay.innerHTML = `
        <div class="price-amount">${formattedAmount}</div>
        ${estimatedDuration ? `<div class="price-duration">${estimatedDuration}</div>` : ''}
        <div class="price-note">${isEstimate ? 'Geschatte prijs' : 'Definitieve prijs'}</div>
      `;
      
      // Toon de prijs
      this.elements.priceDisplay.style.display = 'block';
      
    } catch (error) {
      console.error('Fout bij tonen prijs:', error);
      this.showError('Kon prijsinformatie niet tonen');
    }
  }
  
  /**
   * Toon boekingsdetails
   * @param {Object} booking - Boekingsgegevens
   */
  showBookingDetails(booking) {
    if (!this.elements.bookingDetails) return;
    
    try {
      const { reference, pickup, destination, date, time, price, driver, vehicle } = booking;
      
      // Formatteer de datum
      const formattedDate = new Date(date).toLocaleDateString('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Formatteer het bedrag
      const formattedPrice = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
      
      // Update de UI
      this.elements.bookingDetails.innerHTML = `
        <div class="booking-header">
          <h3>Uw boeking is bevestigd</h3>
          <div class="booking-reference">Referentie: ${reference}</div>
        </div>
        
        <div class="booking-info">
          <div class="info-row">
            <span class="label">Van:</span>
            <span class="value">${pickup}</span>
          </div>
          <div class="info-row">
            <span class="label">Naar:</span>
            <span class="value">${destination}</span>
          </div>
          <div class="info-row">
            <span class="label">Datum:</span>
            <span class="value">${formattedDate} om ${time}</span>
          </div>
          <div class="info-row">
            <span class="label">Prijs:</span>
            <span class="value">${formattedPrice}</span>
          </div>
          
          ${driver ? `
          <div class="driver-info">
            <h4>Uw chauffeur</h4>
            <div class="driver-name">${driver.name}</div>
            <div class="driver-phone">${driver.phone}</div>
            ${vehicle ? `
            <div class="vehicle-info">
              ${vehicle.make} ${vehicle.model} (${vehicle.color}, ${vehicle.licensePlate})
            </div>
            ` : ''}
          </div>
          ` : ''}
        </div>
      `;
      
      // Toon de boekingsdetails
      this.elements.bookingDetails.style.display = 'block';
      
    } catch (error) {
      console.error('Fout bij tonen boekingsdetails:', error);
      this.showError('Kon boekingsdetails niet tonen');
    }
  }
  
  /**
   * Reset het formulier
   */
  resetForm() {
    if (!this.elements.form) return;
    
    try {
      this.elements.form.reset();
      
      // Reset eventuele validatiefouten
      const errorElements = this.elements.form.querySelectorAll('.error');
      errorElements.forEach(el => el.remove());
      
      // Verberg prijs en boekingsdetails
      if (this.elements.priceDisplay) {
        this.elements.priceDisplay.style.display = 'none';
      }
      
      if (this.elements.bookingDetails) {
        this.elements.bookingDetails.style.display = 'none';
      }
      
      // Focus op het eerste veld
      if (this.elements.pickupInput) {
        this.elements.pickupInput.focus();
      }
      
    } catch (error) {
      console.error('Fout bij resetten formulier:', error);
    }
  }
  
  /**
   * Toon validatiefouten voor een specifiek veld
   * @param {string} fieldName - Naam van het veld
   * @param {Array} errors - Lijst met foutmeldingen
   */
  showFieldErrors(fieldName, errors) {
    if (!errors || !errors.length) return;
    
    try {
      const field = this.elements[`${fieldName}Input`];
      if (!field) return;
      
      // Verwijder bestaande foutmeldingen
      this.clearFieldErrors(fieldName);
      
      // Voeg een foutklasse toe aan het veld
      field.classList.add('error');
      
      // Maak een foutcontainer aan
      const errorContainer = document.createElement('div');
      errorContainer.className = 'error-messages';
      
      // Voeg foutmeldingen toe
      errors.forEach(error => {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = error;
        errorContainer.appendChild(errorElement);
      });
      
      // Voeg de foutcontainer toe na het veld
      field.parentNode.insertBefore(errorContainer, field.nextSibling);
      
      // Scroll naar het eerste veld met een fout
      if (!this._hasScrolledToError) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this._hasScrolledToError = true;
      }
      
    } catch (error) {
      console.error(`Fout bij tonen fouten voor veld ${fieldName}:`, error);
    }
  }
  
  /**
   * Verwijder validatiefouten voor een specifiek veld
   * @param {string} fieldName - Naam van het veld
   */
  clearFieldErrors(fieldName) {
    try {
      const field = this.elements[`${fieldName}Input`];
      if (!field) return;
      
      // Verwijder foutklasse
      field.classList.remove('error');
      
      // Verwijder foutberichten
      const errorContainer = field.parentNode.querySelector('.error-messages');
      if (errorContainer) {
        errorContainer.remove();
      }
      
      // Reset de scroll-vlag als er geen fouten meer zijn
      const hasErrors = this.elements.form.querySelectorAll('.error-messages').length === 0;
      if (hasErrors) {
        this._hasScrolledToError = false;
      }
      
    } catch (error) {
      console.error(`Fout bij verwijderen fouten voor veld ${fieldName}:`, error);
    }
  }
  
  /**
   * Schakel het verzendknop in of uit
   * @param {boolean} enabled - Of de knop ingeschakeld moet zijn
   */
  setSubmitButtonState(enabled) {
    if (!this.elements.submitButton) return;
    
    this.elements.submitButton.disabled = !enabled;
    this.elements.submitButton.textContent = enabled ? 'Boek nu' : 'Bezig met verwerken...';
  }
  
  // ===== PRIVATE METHODS =====
  
  /**
   * Verwijder alle actieve timeouts
   * @private
   */
  _clearTimeouts(type = 'all') {
    this.activeTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(timeoutId);
    });
  }
  
  /**
   * Behandel het sluiten van de foutmelding
   * @private
   */
  _handleErrorClose() {
    this.hideError();
  }
  
  /**
   * Behandel het sluiten van de succesmelding
   * @private
   */
  _handleSuccessClose() {
    this.hideSuccess();
  }
  
  /**
   * Behandel het opnieuw proberen
   * @private
   */
  _handleRetry() {
    if (typeof this.config.onRetry === 'function') {
      this.config.onRetry();
    }
  }
  
  /**
   * Vernietig de UI en ruim resources op
   */
  destroy() {
    // Verwijder event listeners
    if (this.elements.error) {
      const closeBtn = this.elements.error.querySelector('.close');
      if (closeBtn) {
        closeBtn.removeEventListener('click', this._handleErrorClose);
      }
    }
    
    if (this.elements.success) {
      const closeBtn = this.elements.success.querySelector('.close');
      if (closeBtn) {
        closeBtn.removeEventListener('click', this._handleSuccessClose);
      }
    }
    
    // Verwijder timeouts
    this._clearTimeouts();
    
    // Reset de UI
    this.hideError();
    this.hideSuccess();
    this.hideLoader();
    
    // Reset de state
    this.isInitialized = false;
    this.isLoading = false;
    this.elements = {};
    
    console.log('UI succesvol opgeruimd');
  }
}

// Exporteer een singleton instantie
export const ui = new UI();
