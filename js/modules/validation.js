/**
 * Validatiemodule voor het valideren van formulierinvoer
 * Bevat diverse validatiefuncties en hulpfuncties
 */

export class Validator {
  /**
   * Maakt een nieuwe Validator instantie
   * @param {Object} config - Configuratieopties voor validatieregels
   */
  constructor(config = {}) {
    // Standaard validatieregels
    this.defaultRules = {
      required: ['name', 'email', 'phone', 'pickup', 'destination', 'date', 'time'],
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
      ...config.rules
    };
    
    // Custom validatiefuncties
    this.customValidators = new Map();
    
    // Foutberichten
    this.messages = {
      required: 'Dit veld is verplicht',
      email: 'Voer een geldig e-mailadres in',
      phone: 'Voer een geldig telefoonnummer in',
      minLength: 'Minimaal {0} tekens vereist',
      maxLength: 'Maximaal {0} tekens toegestaan',
      date: 'Voer een geldige datum in',
      time: 'Voer een geldige tijd in',
      futureDate: 'Datum moet in de toekomst liggen',
      ...config.messages
    };
    
    // Cache voor veldregels
    this.fieldRules = new Map();
    
    // Initialiseer de validatieregels
    this._initRules();
    
    // Bind methodes
    this.validateField = this.validateField.bind(this);
    this.validateForm = this.validateForm.bind(this);
    this.addCustomRule = this.addCustomRule.bind(this);
    this._formatMessage = this._formatMessage.bind(this);
  }
  
  /**
   * Initialiseer de validatieregels
   * @private
   */
  _initRules() {
    // Converteer de standaardregels naar een efficiënter formaat
    for (const [ruleType, fields] of Object.entries(this.defaultRules)) {
      if (Array.isArray(fields)) {
        // Voor eenvoudige regels (required, email, phone)
        fields.forEach(field => {
          if (!this.fieldRules.has(field)) {
            this.fieldRules.set(field, []);
          }
          this.fieldRules.get(field).push({ type: ruleType });
        });
      } else if (typeof fields === 'object') {
        // Voor regels met parameters (minLength, maxLength)
        for (const [field, param] of Object.entries(fields)) {
          if (!this.fieldRules.has(field)) {
            this.fieldRules.set(field, []);
          }
          this.fieldRules.get(field).push({ 
            type: ruleType, 
            param,
            message: this._formatMessage(ruleType, param)
          });
        }
      }
    }
  }
  
  /**
   * Formatteer een foutmelding met parameters
   * @param {string} type - Het type validatieregel
   * @param {*} param - Parameter voor de validatieregel
   * @returns {string} Geformatteerd bericht
   * @private
   */
  _formatMessage(type, param = null) {
    if (!this.messages[type]) return 'Ongeldige invoer';
    
    if (typeof param !== 'undefined' && param !== null) {
      return this.messages[type].replace('{0}', param);
    }
    
    return this.messages[type];
  }
  
  /**
   * Voeg een aangepaste validatieregel toe
   * @param {string} name - Naam van de regel
   * @param {Function} validator - Validatiefunctie
   * @param {string} message - Optioneel aangepast foutbericht
   */
  addCustomRule(name, validator, message = null) {
    if (typeof validator !== 'function') {
      throw new Error('Validator moet een functie zijn');
    }
    
    this.customValidators.set(name, { validator, message });
  }
  
  /**
   * Valideer een individueel veld
   * @param {string} fieldName - Naam van het veld
   * @param {string} value - Waarde van het veld
   * @param {Object} formData - Optioneel volledig formulierobject voor context
   * @returns {Array} Lijst met foutmeldingen (leeg als geldig)
   */
  validateField(fieldName, value, formData = {}) {
    const errors = [];
    
    // Als er geen regels zijn voor dit veld, is het altijd geldig
    if (!this.fieldRules.has(fieldName)) {
      return [];
    }
    
    const rules = this.fieldRules.get(fieldName);
    
    for (const rule of rules) {
      const { type, param, message } = rule;
      let isValid = true;
      
      switch (type) {
        case 'required':
          isValid = this._validateRequired(value);
          break;
          
        case 'email':
          isValid = this._validateEmail(value);
          break;
          
        case 'phone':
          isValid = this._validatePhone(value);
          break;
          
        case 'minLength':
          isValid = this._validateMinLength(value, param);
          break;
          
        case 'maxLength':
          isValid = this._validateMaxLength(value, param);
          break;
          
        case 'date':
          isValid = this._validateDate(value);
          break;
          
        case 'time':
          isValid = this._validateTime(value);
          break;
          
        case 'futureDate':
          isValid = this._validateFutureDate(value);
          break;
          
        default:
          // Controleer op aangepaste validators
          if (this.customValidators.has(type)) {
            const { validator, message: customMessage } = this.customValidators.get(type);
            try {
              isValid = validator(value, formData);
              if (customMessage && !isValid) {
                errors.push(customMessage);
                continue;
              }
            } catch (error) {
              console.error(`Fout in aangepaste validatie '${type}':`, error);
              isValid = false;
            }
          }
          break;
      }
      
      if (!isValid) {
        errors.push(message || this._formatMessage(type, param));
      }
    }
    
    return errors;
  }
  
  /**
   * Valideer een volledig formulier
   * @param {Object} formData - Object met formuliergegevens
   * @returns {Object} Validatieresultaat met fouten per veld
   */
  validateForm(formData) {
    const errors = {};
    let isValid = true;
    
    // Valideer elk veld met regels
    for (const [fieldName] of this.fieldRules) {
      const value = formData[fieldName] || '';
      const fieldErrors = this.validateField(fieldName, value, formData);
      
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
        isValid = false;
      }
    }
    
    return {
      isValid,
      errors: Object.keys(errors).length > 0 ? errors : null
    };
  }
  
  // ===== STANDARD VALIDATIE FUNCTIES =====
  
  /**
   * Valideer verplicht veld
   * @private
   */
  _validateRequired(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
  
  /**
   * Valideer e-mailadres
   * @private
   */
  _validateEmail(value) {
    if (!value) return true; // Leeg is geldig (gebruik required voor verplichte velden)
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(value).toLowerCase());
  }
  
  /**
   * Valideer telefoonnummer
   * @private
   */
  _validatePhone(value) {
    if (!value) return true; // Leeg is geldig
    // Eenvoudige validatie: minstens 10 cijfers
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10;
  }
  
  /**
   * Valideer minimale lengte
   * @private
   */
  _validateMinLength(value, min) {
    if (!value) return true; // Leeg is geldig (gebruik required voor verplichte velden)
    return String(value).length >= min;
  }
  
  /**
   * Valideer maximale lengte
   * @private
   */
  _validateMaxLength(value, max) {
    if (!value) return true; // Leeg is geldig
    return String(value).length <= max;
  }
  
  /**
   * Valideer datum
   * @private
   */
  _validateDate(value) {
    if (!value) return true; // Leeg is geldig
    // Eenvoudige datumvalidatie (YYYY-MM-DD)
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(value)) return false;
    
    // Controleer of het een geldige datum is
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  /**
   * Valideer tijd
   * @private
   */
  _validateTime(value) {
    if (!value) return true; // Leeg is geldig
    // Eenvoudige tijdvalidatie (HH:MM)
    const re = /^([01]?\d|2[0-3]):[0-5]\d$/;
    return re.test(value);
  }
  
  /**
   * Valideer toekomstige datum
   * @private
   */
  _validateFutureDate(value) {
    if (!value) return true; // Leeg is geldig
    
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zet tijd op 00:00:00 voor juiste vergelijking
    
    return date >= today;
  }
}

// Exporteer een singleton instantie
export const validator = new Validator();
