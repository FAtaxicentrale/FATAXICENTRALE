/**
 * Utility functions for calculations and validations
 */

import { PRICING_CONFIG, TRAFFIC_LEVELS, WEATHER_CONDITIONS } from '../config/pricing.js';

/**
 * Format a price value with currency symbol and decimal places
 * @param {number} amount - The amount to format
 * @param {string} [currency='€'] - The currency symbol
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, currency = '€', decimals = 2) => {
  if (isNaN(amount)) return `${currency}0.00`;
  const value = parseFloat(amount).toFixed(decimals);
  return `${currency}${value}`;
};

/**
 * Calculate the distance between two coordinates in kilometers
 * Uses the Haversine formula
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return parseFloat(distance.toFixed(2));
};

/**
 * Convert degrees to radians
 * @private
 */
const toRad = (value) => {
  return (value * Math.PI) / 180;
};

/**
 * Calculate estimated duration in minutes based on distance and traffic level
 * @param {number} distance - Distance in kilometers
 * @param {string} [trafficLevel='light'] - Traffic level from TRAFFIC_LEVELS
 * @returns {number} Estimated duration in minutes
 */
export const calculateDuration = (distance, trafficLevel = 'light') => {
  // Base speed in km/h (average city speed)
  const baseSpeed = 30;
  
  // Get traffic factor (slower in heavy traffic)
  const traffic = Object.values(TRAFFIC_LEVELS).find(t => t.level === trafficLevel) || TRAFFIC_LEVELS.LIGHT;
  const speed = baseSpeed * (1 / traffic.factor);
  
  // Time = Distance / Speed (in hours)
  const hours = distance / speed;
  const minutes = Math.ceil(hours * 60); // Round up to nearest minute
  
  return minutes;
};

/**
 * Check if a given time is within night hours (22:00 - 06:00)
 * @param {Date} [date=new Date()] - The date to check
 * @returns {boolean} True if it's night time
 */
export const isNightTime = (date = new Date()) => {
  const hours = date.getHours();
  return hours >= 22 || hours < 6;
};

/**
 * Check if a given date is during the weekend
 * @param {Date} [date=new Date()] - The date to check
 * @returns {boolean} True if it's the weekend
 */
export const isWeekend = (date = new Date()) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

/**
 * Get the current traffic level based on time of day and day of week
 * @param {Date} [date=new Date()] - The date to check
 * @returns {string} Traffic level key from TRAFFIC_LEVELS
 */
export const getCurrentTrafficLevel = (date = new Date()) => {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Morning rush hour (7:30-9:30)
  const isMorningRush = hour >= 7.5 && hour < 9.5;
  
  // Evening rush hour (16:00-18:30)
  const isEveningRush = hour >= 16 && hour < 18.5;
  
  // Friday afternoon/evening is typically worse
  const isFridayAfternoon = day === 5 && hour >= 15;
  
  if (isFridayAfternoon) return 'VERY_HEAVY';
  if (isMorningRush || isEveningRush) return 'HEAVY';
  
  // Weekends are generally lighter traffic
  if (day === 0 || day === 6) return 'LIGHT';
  
  // Night time has very light traffic
  if (hour < 6 || hour >= 22) return 'LIGHT';
  
  // Default to moderate traffic
  return 'MODERATE';
};

/**
 * Validate if a promotion code is valid and applicable
 * @param {string} code - The promotion code to validate
 * @param {number} [amount=0] - The order amount for minimum spend requirements
 * @returns {Object} Validation result with { isValid: boolean, message: string, promotion: Object|null }
 */
export const validatePromotion = (code, amount = 0) => {
  if (!code) {
    return { isValid: false, message: 'Voer een promotiecode in', promotion: null };
  }
  
  const promotion = PRICING_CONFIG.promotions.find(
    p => p.code === code.toUpperCase()
  );
  
  if (!promotion) {
    return { isValid: false, message: 'Ongeldige promotiecode', promotion: null };
  }
  
  // Check if promotion has expired
  if (promotion.validUntil && new Date(promotion.validUntil) < new Date()) {
    return { 
      isValid: false, 
      message: 'Deze promotie is verlopen', 
      promotion: null 
    };
  }
  
  // Check minimum spend if applicable
  if (promotion.minAmount && amount < promotion.minAmount) {
    return { 
      isValid: false, 
      message: `Bestel minimaal €${promotion.minAmount} voor deze actie`,
      promotion: null
    };
  }
  
  return { 
    isValid: true, 
    message: 'Promotiecode toegepast!', 
    promotion 
  };
};

/**
 * Calculate the final price after applying a promotion
 * @param {number} amount - The original amount
 * @param {Object} promotion - The promotion to apply
 * @returns {number} The discounted amount
 */
export const applyPromotion = (amount, promotion) => {
  if (!promotion) return amount;
  
  let discount = 0;
  
  if (promotion.type === 'percentage') {
    discount = amount * (promotion.value / 100);
  } else if (promotion.type === 'fixed') {
    discount = Math.min(promotion.value, amount);
  }
  
  // Apply any maximum discount limit
  if (promotion.maxDiscount) {
    discount = Math.min(discount, promotion.maxDiscount);
  }
  
  const finalAmount = amount - discount;
  
  // Ensure we don't go below zero
  return Math.max(0, finalAmount);
};

/**
 * Format a duration in minutes to a human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "2 uur en 15 min")
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'uur' : 'uur'}`;
  }
  
  return `${hours} ${hours === 1 ? 'uur' : 'uur'} en ${remainingMinutes} min`;
};
