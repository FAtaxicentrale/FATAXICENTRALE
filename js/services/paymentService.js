// Configuratie wordt nu direct in dit bestand gedefinieerd
const SECURITY_CONFIG = window.SECURITY_CONFIG || {
  app: {
    apiBaseUrl: window.location.origin,
    secret: 'tijdelijke_geheime_sleutel',
    env: 'development'
  },
  api: {
    timeout: 30000
  }
};
// Gebruik de browser-versie van uuid
const { v4: uuidv4 } = window.uuid || { v4: () => crypto.randomUUID() };

class PaymentService {
  constructor() {
    this.baseUrl = SECURITY_CONFIG.app.apiBaseUrl || '';
    this.paymentMethods = ['ideal', 'creditcard', 'paypal'];
  }

  /**
   * Start een nieuwe betaling
   * @param {Object} paymentData - Betalingsgegevens
   * @returns {Promise<Object>} Betalingsresultaat
   */
  async createPayment(paymentData) {
    try {
      const { amount, description, redirectUrl, metadata = {} } = paymentData;
      
      // Valideer invoer
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Ongeldig bedrag');
      }
      
      // Maak een uniek order ID
      const orderId = `order_${uuidv4().replace(/-/g, '')}`;
      
      // Bereid de betalingsaanvraag voor
      const paymentRequest = {
        amount: {
          currency: 'EUR',
          value: this._formatAmount(amount)
        },
        description: this._sanitizeInput(description).substring(0, 255),
        redirectUrl: this._validateUrl(redirectUrl || `${window.location.origin}/betaling/voltooid`),
        webhookUrl: SECURITY_CONFIG.mollie.webhookUrl,
        metadata: {
          ...metadata,
          orderId,
          timestamp: new Date().toISOString(),
          userAgent: window.navigator.userAgent,
          ipAddress: this._getClientIp(),
          sessionId: this._getSessionId()
        },
        method: this.paymentMethods,
        locale: 'nl_NL',
        restrictPaymentMethodsToCountry: 'NL'
      };

      // Verstuur de betalingsaanvraag
      const response = await this._apiRequest('/api/payments/create', 'POST', paymentRequest);
      
      // Log de betalingspoging (zijn gevoelige gegevens)
      this._logPaymentAttempt({
        paymentId: response.id,
        orderId,
        amount,
        status: 'created',
        metadata: {
          ...paymentRequest.metadata,
          ipAddress: this._anonymizeIp(paymentRequest.metadata.ipAddress)
        }
      });

      return {
        success: true,
        paymentId: response.id,
        checkoutUrl: response._links.checkout.href,
        details: response
      };
      
    } catch (error) {
      console.error('Fout bij aanmaken betaling:', error);
      throw new Error('Kon betaling niet verwerken. Probeer het later opnieuw.');
    }
  }

  /**
   * Controleer de status van een betaling
   * @param {string} paymentId - Mollie betalings-ID
   * @returns {Promise<Object>} Betalingsstatus
   */
  async checkPaymentStatus(paymentId) {
    try {
      if (!paymentId) {
        throw new Error('Geen betalings-ID opgegeven');
      }
      
      const response = await this._apiRequest(`/api/payments/${paymentId}/status`, 'GET');
      
      return {
        id: response.id,
        status: response.status,
        amount: response.amount,
        paidAt: response.paidAt,
        failedAt: response.failedAt,
        canceledAt: response.canceledAt,
        expiresAt: response.expiresAt,
        metadata: response.metadata
      };
      
    } catch (error) {
      console.error('Fout bij controleren betalingsstatus:', error);
      throw new Error('Kon betalingsstatus niet ophalen');
    }
  }

  /**
   * Verwerk een webhook van Mollie
   * @param {Object} webhookData - Webhook data
   * @param {string} signature - Webhook handtekening
   * @returns {Promise<Object>} Verwerkingsresultaat
   */
  async processWebhook(webhookData, signature) {
    try {
      const response = await this._apiRequest('/api/payments/webhook', 'POST', {
        ...webhookData,
        signature
      });
      
      return response;
      
    } catch (error) {
      console.error('Fout bij verwerken webhook:', error);
      throw new Error('Webhook verwerken mislukt');
    }
  }

  // ======================
  // PRIVATE METHODEN
  // ======================
  
  /**
   * Maak een API-verzoek
   * @private
   */
  async _apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': uuidv4(),
        'X-Session-ID': this._getSessionId(),
        'X-Client-Version': '1.0.0'
      },
      credentials: 'include' // Belangrijk voor cookies
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Formatteer een bedrag voor Mollie (bijv. 10.5 wordt "10.50")
   * @private
   */
  _formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
  }
  
  /**
   * Sanitize gebruikersinvoer
   * @private
   */
  _sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>\"\']/g, '') // Verwijder HTML tags
      .trim();
  }
  
  /**
   * Valideer een URL
   * @private
   */
  _validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Alleen HTTPS toestaan in productie
      if (SECURITY_CONFIG.app.isProduction && parsedUrl.protocol !== 'https:') {
        throw new Error('Alleen HTTPS URL\'s zijn toegestaan');
      }
      
      return parsedUrl.toString();
      
    } catch (error) {
      console.error('Ongeldige URL:', url, error);
      return `${window.location.origin}/betaling/voltooid`; // Fallback URL
    }
  }
  
  /**
   * Haal het IP-adres van de client op
   * @private
   */
  _getClientIp() {
    // In een echte app zou je dit server-side moeten doen
    return 'unknown';
  }
  
  /**
   * Haal de sessie-ID op of maak er een aan
   * @private
   */
  _getSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `sess_${uuidv4()}`;
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Anonimiseer een IP-adres (laat alleen het eerste deel zien)
   * @private
   */
  _anonymizeIp(ip) {
    if (!ip || ip === 'unknown') return ip;
    return ip.replace(/\.\d+$/, '.0');
  }
  
  /**
   * Log een betalingspoging
   * @private
   */
  _logPaymentAttempt(data) {
    console.log('Betalingspoging:', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

// Exporteer een singleton instance
let paymentService = null;

/**
 * Initialiseer de betalingsservice
 * @returns {PaymentService} De geïnitialiseerde betalingsservice
 */
const initPaymentService = () => {
  if (!paymentService) {
    paymentService = new PaymentService();
  }
  return paymentService;
};

export { initPaymentService, PaymentService };
