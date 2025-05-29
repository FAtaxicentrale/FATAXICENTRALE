import { createMollieClient } from '@mollie/api-client';
import { PRICING_CONFIG } from '../config/pricing.js';
import { SECURITY_CONFIG, validateMollieWebhook } from '../config/security.js';
import { formatPrice } from '../utils/calculations.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Payment module voor het afhandelen van betalingen via Mollie
 */
class PaymentService {
  constructor() {
    // Gebruik de API key uit de beveiligingsconfiguratie
    if (!SECURITY_CONFIG.mollie.apiKey) {
      throw new Error('Mollie API key is niet geconfigureerd');
    }
    
    this.mollieClient = createMollieClient({ 
      apiKey: SECURITY_CONFIG.mollie.apiKey 
    });
    
    this.returnUrl = `${window.location.origin}/betaling/voltooid`;
    this.webhookUrl = SECURITY_CONFIG.mollie.webhookUrl;
    this.sessionId = null;
    this._lastRequestTime = 0;
  }

  /**
   * Maak een nieuwe betaling aan
   * @param {Object} paymentData - Betalingsgegevens
   * @returns {Promise<Object>} Betalingsgegevens
   */
  async createPayment(paymentData) {
    try {
      const { 
        orderId, 
        amount, 
        description, 
        redirectUrl,
        customerId,
        metadata = {}
      } = paymentData;
      
      // Valideer invoer
      if (!orderId || !amount || !description) {
        throw new Error('Ontbrekende vereiste velden');
      }
      
      // Genereer een uniek ID voor deze betaling
      const paymentId = `pay_${uuidv4().replace(/-/g, '')}`;
      
      // Voeg beveiligingsgerelateerde metadata toe
      const secureMetadata = {
        ...metadata,
        orderId,
        customerId: customerId || 'guest',
        timestamp: new Date().toISOString(),
        ipAddress: this._getClientIp(),
        userAgent: window.navigator.userAgent,
        sessionId: this._getSessionId(),
        paymentId,
        version: '1.0.0'
      };
      
      // Maak de betaling aan bij Mollie
      const payment = await this.mollieClient.payments.create({
        amount: {
          currency: 'EUR',
          value: this._formatAmount(amount)
        },
        description: this._sanitizeInput(description).substring(0, 255),
        redirectUrl: this._validateUrl(redirectUrl || this.returnUrl),
        webhookUrl: this.webhookUrl,
        metadata: secureMetadata,
        method: ['ideal', 'creditcard', 'paypal'],
        locale: 'nl_NL',
        restrictPaymentMethodsToCountry: 'NL',
        billingEmail: metadata.email || undefined,
        sequenceType: 'oneoff',
        customerId: customerId || undefined,
      });
      
      // Log de betalingspoging
      this._logPaymentAttempt({
        paymentId: payment.id,
        orderId,
        amount,
        status: 'created',
        metadata: {
          ...secureMetadata,
          billingAddress: undefined,
          shippingAddress: undefined,
          ipAddress: this._anonymizeIp(secureMetadata.ipAddress)
        }
      });

      return {
        success: true,
        paymentId: payment.id,
        checkoutUrl: payment.getCheckoutUrl(),
        details: payment,
      };
    } catch (error) {
      console.error('Fout bij aanmaken betaling:', error);
      throw new Error('Kon betaling niet verwerken. Probeer het later opnieuw.');
    }
  }

  /**
   * Haal betalingsstatus op
   * @param {string} paymentId - Mollie betalings-ID
   * @returns {Promise<Object>} Betalingsstatus
   */
  async getPaymentStatus(paymentId) {
    try {
      const payment = await this.mollieClient.payments.get(paymentId);
      
      return {
        id: payment.id,
        status: payment.status,
        amount: {
          value: parseFloat(payment.amount.value),
          currency: payment.amount.currency,
        },
        paidAt: payment.paidAt,
        failedAt: payment.failedAt,
        canceledAt: payment.canceledAt,
        expiresAt: payment.expiresAt,
        metadata: payment.metadata,
      };
    } catch (error) {
      console.error('Fout bij ophalen betalingsstatus:', error);
      throw new Error('Kon betalingsstatus niet ophalen');
    }
  }

  // ======================
  // PRIVATE METHODEN
  // ======================
  
  _formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
  }
  
  _sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>\"\']/g, '')
      .trim();
  }
  
  _validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Alleen HTTPS toestaan in productie
      if (SECURITY_CONFIG.app.isProduction && parsedUrl.protocol !== 'https:') {
        throw new Error('Alleen HTTPS URL\'s zijn toegestaan');
      }
      
      // Controleer of het domein overeenkomt met de verwachte domeinen
      const allowedDomains = [
        new URL(this.returnUrl).hostname,
        new URL(this.webhookUrl).hostname
      ];
      
      if (!allowedDomains.includes(parsedUrl.hostname)) {
        throw new Error('Ongeldig domein');
      }
      
      return parsedUrl.toString();
      
    } catch (error) {
      console.error('Ongeldige URL:', url, error);
      return this.returnUrl;
    }
  }
  
  _getClientIp() {
    // In een echte app zou je dit server-side moeten doen
    return 'unknown';
  }
  
  _getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `sess_${uuidv4()}`;
      document.cookie = `sessionId=${this.sessionId}; Path=/; Secure; SameSite=Strict; HttpOnly`;
    }
    return this.sessionId;
  }
  
  _anonymizeIp(ip) {
    if (!ip || ip === 'unknown') return ip;
    return ip.replace(/\.\d+$/, '.0');
  }
  
  _logPaymentAttempt(data) {
    console.log('Betalingspoging:', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
  
  _isSuspiciousActivity() {
    const now = Date.now();
    this._lastRequestTime = this._lastRequestTime || 0;
    
    if (now - this._lastRequestTime < 1000) {
      return true;
    }
    
    this._lastRequestTime = now;
    return false;
  }
  
  _validationError(message) {
    return {
      isValid: false,
      message,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    };
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

// Webhook handler functies
const handleSuccessfulPayment = async (payment) => ({
  success: true, 
  action: 'order_verwerkt',
  orderId: payment.metadata?.orderId,
  amount: payment.amount
});

const handleFailedPayment = async (payment) => ({
  success: false, 
  action: 'betaling_mislukt',
  orderId: payment.metadata?.orderId,
  reason: payment.failureReason || 'onbekende_reden'
});

const handlePendingPayment = async (payment) => ({
  success: true, 
  action: 'in_behandeling',
  orderId: payment.metadata?.orderId,
  status: payment.status
});

/**
 * Verwerk een Mollie webhook
 * @param {Object} webhookData - Webhook data van Mollie
 * @param {string} signature - Handtekening header van de webhook
 * @returns {Promise<Object>} Verwerkingsresultaat
 */
export const processWebhook = async (webhookData, signature) => {
  const startTime = Date.now();
  const webhookId = `wh_${uuidv4()}`;
  
  try {
    // Valideer de webhook handtekening
    const isSignatureValid = validateMollieWebhook(webhookData, signature);
    if (!isSignatureValid) {
      console.error(`[${webhookId}] Ongeldige webhook handtekening`);
      throw new Error('Ongeldige webhook handtekening');
    }
    
    const { id: paymentId } = webhookData;
    if (!paymentId) {
      throw new Error('Geen payment ID ontvangen in webhook');
    }
    
    const paymentService = initPaymentService();
    const payment = await paymentService.getPaymentStatus(paymentId);
    
    if (!payment?.metadata?.orderId) {
      throw new Error('Ongeldige betalingsgegevens ontvangen');
    }
    
    let result;
    
    switch (payment.status) {
      case 'paid':
        result = await handleSuccessfulPayment(payment);
        break;
        
      case 'failed':
      case 'expired':
      case 'canceled':
        result = await handleFailedPayment(payment);
        break;
        
      case 'pending':
      case 'open':
        result = await handlePendingPayment(payment);
        break;
        
      default:
        console.warn(`[${webhookId}] Onbekende betalingsstatus:`, payment.status);
        result = { 
          success: false, 
          message: `Onbekende status: ${payment.status}` 
        };
    }
    
    return {
      success: true,
      webhookId,
      paymentId: payment.id,
      orderId: payment.metadata.orderId,
      status: payment.status,
      message: 'Webhook succesvol verwerkt',
      timestamp: new Date().toISOString(),
      processingTime: `${Date.now() - startTime}ms`
    };
    
  } catch (error) {
    const errorId = `err_${uuidv4().substring(0, 8)}`;
    console.error(`[${webhookId}] Fout bij verwerken webhook:`, {
      errorId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    throw new Error(`[${errorId}] ${error.message}`);
  }
};
