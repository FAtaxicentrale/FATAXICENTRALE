/**
 * FormHandler Module
 * Handles form submission, data collection, and form manipulation
 */

class FormHandler {
  constructor(app) {
    this.app = app;
    this.form = document.getElementById('bookingForm');
    this.initialize();
  }

  /**
   * Initialize form handler
   */
  initialize() {
    if (!this.form) return;
    
    // Set up form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Set up input masks
    this.initializeInputMasks();
    
    // Set up address autocomplete
    this.initializeAddressAutocomplete();
    
    // Initialize date/time pickers
    this.initializeDateTimePickers();
  }

  /**
   * Handle form submission
   * @param {Event} e - The submit event
   */
  async handleSubmit(e) {
    e.preventDefault();
    
    if (!this.app.validator.validateForm()) {
      this.app.ui.showError('Controleer de ingevulde gegevens en probeer het opnieuw.');
      return;
    }
    
    try {
      this.app.ui.showLoader(true);
      
      // Get form data
      const formData = this.getFormData();
      
      // Here you would typically send the data to your backend
      console.log('Form data:', formData);
      
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

// Maak beschikbaar in het globale bereik
if (typeof window !== 'undefined') {
  window.FormHandler = FormHandler;
  
  // Maak een instantie beschikbaar als deze nodig is
  // Opmerking: Deze heeft mogelijk een app instantie nodig
  // window.formHandler = new FormHandler(app);
}
