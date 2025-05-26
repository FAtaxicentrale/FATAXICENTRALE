/**
 * PriceCalculator Module
 * Handles all price calculations for taxi bookings
 */

export class PriceCalculator {
  constructor(app) {
    this.app = app;
    this.baseRates = {
      start: 8.50,      // Base start price in EUR
      perKm: 2.50,      // Price per kilometer
      perMinute: 0.45,  // Price per minute
      minFare: 12.00    // Minimum fare
    };
    
    this.surcharges = {
      night: {
        start: 23,
        end: 6,
        multiplier: 1.2  // 20% surcharge
      },
      weekend: {
        multiplier: 1.15 // 15% surcharge
      },
      holiday: {
        dates: [
          '01-01', // New Year's Day
          '04-27', // King's Day
          '12-25', // Christmas Day
          '12-26'  // Boxing Day
        ],
        multiplier: 1.25 // 25% surcharge
      },
      airport: {
        locations: ['Schiphol', 'Eindhoven Airport', 'Rotterdam The Hague Airport'],
        fixedFee: 10.00
      },
      pet: 3.50,  // Fixed fee per pet
      luggage: {
        large: 2.00,  // Per large piece
        small: 0.50   // Per small piece
      },
      waiting: 0.50 // Per minute after first 3 minutes
    };
    
    this.discounts = {
      roundTrip: 0.10,  // 10% discount for round trips
      frequentRider: 0.15, // 15% discount for frequent riders
      promoCode: {
        'WELCOME10': 0.10,  // 10% off
        'SUMMER25': 0.25,  // 25% off (limited time)
        'TAXIFREE': 0.50   // 50% off (special)
      }
    };
  }


  /**
   * Calculate the price for a taxi ride
   * @param {Object} tripData - The trip data including distance, duration, etc.
   * @returns {Promise<Object>} - The calculated price details
   */
  async calculatePrice(tripData) {
    try {
      // Basic calculations
      const basePrice = this.calculateBasePrice(tripData.distance, tripData.duration);
      
      // Apply surcharges
      const surcharges = this.calculateSurcharges(tripData);
      
      // Apply discounts
      const discounts = await this.calculateDiscounts(tripData);
      
      // Calculate total
      const subtotal = basePrice + surcharges.total;
      const discountAmount = subtotal * discounts.totalDiscount;
      const totalBeforeTax = subtotal - discountAmount;
      
      // Apply minimum fare
      const finalTotal = Math.max(totalBeforeTax, this.baseRates.minFare);
      
      // Calculate VAT (21% in the Netherlands)
      const vatRate = 0.21;
      const vatAmount = finalTotal * vatRate;
      const totalIncludingVat = finalTotal + vatAmount;
      
      return {
        basePrice: this.formatPrice(basePrice),
        surcharges: {
          ...surcharges,
          total: this.formatPrice(surcharges.total)
        },
        discounts: {
          ...discounts,
          totalDiscount: this.formatPrice(discountAmount),
          discountPercentage: Math.round(discounts.totalDiscount * 100)
        },
        subtotal: this.formatPrice(subtotal),
        vat: {
          rate: vatRate * 100,
          amount: this.formatPrice(vatAmount)
        },
        total: this.formatPrice(finalTotal),
        totalIncludingVat: this.formatPrice(totalIncludingVat),
        currency: 'EUR',
        estimatedDuration: tripData.duration,
        estimatedDistance: tripData.distance
      };
      
    } catch (error) {
      console.error('Error calculating price:', error);
      throw new Error('Er is een fout opgetreden bij het berekenen van de prijs.');
    }
  }

  /**
   * Calculate the base price based on distance and duration
   * @param {number} distance - Distance in kilometers
   * @param {number} duration - Duration in minutes
   * @returns {number} - The base price
   */
  calculateBasePrice(distance, duration) {
    const distanceCost = distance * this.baseRates.perKm;
    const timeCost = duration * this.baseRates.perMinute;
    return this.baseRates.start + distanceCost + timeCost;
  }

  /**
   * Calculate all applicable surcharges
   * @param {Object} tripData - The trip data
   * @returns {Object} - Surcharge details
   */
  calculateSurcharges(tripData) {
    const result = {
      night: 0,
      weekend: 0,
      holiday: 0,
      airport: 0,
      pet: 0,
      luggage: 0,
      waiting: 0,
      total: 0
    };
    
    const { date, time, pickup, dropoff, pets, luggage, waitingTime } = tripData;
    const tripDate = date ? new Date(date) : new Date();
    
    // Night surcharge (23:00 - 06:00)
    const hour = time ? parseInt(time.split(':')[0], 10) : new Date().getHours();
    if (hour >= this.surcharges.night.start || hour < this.surcharges.night.end) {
      result.night = this.baseRates.start * (this.surcharges.night.multiplier - 1);
    }
    
    // Weekend surcharge (Saturday and Sunday)
    const dayOfWeek = tripDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      result.weekend = this.baseRates.start * (this.surcharges.weekend.multiplier - 1);
    }
    
    // Holiday surcharge
    const monthDay = `${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
    if (this.surcharges.holiday.dates.includes(monthDay)) {
      result.holiday = this.baseRates.start * (this.surcharges.holiday.multiplier - 1);
    }
    
    // Airport fee
    const isAirportPickup = this.surcharges.airport.locations.some(loc => 
      pickup && pickup.toLowerCase().includes(loc.toLowerCase())
    );
    const isAirportDropoff = this.surcharges.airport.locations.some(loc => 
      dropoff && dropoff.toLowerCase().includes(loc.toLowerCase())
    );
    
    if (isAirportPickup || isAirportDropoff) {
      result.airport = this.surcharges.airport.fixedFee;
    }
    
    // Pet fee
    if (pets) {
      result.pet = pets * this.surcharges.pet;
    }
    
    // Luggage fee
    if (luggage) {
      result.luggage = (luggage.large || 0) * this.surcharges.luggage.large +
                      (luggage.small || 0) * this.surcharges.luggage.small;
    }
    
    // Waiting time fee (after first 3 minutes)
    if (waitingTime > 3) {
      result.waiting = (waitingTime - 3) * this.surcharges.waiting;
    }
    
    // Calculate total surcharges
    result.total = Object.values(result).reduce((sum, val) => 
      typeof val === 'number' ? sum + val : sum, 0
    );
    
    return result;
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
