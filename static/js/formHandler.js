/**
 * FormHandler Module
 * Behandelt het verzenden en valideren van het boekingsformulier
 */

class FormHandler {
  constructor(app) {
    this.app = app;
    this.form = document.getElementById('bookingForm');
    this.fields = {};
    this.isSubmitting = false;
    
    // Initialiseer de formulierhandler
    this.initialize();
  }
  
  /**
   * Initialiseer de formulierhandler
   */
  initialize() {
    if (!this.form) {
      console.error('Geen boekingsformulier gevonden');
      return;
    }
    
    // Verzamel alle formuliervelden
    this.collectFormFields();
    
    // Voeg event listeners toe
    this.addEventListeners();
    
    // Initialiseer validatie
    this.initializeValidation();
    
    console.log('Formulierhandler geïnitialiseerd');
  }
  
  /**
   * Verzamel alle formuliervelden
   */
  collectFormFields() {
    if (!this.form) return;
    
    // Verzamel alle input, select en textarea elementen
    const formElements = this.form.querySelectorAll('input, select, textarea');
    
    formElements.forEach(element => {
      const name = element.name || element.id;
      if (name) {
        this.fields[name] = {
          element,
          value: element.value,
          required: element.required,
          valid: !element.required, // Niet-verplichte velden zijn standaard geldig
          errors: []
        };
      }
    });
  }
  
  /**
   * Voeg event listeners toe aan het formulier en velden
   */
  addEventListeners() {
    if (!this.form) return;
    
    // Formulier verzending
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Input validatie bij blur
    Object.entries(this.fields).forEach(([name, field]) => {
      // Valideer bij blur (verlaten van veld)
      field.element.addEventListener('blur', () => this.validateField(name));
      
      // Update waarde bij input
      field.element.addEventListener('input', (e) => {
        this.fields[name].value = e.target.value;
        this.clearFieldError(name);
      });
    });
  }
  
  /**
   * Initialiseer validatie regels
   */
  initializeValidation() {
    // Voeg hier specifieke validatieregels toe indien nodig
    // Bijvoorbeeld:
    // this.addValidationRule('email', this.validateEmail);
  }
  
  /**
   * Valideer een specifiek veld
   * @param {string} fieldName - Naam van het te valideren veld
   * @returns {boolean} Of het veld geldig is
   */
  validateField(fieldName) {
    const field = this.fields[fieldName];
    if (!field) return true;
    
    // Reset bestaande fouten
    field.errors = [];
    field.valid = true;
    
    // Verplicht veld
    if (field.required && !field.value.trim()) {
      field.errors.push('Dit veld is verplicht');
      field.valid = false;
    }
    
    // E-mail validatie
    if (fieldName.toLowerCase().includes('email') && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        field.errors.push('Voer een geldig e-mailadres in');
        field.valid = false;
      }
    }
    
    // Telefoonnummer validatie (eenvoudig)
    if ((fieldName.toLowerCase().includes('phone') || fieldName.toLowerCase().includes('telefoon')) && field.value) {
      const phoneRegex = /^[0-9\s\-+()]{10,}$/;
      if (!phoneRegex.test(field.value)) {
        field.errors.push('Voer een geldig telefoonnummer in');
        field.valid = false;
      }
    }
    
    // Toon foutmeldingen indien van toepassing
    if (!field.valid) {
      this.showFieldError(fieldName, field.errors[0]);
    } else {
      this.clearFieldError(fieldName);
    }
    
    return field.valid;
  }
  
  /**
   * Valideer het hele formulier
   * @returns {boolean} Of het formulier geldig is
   */
  validateForm() {
    let isValid = true;
    
    // Valideer alle verplichte velden
    Object.keys(this.fields).forEach(fieldName => {
      const fieldIsValid = this.validateField(fieldName);
      if (!fieldIsValid) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  /**
   * Toon een foutmelding voor een veld
   * @param {string} fieldName - Naam van het veld
   * @param {string} message - Foutmelding
   */
  showFieldError(fieldName, message) {
    const field = this.fields[fieldName];
    if (!field) return;
    
    // Verwijder bestaande foutmeldingen
    this.clearFieldError(fieldName);
    
    // Voeg error klasse toe aan het veld
    field.element.classList.add('error');
    
    // Maak een foutmelding element aan
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.id = `${fieldName}Error`;
    
    // Voeg de foutmelding toe na het veld
    field.element.parentNode.insertBefore(errorElement, field.element.nextSibling);
  }
  
  /**
   * Verwijder foutmeldingen voor een veld
   * @param {string} fieldName - Naam van het veld
   */
  clearFieldError(fieldName) {
    const field = this.fields[fieldName];
    if (!field) return;
    
    // Verwijder error klasse
    field.element.classList.remove('error');
    
    // Verwijder foutmelding element
    const errorElement = document.getElementById(`${fieldName}Error`);
    if (errorElement) {
      errorElement.remove();
    }
  }
  
  /**
   * Verwerk het verzenden van het formulier
   * @param {Event} e - Submit event
   */
  async handleSubmit(e) {
    e.preventDefault();
    
    // Voorkom dubbele verzending
    if (this.isSubmitting) return;
    
    // Valideer het formulier
    if (!this.validateForm()) {
      console.error('Formulier bevat fouten');
      return;
    }
    
    // Markeer als bezig met verzenden
    this.isSubmitting = true;
    this.disableForm(true);
    
    try {
      // Verzamel formuliergegevens
      const formData = this.getFormData();
      
      // Roep de app aan om de boeking te verwerken
      const result = await this.app.submitBooking(formData);
      
      if (result.success) {
        // Toon bevestiging
        this.showSuccessMessage('Uw boeking is succesvol ontvangen!');
        
        // Reset het formulier
        this.form.reset();
        
        // Reset de veldwaarden in onze state
        Object.keys(this.fields).forEach(fieldName => {
          this.fields[fieldName].value = '';
        });
      } else {
        // Toon foutmelding
        this.showErrorMessage(result.message || 'Er is een fout opgetreden bij het verwerken van uw boeking.');
      }
    } catch (error) {
      console.error('Fout bij verzenden formulier:', error);
      this.showErrorMessage('Er is een onverwachte fout opgetreden. Probeer het later opnieuw.');
    } finally {
      // Herstel de formulierstatus
      this.isSubmitting = false;
      this.disableForm(false);
    }
  }
  
  /**
   * Verzamel gegevens uit het formulier
   * @returns {Object} Formuliergegevens
   */
  getFormData() {
    const formData = {};
    
    Object.entries(this.fields).forEach(([name, field]) => {
      // Sla alleen de waarde op als het veld een naam heeft
      if (name) {
        formData[name] = field.value;
      }
    });
    
    return formData;
  }
  
  /**
   * Schakel het formulier in of uit
   * @param {boolean} disabled - Of het formulier uitgeschakeld moet worden
   */
  disableForm(disabled) {
    if (!this.form) return;
    
    const elements = this.form.elements;
    for (let i = 0; i < elements.length; i++) {
      elements[i].disabled = disabled;
    }
    
    // Update de knoptekst
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      if (disabled) {
        submitButton.innerHTML = '<span class="spinner"></span> Verwerken...';
      } else {
        submitButton.textContent = 'Boek nu';
      }
    }
  }
  
  /**
   * Toon een succesbericht
   * @param {string} message - Bericht om weer te geven
   */
  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }
  
  /**
   * Toon een foutmelding
   * @param {string} message - Foutmelding om weer te geven
   */
  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }
  
  /**
   * Toon een bericht aan de gebruiker
   * @param {string} message - Bericht om weer te geven
   * @param {string} type - Type bericht ('success', 'error', 'info')
   */
  showMessage(message, type = 'info') {
    // Verwijder bestaande berichten
    const existingMessages = document.querySelectorAll('.form-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Maak een nieuw bericht element
    const messageElement = document.createElement('div');
    messageElement.className = `form-message ${type}`;
    messageElement.textContent = message;
    
    // Voeg het bericht toe aan de pagina
    const formContainer = this.form.parentElement;
    formContainer.insertBefore(messageElement, this.form);
    
    // Verwijder het bericht na 10 seconden
    setTimeout(() => {
      messageElement.remove();
    }, 10000);
  }
  
  /**
   * Vernietig de formulierhandler en ruim event listeners op
   */
  destroy() {
    if (this.form) {
      this.form.removeEventListener('submit', this.handleSubmit);
    }
    
    // Verwijder event listeners van velden
    Object.values(this.fields).forEach(field => {
      if (field.element) {
        field.element.removeEventListener('blur', this.validateField);
        field.element.removeEventListener('input', this.clearFieldError);
      }
    });
    
    this.fields = {};
    this.form = null;
  }
}

// Exporteer de klasse voor gebruik in andere modules
export { FormHandler };

// Maak beschikbaar in globaal bereik voor achterwaartse compatibiliteit
if (typeof window !== 'undefined') {
  window.FormHandler = FormHandler;
}
