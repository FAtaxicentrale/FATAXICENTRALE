/**
 * UI Module
 * Handles all UI updates and interactions
 */

export class UI {
  constructor() {
    // Cache DOM elements
    this.elements = {
      loader: document.getElementById('loader'),
      error: document.getElementById('error'),
      success: document.getElementById('success'),
      result: document.getElementById('result'),
      form: document.getElementById('bookingForm'),
      priceDisplay: document.getElementById('priceDisplay'),
      dateInput: document.getElementById('date'),
      timeInput: document.getElementById('time')
    };
  }

  /**
   * Initialize the UI
   */
  async initialize(managers = {}) {
    try {
      // Initialize managers
      this.mapManager = managers.mapManager || null;
      this.bookingManager = managers.bookingManager || null;
      
      // Initialize map if container and manager exist
      if (this.elements.mapContainer && this.mapManager) {
        this.initializeMap();
      }
      
      // Set minimum date to today
      const today = new Date().toISOString().split('T')[0];
      this.elements.dateInput.min = today;
      
      // Set default time to current time + 1 hour
      const now = new Date();
      now.setHours(now.getHours() + 1);
      this.elements.timeInput.value = now.toTimeString().slice(0, 5);
      
      // Initialize form validation
      this.setupFormValidation();
      
      // Initialize event listeners
      this.initializeEventListeners();
      
      console.log('UI initialized successfully');
    } catch (error) {
      console.error('Error initializing UI:', error);
      this.showError('Er is een fout opgetreden bij het initialiseren van de gebruikersinterface');
    }
  }
  
  /**
   * Initialize map functionality
   */
  initializeMap() {
    if (!this.mapManager) return;
    
    try {
      // Initialize map if not already done
      if (!this.mapManager.initialized) {
        this.mapManager.init();
      }
      
      // Add event listeners for address inputs if they exist
      if (this.elements.pickupInput) {
        this.elements.pickupInput.addEventListener('input', this.handleAddressInput);
      }
      
      if (this.elements.dropoffInput) {
        this.elements.dropoffInput.addEventListener('input', this.handleAddressInput);
      }
      
      // Add form submit handler
      if (this.elements.bookingForm) {
        this.elements.bookingForm.addEventListener('submit', this.handleSubmit);
      }
      
      console.log('Map functionality initialized');
    } catch (error) {
      console.error('Error initializing map:', error);
      this.showError('Er is een fout opgetreden bij het initialiseren van de kaart');
    }
  }
  
  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    if (!this.bookingManager) {
      console.error('Booking manager is not initialized');
      return;
    }
    
    try {
      this.showLoader('Bezig met verwerken...');
      
      // Submit the booking
      const result = await this.bookingManager.submit();
      
      if (result && result.success) {
        this.showSuccess('Boeking succesvol ingediend!');
        
        // Reset the form
        if (this.elements.bookingForm) {
          this.elements.bookingForm.reset();
        }
        
        // Update UI
        this.updatePriceDisplay(0);
      }
    } catch (error) {
      console.error('Booking submission failed:', error);
      this.showError(error.message || 'Er is een fout opgetreden bij het indienen van de boeking');
    } finally {
      this.hideLoader();
    }
  }
  
  /**
   * Handle address input for map updates
   */
  async handleAddressInput(event) {
    if (!this.mapManager) return;
    
    const input = event.target;
    const address = input.value.trim();
    
    if (!address || address.length < 3) return;
    
    try {
      // Check if this is pickup or dropoff input
      const isPickup = input.id === 'ophaaladres';
      
      // Update booking data
      if (this.bookingManager) {
        if (isPickup) {
          this.bookingManager.bookingData.pickupAddress = address;
        } else {
          this.bookingManager.bookingData.dropoffAddress = address;
        }
      }
      
      // Update map if we have both addresses
      if (this.bookingManager?.bookingData.pickupAddress && this.bookingManager?.bookingData.dropoffAddress) {
        await this.updateRouteOnMap(
          this.bookingManager.bookingData.pickupAddress,
          this.bookingManager.bookingData.dropoffAddress
        );
      }
    } catch (error) {
      console.error('Error handling address input:', error);
    }
  }

  /**
   * Initialize date and time picker
   */
  initializeDateTimePicker() {
    // Set minimum date to today
    if (this.elements.dateInput) {
      const today = new Date().toISOString().split('T')[0];
      this.elements.dateInput.min = today;
      
      // Set default time to current time + 1 hour
      const now = new Date();
      now.setHours(now.getHours() + 1);
      
      if (this.elements.timeInput) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.elements.timeInput.value = `${hours}:${minutes}`;
      }
    }
  }

  /**
   * Set up form validation
   */
  setupFormValidation() {
    if (!this.elements.form) return;
    
    const inputs = this.elements.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', (e) => this.validateField(e.target));
      input.addEventListener('input', (e) => {
        if (e.target.classList.contains('is-invalid')) {
          this.clearError(e.target);
        }
      });
    });
  }

  /**
   * Validate a single form field
   * @param {HTMLElement} field - The form field to validate
   * @returns {boolean} - Whether the field is valid
   */
  validateField(field) {
    if (!field) return true;
    
    let isValid = true;
    
    // Required validation
    if (field.required && !field.value.trim()) {
      this.showFieldError(field, 'Dit veld is verplicht');
      isValid = false;
    }
    
    // Email validation
    if (field.type === 'email' && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        this.showFieldError(field, 'Voer een geldig e-mailadres in');
        isValid = false;
      }
    }
    
    // Phone validation
    if (field.type === 'tel' && field.value) {
      const phoneRegex = /^[0-9\-\s+()]*$/;
      if (!phoneRegex.test(field.value)) {
        this.showFieldError(field, 'Voer een geldig telefoonnummer in');
        isValid = false;
      }
    }
    
    if (isValid) {
      this.clearError(field);
    }
    
    return isValid;
  }

  /**
   * Show error for a specific field
   * @param {HTMLElement} field - The form field
   * @param {string} message - The error message to display
   */
  showFieldError(field, message) {
    field.classList.add('is-invalid');
    
    // Add error message if it doesn't exist
    let errorElement = field.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('error-message')) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
    
    errorElement.textContent = message;
  }

  /**
   * Clear error for a specific field
   * @param {HTMLElement} field - The form field
   */
  clearError(field) {
    field.classList.remove('is-invalid');
    const errorElement = field.nextElementSibling;
    if (errorElement && errorElement.classList.contains('error-message')) {
      errorElement.remove();
    }
  }

  /**
   * Show loading state
   * @param {boolean} show - Whether to show or hide the loader
   */
  showLoader(show) {
    if (this.elements.loader) {
      this.elements.loader.style.display = show ? 'block' : 'none';
    }
    
    // Disable form elements while loading
    const formElements = this.elements.form?.elements || [];
    for (let i = 0; i < formElements.length; i++) {
      formElements[i].disabled = show;
    }
  }

  /**
   * Show error message
   * @param {string} message - The error message to display
   */
  showError(message) {
    if (this.elements.error) {
      this.elements.error.textContent = message;
      this.elements.error.classList.remove('hidden');
      
      // Hide after 5 seconds
      setTimeout(() => {
        this.elements.error.classList.add('hidden');
      }, 5000);
    }
  }

  /**
   * Show success message
   * @param {string} message - The success message to display
   */
  showSuccess(message) {
    if (this.elements.success) {
      this.elements.success.textContent = message;
      this.elements.success.classList.remove('hidden');
      
      // Hide after 5 seconds
      setTimeout(() => {
        this.elements.success.classList.add('hidden');
      }, 5000);
    }
  }

  /**
   * Show calculated price
   * @param {number} price - The calculated price
   */
  showPrice(price) {
    if (this.elements.result) {
      this.elements.result.innerHTML = `
        <div class="price-result">
          <h3>Geschatte prijs</h3>
          <div class="price">€${price.toFixed(2)}</div>
          <p class="small text-muted">Inclusief BTW en toeslagen</p>
          <button type="submit" class="btn btn-primary mt-2">
            Nu Boeken
          </button>
        </div>
      `;
    }
  }

  /**
   * Reset the form
   */
  resetForm() {
    if (this.elements.form) {
      this.elements.form.reset();
      
      // Reset any custom UI elements
      const stopsContainer = document.getElementById('stopsContainer');
      if (stopsContainer) {
        stopsContainer.innerHTML = '';
      }
      
      // Clear any error messages
      const errorMessages = this.elements.form.querySelectorAll('.error-message');
      errorMessages.forEach(msg => msg.remove());
      
      // Remove invalid classes
      const invalidFields = this.elements.form.querySelectorAll('.is-invalid');
      invalidFields.forEach(field => field.classList.remove('is-invalid'));
    }
  }

  /**
   * Toggle element visibility
   * @param {string} elementId - The ID of the element to toggle
   * @param {boolean} show - Whether to show or hide the element
   */
  toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Update form field value
   * @param {string} fieldId - The ID of the field to update
   * @param {string} value - The new value
   */
  updateField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value;
    }
  }
}

// Add error message styles to the head if they don't exist
if (!document.querySelector('style#error-styles')) {
  const style = document.createElement('style');
  style.id = 'error-styles';
  style.textContent = `
    .is-invalid {
      border-color: #dc3545 !important;
      padding-right: calc(1.5em + 0.75rem);
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right calc(0.375em + 0.1875rem) center;
      background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
    }
    .error-message {
      width: 100%;
      margin-top: 0.25rem;
      font-size: 0.875em;
      color: #dc3545;
    }
  `;
  document.head.appendChild(style);
}