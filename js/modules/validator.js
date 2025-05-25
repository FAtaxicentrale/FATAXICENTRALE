/**
 * Validator Module
 * Handles form validation and data integrity
 */

export class Validator {
  constructor() {
    this.requiredFields = [
      'pickup',
      'dropoff',
      'date',
      'time',
      'passengers',
      'name',
      'email',
      'phone'
    ];
    
    this.validationRules = {
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Voer een geldig e-mailadres in'
      },
      phone: {
        pattern: /^[0-9\-\s+()]*$/,
        message: 'Voer een geldig telefoonnummer in'
      },
      date: {
        validator: (value) => {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selectedDate >= today;
        },
        message: 'Datum mag niet in het verleden liggen'
      },
      time: {
        validator: (value, formData) => {
          if (!formData.date) return true;
          
          const selectedDate = new Date(formData.date);
          const [hours, minutes] = value.split(':').map(Number);
          selectedDate.setHours(hours, minutes, 0, 0);
          
          const now = new Date();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // If selected date is today, check if time is in the future
          if (selectedDate.getDate() === today.getDate() && 
              selectedDate.getMonth() === today.getMonth() &&
              selectedDate.getFullYear() === today.getFullYear()) {
            return selectedDate > now;
          }
          
          return true;
        },
        message: 'Tijd moet in de toekomst liggen'
      },
      passengers: {
        validator: (value) => {
          const num = parseInt(value, 10);
          return !isNaN(num) && num > 0 && num <= 8;
        },
        message: 'Aantal passagiers moet tussen 1 en 8 liggen'
      }
    };
  }

  /**
   * Validate the entire form
   * @param {boolean} skipOptional - Whether to skip optional fields
   * @returns {boolean} - Whether the form is valid
   */
  validateForm(skipOptional = false) {
    let isValid = true;
    const formData = this.getFormData();
    
    // Validate required fields
    for (const field of this.requiredFields) {
      const element = document.getElementById(field);
      if (!element) continue;
      
      const value = formData[field];
      
      // Skip validation for hidden or disabled fields
      if (element.offsetParent === null || element.disabled) {
        continue;
      }
      
      // Check if field is required and empty
      if ((!value || (typeof value === 'string' && !value.trim())) && element.required) {
        this.showFieldError(element, 'Dit veld is verplicht');
        isValid = false;
        continue;
      }
      
      // Apply specific validation rules if they exist
      if (this.validationRules[field]) {
        const rule = this.validationRules[field];
        
        if (rule.pattern && !rule.pattern.test(value)) {
          this.showFieldError(element, rule.message);
          isValid = false;
        } else if (typeof rule.validator === 'function') {
          const validationResult = rule.validator(value, formData);
          if (validationResult !== true) {
            this.showFieldError(element, rule.message);
            isValid = false;
          }
        }
      }
    }
    
    // Additional validation for stops
    if (!skipOptional) {
      const stops = document.querySelectorAll('.stop-input');
      stops.forEach((stop, index) => {
        if (stop && !stop.value.trim()) {
          this.showFieldError(stop, 'Vul een geldig adres in of verwijder deze tussenstop');
          isValid = false;
        }
      });
    }
    
    return isValid;
  }

  /**
   * Get form data as an object
   * @returns {Object} - Form data
   */
  getFormData() {
    const form = document.getElementById('bookingForm');
    if (!form) return {};
    
    const formData = new FormData(form);
    const data = {};
    
    // Convert FormData to plain object
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    // Add stops to the data
    const stops = [];
    document.querySelectorAll('.stop-input').forEach((stop, index) => {
      if (stop.value.trim()) {
        stops.push(stop.value.trim());
      }
    });
    
    if (stops.length > 0) {
      data.stops = stops;
    }
    
    return data;
  }

  /**
   * Show error for a specific field
   * @param {HTMLElement} field - The form field
   * @param {string} message - The error message to display
   */
  showFieldError(field, message) {
    if (!field) return;
    
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
   * Clear all validation errors
   */
  clearAllErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());
    
    const invalidFields = document.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => field.classList.remove('is-invalid'));
  }

  /**
   * Validate a single field
   * @param {string} fieldId - The ID of the field to validate
   * @returns {boolean} - Whether the field is valid
   */
  validateField(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return true;
    
    const value = field.value;
    const rule = this.validationRules[fieldId];
    
    // Clear previous error
    this.clearFieldError(field);
    
    // Check if field is required and empty
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      this.showFieldError(field, 'Dit veld is verplicht');
      return false;
    }
    
    // Skip further validation if field is empty and not required
    if ((!value || (typeof value === 'string' && !value.trim())) && !field.required) {
      return true;
    }
    
    // Apply specific validation rules if they exist
    if (rule) {
      if (rule.pattern && !rule.pattern.test(value)) {
        this.showFieldError(field, rule.message);
        return false;
      } else if (typeof rule.validator === 'function') {
        const formData = this.getFormData();
        const validationResult = rule.validator(value, formData);
        if (validationResult !== true) {
          this.showFieldError(field, rule.message);
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Clear error for a specific field
   * @param {HTMLElement} field - The form field
   */
  clearFieldError(field) {
    if (!field) return;
    
    field.classList.remove('is-invalid');
    const errorElement = field.nextElementSibling;
    if (errorElement && errorElement.classList.contains('error-message')) {
      errorElement.remove();
    }
  }

  /**
   * Check if a date is valid
   * @param {string} dateString - The date string to validate
   * @returns {boolean} - Whether the date is valid
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Check if a time is valid
   * @param {string} timeString - The time string to validate (HH:MM format)
   * @returns {boolean} - Whether the time is valid
   */
  isValidTime(timeString) {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString);
  }
}
