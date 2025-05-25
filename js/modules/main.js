/**
 * FA Taxi Booking Application
 * Main Entry Point
 */

import { FormHandler } from './formHandler.js';
import { PriceCalculator } from './priceCalculator.js';
import { UI } from './ui.js';
import { Validator } from './validator.js';

class App {
  constructor() {
    this.initializeApp();
  }

  initializeApp() {
    // Initialize modules
    this.ui = new UI();
    this.validator = new Validator();
    this.formHandler = new FormHandler(this);
    this.priceCalculator = new PriceCalculator(this);

    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize UI components
    this.ui.initializeDateTimePicker();
    this.ui.setupFormValidation();
  }

  setupEventListeners() {
    // Form submission
    const form = document.getElementById('bookingForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Calculate price button
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => this.calculatePrice());
    }

    // Add stop button
    const addStopBtn = document.getElementById('addStopBtn');
    if (addStopBtn) {
      addStopBtn.addEventListener('click', () => this.addStop());
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    if (!this.validator.validateForm()) {
      return;
    }

    try {
      this.ui.showLoader(true);
      const formData = this.formHandler.getFormData();
      
      // In a real app, you would send this to your backend
      console.log('Submitting form:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.ui.showSuccess('Boeking succesvol ontvangen!');
      this.ui.resetForm();
    } catch (error) {
      console.error('Error submitting form:', error);
      this.ui.showError('Er is een fout opgetreden bij het verzenden van het formulier.');
    } finally {
      this.ui.showLoader(false);
    }
  }

  async calculatePrice() {
    if (!this.validator.validateForm(true)) {
      return;
    }

    try {
      this.ui.showLoader(true);
      const formData = this.formHandler.getFormData();
      
      // Calculate price (simulated)
      const price = await this.priceCalculator.calculatePrice(formData);
      
      // Show price to user
      this.ui.showPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
      this.ui.showError('Kon de prijs niet berekenen. Probeer het opnieuw.');
    } finally {
      this.ui.showLoader(false);
    }
  }

  addStop() {
    const stopId = `stop-${Date.now()}`;
    const stopHtml = `
      <div class="form-group stop-group" id="${stopId}" data-stop-id="${stopId}">
        <label for="stop-${stopId}">Tussenstop</label>
        <div class="input-group">
          <input type="text" id="stop-${stopId}" class="form-control stop-input" required>
          <button type="button" class="btn btn-secondary remove-stop" data-stop="${stopId}">
            Verwijder
          </button>
        </div>
      </div>
    `;
    
    const stopsContainer = document.getElementById('stopsContainer');
    if (stopsContainer) {
      stopsContainer.insertAdjacentHTML('beforeend', stopHtml);
      
      // Add event listener to the remove button
      const removeBtn = document.querySelector(`#${stopId} .remove-stop`);
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.target.closest('.stop-group').remove();
        });
      }
    }
  }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { App };
}