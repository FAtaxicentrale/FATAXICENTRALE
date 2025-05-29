/**
 * PriceCalculator Module
 * Handles all price calculations for taxi bookings
 */

import { PRICING_CONFIG, TRAFFIC_LEVELS, WEATHER_CONDITIONS } from '../../config/pricing.js';

/**
 * Price Calculator for taxi bookings
 * Handles all price calculations including base fares, surcharges, and discounts
 */
export class PriceCalculator {
  /**
   * Create a new PriceCalculator instance
   * @param {Object} app - The main application instance
   */
  constructor(app) {
    this.app = app;
    this.config = PRICING_CONFIG;
  }
  
  /**
   * Get base price based on distance
   * @param {number} distance - Distance in kilometers
   * @returns {number} Base price in EUR
   */
  getBasePrice(distance) {
    if (!distance || isNaN(distance) || distance <= 0) {
      console.warn('Invalid distance provided to getBasePrice:', distance);
      return this.config.minimumFare || 5; // Default minimum fare
    }
    
    // Convert distance to number and round to 2 decimal places
    const distanceKm = parseFloat(distance.toFixed(2));
    
    // Find the appropriate base price based on distance
    const basePrice = this.config.basePrices.reduce((result, priceTier) => {
      if (distanceKm <= priceTier.maxDistance) {
        return priceTier.price;
      }
      return result;
    }, 0);
    
    // If distance is greater than the last tier, calculate additional cost
    const lastTier = this.config.basePrices[this.config.basePrices.length - 1];
    if (distanceKm > lastTier.maxDistance) {
      const additionalKm = distanceKm - lastTier.maxDistance;
      const additionalCost = additionalKm * (this.config.pricePerKm || 2.5);
      return parseFloat((lastTier.price + additionalCost).toFixed(2));
    }
    
    // Ensure we never return a price below the minimum fare
    return Math.max(basePrice, this.config.minimumFare || 5);
  }
  
  /**
   * Calculate traffic surcharge based on traffic level
   * @param {string} trafficLevel - Traffic level from the API
   * @returns {number} Traffic surcharge in EUR
   */
  calculateTrafficSurcharge(trafficLevel) {
    if (!trafficLevel) {
      return 0; // No surcharge if no traffic data
    }
    
    // Normalize the traffic level input
    const normalizedLevel = trafficLevel.toString().toLowerCase().trim();
    
    // Find matching traffic level configuration
    const level = Object.values(TRAFFIC_LEVELS).find(
      l => l.level === normalizedLevel
    ) || TRAFFIC_LEVELS.UNKNOWN;
    
    // Return the surcharge amount
    return level.surcharge || 0;
  }
  
  /**
   * Calculate weather surcharge based on weather conditions
   * @param {string|Object} weatherData - Weather condition string or weather data object
   * @returns {number} Weather surcharge in EUR
   */
  calculateWeatherSurcharge(weatherData) {
    if (!weatherData) {
      return 0; // No surcharge if no weather data
    }
    
    let condition = '';
    
    // Handle different weather data formats
    if (typeof weatherData === 'string') {
      condition = weatherData.toLowerCase().trim();
    } else if (typeof weatherData === 'object' && weatherData.condition) {
      condition = weatherData.condition.toLowerCase().trim();
    } else if (typeof weatherData === 'object' && weatherData.weather?.[0]?.main) {
      // Handle OpenWeatherMap format
      condition = weatherData.weather[0].main.toLowerCase().trim();
    }
    
    // Find matching weather condition
    const weatherConfig = Object.values(WEATHER_CONDITIONS).find(
      c => c.condition === condition || 
           (Array.isArray(c.matches) && c.matches.includes(condition))
    ) || WEATHER_CONDITIONS.CLEAR;
    
    return weatherConfig.surcharge || 0;
  }
  
  /**
   * Check if it's currently night time (for night surcharge)
   * @returns {boolean} - Whether it's night time
   */
  isNightTime() {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6; // 22:00 - 06:00
  }
  
  /**
   * Calculate total price with all surcharges and discounts
   * @param {Object} params - Booking parameters
   * @param {number} params.distance - Distance in km
   * @param {string} [params.trafficLevel] - Traffic level
   * @param {string|Object} [params.weatherData] - Weather condition or data object
   * @param {boolean} [params.isNight] - Is it night time
   * @param {boolean} [params.isWeekend] - Is it weekend
   * @param {boolean} [params.express] - Is it an express booking
   * @param {boolean} [params.hasPets] - Are there pets
   * @param {string} [params.promotionCode] - Optional promotion code
   * @returns {Object} Object containing price breakdown and total
   */
  calculateTotalPrice({
    distance,
    trafficLevel,
    weatherData,
    isNight = false,
    isWeekend = false,
    express = false,
    hasPets = false,
    promotionCode = null
  }) {
    // Initialize price breakdown
    const breakdown = {
      basePrice: 0,
      surcharges: {
        night: 0,
        weekend: 0,
        express: 0,
        pets: 0,
        traffic: 0,
        weather: 0
      },
      discounts: {
        promotion: 0
      },
      total: 0
    };
    
    try {
      // Calculate base price
      breakdown.basePrice = this.getBasePrice(distance);
      
      // Calculate surcharges
      if (trafficLevel) {
        breakdown.surcharges.traffic = this.calculateTrafficSurcharge(trafficLevel);
      }
      
      if (weatherData) {
        breakdown.surcharges.weather = this.calculateWeatherSurcharge(weatherData);
      }
      
      if (isNight) {
        breakdown.surcharges.night = this.config.surcharges?.night || 0;
      }
      
      if (isWeekend) {
        breakdown.surcharges.weekend = this.config.surcharges?.weekend || 0;
      }
      
      if (express) {
        breakdown.surcharges.express = this.config.surcharges?.express || 0;
      }
      
      if (hasPets) {
        breakdown.surcharges.pets = this.config.surcharges?.pets || 0;
      }
      
      // Calculate subtotal before discounts
      const subtotal = breakdown.basePrice + 
        Object.values(breakdown.surcharges).reduce((sum, val) => sum + val, 0);
      
      // Apply promotion code if valid
      if (promotionCode && this._isValidPromotion(promotionCode)) {
        breakdown.discounts.promotion = this._calculatePromotionDiscount(
          subtotal, 
          promotionCode
        );
      }
      
      // Calculate final total
      const totalBeforeLimits = subtotal - breakdown.discounts.promotion;
      
      // Apply minimum and maximum fare limits
      breakdown.total = Math.max(
        this.config.minimumFare || 5,
        Math.min(
          totalBeforeLimits,
          this.config.maximumFare || Number.MAX_SAFE_INTEGER
        )
      );
      
      // Round to 2 decimal places
      breakdown.total = parseFloat(breakdown.total.toFixed(2));
      
      // Calculate VAT (21% in the Netherlands)
      const vatRate = 0.21;
      const vatAmount = parseFloat((breakdown.total * vatRate).toFixed(2));
      const totalIncludingVat = parseFloat((breakdown.total + vatAmount).toFixed(2));
      
      // Format the response
      return {
        ...breakdown,
        currency: 'EUR',
        formattedTotal: `€${breakdown.total.toFixed(2)}`,
        vat: {
          rate: vatRate * 100,
          amount: vatAmount,
          formattedAmount: `€${vatAmount.toFixed(2)}`
        },
        totalIncludingVat: totalIncludingVat,
        formattedTotalIncludingVat: `€${totalIncludingVat.toFixed(2)}`,
        isEstimate: true
      };
      
    } catch (error) {
      console.error('Fout bij berekenen prijs:', error);
      throw new Error('Er is een fout opgetreden bij het berekenen van de prijs.');
    }
  }
  
  /**
   * Get a human-readable price breakdown
   */
  getPriceBreakdown(basePrice, surcharges, total) {
    return [
      { label: 'Basisprijs', amount: this.formatPrice(basePrice) },
      ...Object.entries(surcharges)
        .filter(([_, amount]) => amount > 0)
        .map(([key, amount]) => ({
          label: this.getSurchargeLabel(key),
          amount: this.formatPrice(amount)
        })),
      { 
        label: 'Totaal', 
        amount: this.formatPrice(total),
        isTotal: true 
      }
    ];
  }
  
  /**
   * Get a human-readable label for a surcharge
   */
  getSurchargeLabel(key) {
    const labels = {
      night: 'Nachttoeslag',
      weekend: 'Weekendtoeslag',
      weather: 'Weerstoeslag',
      express: 'Spoedtoeslag',
      pet: 'Huisdierentoeslag',
      traffic: 'Verkeerstoeslag'
    };
    return labels[key] || key;
  }

  /**
   * Format a price to 2 decimal places
   * @param {number} amount - The amount to format
   * @returns {string} - Formatted price with 2 decimal places
   */
  formatPrice(amount) {
    return parseFloat(amount).toFixed(2);
  }

  /**
   * Apply a discount to a price
   * @param {number} price - The original price
   * @param {string} discountCode - Optional discount code
   * @returns {Object} - Object with discounted price and discount details
   */
  applyDiscount(price, discountCode = '') {
    if (!discountCode) {
      return {
        discountedPrice: price,
        discountAmount: 0,
        discountPercentage: 0,
        discountCode: ''
      };
    }
    
    const discount = this.config.discounts[discountCode] || 0;
    const discountAmount = price * discount;
    
    return {
      discountedPrice: price - discountAmount,
      discountAmount,
      discountPercentage: discount * 100,
      discountCode
    };
  }

  /**
   * Calculate all applicable discounts
   * @param {Object} tripData - The trip data
   * @returns {Promise<Object>} - Discount details
   */
  async calculateDiscounts(tripData) {
    const { promoCode, isRoundTrip } = tripData;
    const result = {
      roundTrip: 0,
      frequentRider: 0,
      promoCode: 0,
      totalDiscount: 0
    };
    
    // Check for round trip discount
    if (isRoundTrip) {
      result.roundTrip = this.discounts.roundTrip;
    }
    
    // Check for frequent rider discount (in a real app, this would check user's ride history)
    const isFrequentRider = await this.checkFrequentRider(tripData.userId);
    if (isFrequentRider) {
      result.frequentRider = this.discounts.frequentRider;
    }
    
    // Check promo code
    if (promoCode && this.discounts.promoCode[promoCode]) {
      result.promoCode = this.discounts.promoCode[promoCode];
    }
    
    // Calculate total discount (capped at 50%)
    result.totalDiscount = Math.min(
      result.roundTrip + result.frequentRider + result.promoCode,
      0.50 // Maximum 50% discount
    );
    
    return result;
  }
  
  /**
   * Check if user is eligible for frequent rider discount
   * @param {string} userId - The user ID
   * @returns {Promise<boolean>} - Whether the user is a frequent rider
   */
  async checkFrequentRider(userId) {
    if (!userId) return false;
    
    // In a real app, this would check the user's ride history
    // For demo purposes, we'll simulate an API call
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // For demo, consider users with IDs ending with '1' as frequent riders
      return userId.endsWith('1');
    } catch (error) {
      console.error('Error checking frequent rider status:', error);
      return false;
    }
  }
  
  /**
   * Format price to 2 decimal places
   * @param {number} amount - The amount to format
   * @returns {number} - The formatted amount
   */
  formatPrice(amount) {
    return Math.round(amount * 100) / 100;
  }
  
  /**
   * Estimate trip distance and duration using a routing service
   * @param {string} origin - The origin address
   * @param {string} destination - The destination address
   * @param {Array} waypoints - Optional waypoints
   * @returns {Promise<Object>} - The estimated distance (km) and duration (minutes)
   */
  async estimateTrip(origin, destination, waypoints = []) {
    if (!origin || !destination) {
      throw new Error('Origin and destination are required');
    }
    
    try {
      // In a real app, this would call a routing API like Google Maps or OSRM
      // For demo, we'll return mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Calculate a mock distance based on the number of characters in the addresses
      // This is just for demonstration purposes
      const distance = 5 + Math.min(
        (origin.length + destination.length) / 10,
        50 // Max 50 km for demo
      );
      
      // Estimate duration based on distance (avg speed 30 km/h in city)
      const duration = Math.round((distance / 30) * 60);
      
      return {
        distance: this.formatPrice(distance),
        duration: Math.max(10, duration) // Minimum 10 minutes
      };
      
    } catch (error) {
      console.error('Error estimating trip:', error);
      throw new Error('Kon de route niet berekenen. Controleer de adressen en probeer het opnieuw.');
    }
  }
}
