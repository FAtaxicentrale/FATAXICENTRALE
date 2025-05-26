/**
 * PriceCalculator Module
 * Behandelt alle prijsberekeningen voor taxiritten
 */

export class PriceCalculator {
  constructor() {
    // Basis tarieven in euro's
    this.baseRates = {
      start: 8.50,      // Starttarief
      perKm: 2.50,      // Prijs per kilometer
      perMinute: 0.45,  // Prijs per minuut
      minFare: 12.00,   // Minimumbedrag
      maxFare: 500.00   // Maximumbedrag (veiligheid)
    };
    
    // Toeslagen
    this.surcharges = {
      // Nachttoeslag (23:00-06:00)
      night: {
        start: 23,      // Starttijd (uur)
        end: 6,         // Eindtijd (uur)
        multiplier: 1.2  // 20% toeslag
      },
      
      // Weekendtoeslag (vrijdag 18:00 - maandag 06:00)
      weekend: {
        startDay: 5,    // Vrijdag (0=zondag, 1=maandag, ..., 6=zaterdag)
        startTime: 18,  // Starttijd (uur)
        endDay: 1,      // Maandag
        endTime: 6,     // Eindtijd (uur)
        multiplier: 1.15 // 15% toeslag
      },
      
      // Feestdagen
      holiday: {
        // Vaste data (dag-maand)
        fixedDates: [
          '01-01', // Nieuwjaarsdag
          '04-27', // Koningsdag
          '05-05', // Bevrijdingsdag (alleen bijzondere jaren)
          '12-25', // Eerste Kerstdag
          '12-26'  // Tweede Kerstdag
        ],
        
        // Berekenen van variabele feestdagen (Pasen, Pinksteren, Hemelvaart)
        getVariableHolidays: function(year) {
          // Bereken paaszondag (algoritme van Butcher)
          const a = year % 19;
          const b = Math.floor(year / 100);
          const c = year % 100;
          const d = Math.floor(b / 4);
          const e = b % 4;
          const f = Math.floor((b + 8) / 25);
          const g = Math.floor((b - f + 1) / 3);
          const h = (19 * a + b - d - g + 15) % 30;
          const i = Math.floor(c / 4);
          const k = c % 4;
          const l = (32 + 2 * e + 2 * i - h - k) % 7;
          const m = Math.floor((a + 11 * h + 22 * l) / 451);
          const month = Math.floor((h + l - 7 * m + 114) / 31);
          const day = ((h + l - 7 * m + 114) % 31) + 1;
          
          const easter = new Date(year, month - 1, day);
          
          // Bereken de andere feestdagen op basis van Pasen
          const goodFriday = new Date(easter);
          goodFriday.setDate(easter.getDate() - 2);
          
          const easterMonday = new Date(easter);
          easterMonday.setDate(easter.getDate() + 1);
          
          const ascension = new Date(easter);
          ascension.setDate(easter.getDate() + 39);
          
          const pentecost = new Date(easter);
          pentecost.setDate(easter.getDate() + 49);
          
          const pentecostMonday = new Date(easter);
          pentecostMonday.setDate(easter.getDate() + 50);
          
          // Formatteer data als 'DD-MM'
          const format = date => {
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${d}-${m}`;
          };
          
          return [
            format(goodFriday),     // Goede Vrijdag
            format(easterMonday),   // Tweede Paasdag
            format(ascension),      // Hemelvaart
            format(pentecost),      // Eerste Pinksterdag
            format(pentecostMonday) // Tweede Pinksterdag
          ];
        },
        
        multiplier: 1.25 // 25% toeslag
      },
      
      // Luchthaventoeslag
      airport: {
        locations: [
          'Schiphol', 
          'Eindhoven Airport', 
          'Rotterdam The Hague Airport',
          'Groningen Airport Eelde',
          'Maastricht Aachen Airport'
        ],
        fixedFee: 10.00
      },
      
      // Overige toeslagen
      pet: 3.50,        // Per huisdier
      childSeat: 5.00,  // Per kinderstoel
      luggage: {
        large: 2.00,     // Per groot stuk bagage
        small: 0.50     // Per klein stuk handbagage
      },
      waiting: 0.50,    // Per minuut wachttijd (na eerste 3 minuten)
      reservation: 5.00 // Reserveringstoeslag (bij vooraf boeken)
    };
    
    // Kortingen
    this.discounts = {
      roundTrip: 0.10,      // 10% korting voor retourritten
      frequentRider: 0.15,  // 15% korting voor vaste klanten
      onlinePayment: 0.05,  // 5% korting bij online betalen
      promoCode: {          // Promotiecodes
        'WELCOME10': 0.10,  // 10% korting
        'SUMMER25': 0.25,   // 25% korting (tijdelijk)
        'TAXI2025': 0.15,   // 15% korting
        'FATAXI': 0.20,     // 20% korting voor vaste klanten
        'TAXIFREE': 0.50    // 50% korting (speciale actie)
      }
    };
  }


  /**
   * Bereken het totaalbedrag inclusief alle toeslagen en kortingen
   * @param {number} distance - Afstand in kilometers
   * @param {number} duration - Reistijd in minuten
   * @param {Object} options - Opties voor toeslagen en kortingen
   * @returns {Object} - Gedetailleerde prijsopgave
   */
  calculateTotalFare(distance, duration, options = {}) {
    try {
      // Bereken het basistarief
      const baseFare = this.calculateBaseFare(distance, duration);
      
      // Bereken de toeslagen
      const surcharges = this.calculateSurcharges(baseFare, options);
      
      // Bereken de kortingen
      const discounts = this.calculateDiscounts(baseFare, options);
      
      // Bereken subtotaal (basistarief + toeslagen)
      const subtotal = baseFare + surcharges.total;
      
      // Bereken totaal (subtoaal - kortingen)
      let total = subtotal - discounts.total;
      
      // Zorg dat het totaal niet negatief wordt
      total = Math.max(0, total);
      
      // Rond alle bedragen af op 2 decimalen
      return {
        baseFare: parseFloat(baseFare.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        currency: 'EUR',
        surcharges: {
          total: parseFloat(surcharges.total.toFixed(2)),
          details: surcharges.details.map(item => ({
            ...item,
            amount: parseFloat(item.amount.toFixed(2))
          }))
        },
        discounts: {
          total: parseFloat(discounts.total.toFixed(2)),
          details: discounts.details.map(item => ({
            ...item,
            amount: parseFloat(item.amount.toFixed(2))
          }))
        },
        timestamp: new Date().toISOString(),
        pricePerKm: this.baseRates.perKm,
        pricePerMinute: this.baseRates.perMinute
      };
      
    } catch (error) {
      console.error('Fout bij berekenen totaalprijs:', error);
      throw error;
    }
  }

  /**
   * Bereken het basistarief op basis van afstand en reistijd
   * @param {number} distance - Afstand in kilometers
   * @param {number} duration - Reistijd in minuten
   * @returns {number} - Het basistarief
   */
  calculateBaseFare(distance, duration) {
    try {
      // Valideer invoer
      if (isNaN(distance) || distance < 0) {
        throw new Error('Ongeldige afstand opgegeven');
      }
      if (isNaN(duration) || duration < 0) {
        throw new Error('Ongeldige reistijd opgegeven');
      }
      
      // Bereken kosten
      const distanceCost = distance * this.baseRates.perKm;
      const timeCost = duration * this.baseRates.perMinute;
      let total = this.baseRates.start + distanceCost + timeCost;
      
      // Zorg voor minimum- en maximumtarief
      total = Math.max(total, this.baseRates.minFare);
      total = Math.min(total, this.baseRates.maxFare);
      
      return parseFloat(total.toFixed(2));
      
    } catch (error) {
      console.error('Fout bij berekenen basistarief:', error);
      throw error;
    }
  }

  /**
   * Bereken alle van toepassing zijnde toeslagen
   * @param {number} baseFare - Het basistarief
   * @param {Object} options - Opties voor toeslagen
   * @returns {Object} - Toeslagdetails
   */
  calculateSurcharges(baseFare, options = {}) {
    try {
      let totalSurcharge = 0;
      const surcharges = [];
      
      // Nachttoeslag (23:00 - 06:00)
      if (this.isNightTime()) {
        const amount = baseFare * (this.surcharges.night.multiplier - 1);
        surcharges.push({ name: 'Nachttoeslag', amount });
        totalSurcharge += amount;
      }
      
      // Weekendtoeslag (vrijdag 18:00 - maandag 06:00)
      if (this.isWeekend()) {
        const amount = baseFare * (this.surcharges.weekend.multiplier - 1);
        surcharges.push({ name: 'Weekendtoeslag', amount });
        totalSurcharge += amount;
      }
      
      // Feestdagentoeslag
      if (this.isHoliday()) {
        const amount = baseFare * (this.surcharges.holiday.multiplier - 1);
        surcharges.push({ name: 'Feestdagentoeslag', amount });
        totalSurcharge += amount;
      }
      
      // Luchthaventoeslag
      if (options.toAirport) {
        surcharges.push({ 
          name: 'Luchthaventoeslag (bestemming)', 
          amount: this.surcharges.airport.fixedFee 
        });
        totalSurcharge += this.surcharges.airport.fixedFee;
      }
      
      if (options.fromAirport) {
        surcharges.push({ 
          name: 'Luchthaventoeslag (vertrek)', 
          amount: this.surcharges.airport.fixedFee 
        });
        totalSurcharge += this.surcharges.airport.fixedFee;
      }
      
      // Huisdierentoeslag
      if (options.pets > 0) {
        const amount = options.pets * this.surcharges.pet;
        surcharges.push({ 
          name: `Huisdieren (${options.pets}x)`, 
          amount 
        });
        totalSurcharge += amount;
      }
      
      // Bagagetoeslag
      if (options.luggage) {
        const { large = 0, small = 0 } = options.luggage;
        
        if (large > 0) {
          const amount = large * this.surcharges.luggage.large;
          surcharges.push({ 
            name: `Grote bagage (${large}x)`, 
            amount 
          });
          totalSurcharge += amount;
        }
        
        if (small > 0) {
          const amount = small * this.surcharges.luggage.small;
          surcharges.push({ 
            name: `Handbagage (${small}x)`, 
            amount 
          });
          totalSurcharge += amount;
        }
      }
      
      // Wachttijd (na eerste 3 minuten)
      if (options.waitingTime > 3) {
        const waitingMinutes = Math.ceil(options.waitingTime - 3);
        const amount = waitingMinutes * this.surcharges.waiting;
        surcharges.push({ 
          name: `Wachttijd (${waitingMinutes} min)`, 
          amount 
        });
        totalSurcharge += amount;
      }
      
      // Reserveringstoeslag (bij vooraf boeken)
      if (options.isReservation) {
        surcharges.push({ 
          name: 'Reserveringstoeslag', 
          amount: this.surcharges.reservation 
        });
        totalSurcharge += this.surcharges.reservation;
      }
      
      return {
        total: parseFloat(totalSurcharge.toFixed(2)),
        details: surcharges
      };
      
    } catch (error) {
      console.error('Fout bij berekenen toeslagen:', error);
      throw error;
    }
  }

  /**
   * Controleer of het nachttarief van toepassing is
   * @param {Date} [date] - Optionele datum om te controleren (standaard: nu)
   * @returns {boolean} - Of het nachttarief van toepassing is
   */
  isNightTime(date = new Date()) {
    try {
      if (!(date instanceof Date) || isNaN(date)) {
        date = new Date();
      }
      
      const hours = date.getHours();
      const { start, end } = this.surcharges.night;
      
      // Als start > end (bijv. 23-6), dan is het nacht tussen start en middernacht OF tussen middernacht en end
      if (start > end) {
        return hours >= start || hours < end;
      }
      // Anders is het nacht tussen start en end
      return hours >= start && hours < end;
      
    } catch (error) {
      console.error('Fout bij controleren nachttarief:', error);
      return false;
    }
  }

  /**
   * Controleer of het weekendtarief van toepassing is
   * @param {Date} [date] - Optionele datum om te controleren (standaard: nu)
   * @returns {boolean} - Of het weekendtarief van toepassing is
   */
  isWeekend(date = new Date()) {
    try {
      if (!(date instanceof Date) || isNaN(date)) {
        date = new Date();
      }
      
      const day = date.getDay(); // 0 = zondag, 1 = maandag, ..., 6 = zaterdag
      const hours = date.getHours();
      const { startDay, startTime, endDay, endTime } = this.surcharges.weekend;
      
      // Controleer of het vrijdag na 18:00 is
      if (day === startDay && hours >= startTime) {
        return true;
      }
      
      // Controleer of het zaterdag is
      if (day === 6) {
        return true;
      }
      
      // Controleer of het zondag is
      if (day === 0) {
        return true;
      }
      
      // Controleer of het maandag voor 06:00 is
      if (day === endDay && hours < endTime) {
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Fout bij controleren weekend:', error);
      return false;
    }
  }

  /**
   * Controleer of het feestdagentarief van toepassing is
   * @param {Date} [date] - Optionele datum om te controleren (standaard: nu)
   * @returns {boolean} - Of het feestdagentarief van toepassing is
   */
  isHoliday(date = new Date()) {
    try {
      if (!(date instanceof Date) || isNaN(date)) {
        date = new Date();
      }
      
      const day = date.getDate();
      const month = date.getMonth() + 1; // Maanden zijn 0-gebaseerd
      const year = date.getFullYear();
      const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Controleer vaste feestdagen
      if (this.surcharges.holiday.fixedDates.includes(monthDay)) {
        // Speciaal geval: Bevrijdingsdag (alleen in jaren die deelbaar zijn door 5)
        if (monthDay === '05-05' && year % 5 !== 0) {
          return false;
        }
        return true;
      }
      
      // Controleer variabele feestdagen (Pasen, etc.)
      const variableHolidays = this.surcharges.holiday.getVariableHolidays(year);
      if (variableHolidays.includes(monthDay)) {
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Fout bij controleren feestdag:', error);
      return false;
    }
  }

  /**
   * Bereken alle van toepassing zijnde kortingen
   * @param {number} baseFare - Het basistarief
   * @param {Object} options - Opties voor kortingen
   * @returns {Object} - Kortingsdetails
   */
  calculateDiscounts(baseFare, options = {}) {
    try {
      let totalDiscount = 0;
      const discounts = [];
      
      // Retourkorting
      if (options.isRoundTrip) {
        const discount = baseFare * this.discounts.roundTrip;
        discounts.push({ 
          name: 'Retourkorting', 
          amount: parseFloat(discount.toFixed(2)),
          type: 'percentage',
          value: this.discounts.roundTrip * 100
        });
        totalDiscount += discount;
      }
      
      // Vaste klantenkorting
      if (options.isFrequentRider) {
        const discount = baseFare * this.discounts.frequentRider;
        discounts.push({ 
          name: 'Vaste klantenkorting', 
          amount: parseFloat(discount.toFixed(2)),
          type: 'percentage',
          value: this.discounts.frequentRider * 100
        });
        totalDiscount += discount;
      }
      
      // Online betalingskorting
      if (options.isOnlinePayment) {
        const discount = baseFare * this.discounts.onlinePayment;
        discounts.push({ 
          name: 'Online betalingskorting', 
          amount: parseFloat(discount.toFixed(2)),
          type: 'percentage',
          value: this.discounts.onlinePayment * 100
        });
        totalDiscount += discount;
      }
      
      // Promotiecode korting
      if (options.promoCode && this.discounts.promoCode[options.promoCode]) {
        const discountRate = this.discounts.promoCode[options.promoCode];
        const discount = baseFare * discountRate;
        discounts.push({ 
          name: `Kortingscode (${options.promoCode})`, 
          amount: parseFloat(discount.toFixed(2)),
          type: 'percentage',
          value: discountRate * 100
        });
        totalDiscount += discount;
      }
      
      // Zorg dat de totale korting niet hoger is dan het basisbedrag
      totalDiscount = Math.min(totalDiscount, baseFare);
      
      return {
        total: parseFloat(totalDiscount.toFixed(2)),
        details: discounts
      };
      
    } catch (error) {
      console.error('Fout bij berekenen kortingen:', error);
      throw error;
    }
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
   * Formatteer een bedrag als valuta
   * @param {number} amount - Het te formatteren bedrag
   * @param {string} [currency='EUR'] - De valuta (standaard EUR)
   * @returns {string} - Het geformatteerde bedrag
   */
  formatPrice(amount, currency = 'EUR') {
    try {
      return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.error('Fout bij formatteren prijs:', error);
      return `€ ${parseFloat(amount).toFixed(2)}`; // Fallback format
    }
  }
    
  /**
   * Schat de afstand en reistijd tussen twee locaties
   * @param {string} origin - Vertrekadres
   * @param {string} destination - Bestemming
   * @returns {Promise<Object>} - Geschatte afstand (km) en reistijd (min)
   */
  async estimateTrip(origin, destination) {
    try {
      // In een echte app zou dit een API zoals Google Maps of OSRM aanroepen
      // Voor nu retourneren we dummy data
      const distance = 10; // km
      const duration = 20; // minuten
      
      // Bereken de prijs voor deze rit
      const priceData = this.calculateTotalFare(distance, duration, {
        dateTime: new Date().toISOString(),
        fromAirport: origin.toLowerCase().includes('luchthaven') || origin.toLowerCase().includes('airport'),
        toAirport: destination.toLowerCase().includes('luchthaven') || destination.toLowerCase().includes('airport')
      });
      
      return { 
        distance, 
        duration,
        priceData,
        formatted: {
          distance: `${distance} km`,
          duration: `${duration} min`,
          price: this.formatPrice(priceData.total)
        }
      };
    } catch (error) {
      console.error('Fout bij schatten ritgegevens:', error);
      throw new Error('Kon de routegegevens niet ophalen');
    }
  }
  
  /**
   * Genereer een prijsopgave voor een rit
   * @param {number} distance - Afstand in kilometers
   * @param {number} duration - Reistijd in minuten
   * @param {Object} options - Opties voor de rit
   * @returns {Object} - Gedetailleerde prijsopgave
   */
  generateQuote(distance, duration, options = {}) {
    try {
      const priceData = this.calculateTotalFare(distance, duration, options);
      
      return {
        ...priceData,
        formatted: {
          baseFare: this.formatPrice(priceData.baseFare),
          subtotal: this.formatPrice(priceData.subtotal),
          total: this.formatPrice(priceData.total),
          surcharges: {
            total: this.formatPrice(priceData.surcharges.total),
            details: priceData.surcharges.details.map(item => ({
              ...item,
              amount: this.formatPrice(item.amount)
            }))
          },
          discounts: {
            total: this.formatPrice(priceData.discounts.total),
            details: priceData.discounts.details.map(item => ({
              ...item,
              amount: this.formatPrice(item.amount)
            }))
          }
        },
        distance: {
          value: distance,
          unit: 'km',
          formatted: `${parseFloat(distance).toFixed(1)} km`
        },
        duration: {
          value: duration,
          unit: 'min',
          formatted: `${Math.ceil(duration)} min`
        }
      };
      
    } catch (error) {
      console.error('Fout bij genereren prijsopgave:', error);
      throw error;
    }
  }
  
  /**
   * Valideer een kortingscode
   * @param {string} code - De te valideren kortingscode
   * @returns {Object} - Validatieresultaat
   */
  validatePromoCode(code) {
    try {
      if (!code || typeof code !== 'string') {
        return {
          isValid: false,
          message: 'Ongeldige code',
          discount: 0
        };
      }
      
      const upperCode = code.toUpperCase();
      const discountRate = this.discounts.promoCode[upperCode];
      const isValid = discountRate !== undefined;
      
      return {
        isValid,
        message: isValid ? 'Geldige kortingscode' : 'Ongeldige kortingscode',
        code: upperCode,
        discount: isValid ? discountRate * 100 : 0,
        formattedDiscount: isValid ? `${discountRate * 100}%` : '0%',
        discountRate: isValid ? discountRate : 0
      };
      
    } catch (error) {
      console.error('Fout bij valideren kortingscode:', error);
      return {
        isValid: false,
        message: 'Fout bij controleren code',
        discount: 0,
        formattedDiscount: '0%',
        discountRate: 0
      };
    }
  }
  
  /**
   * Haal een overzicht van alle beschikbare kortingen op
   * @returns {Object} - Overzicht van beschikbare kortingen
   */
  getAvailableDiscounts() {
    return {
      roundTrip: {
        name: 'Retourkorting',
        value: this.discounts.roundTrip * 100,
        formatted: `${this.discounts.roundTrip * 100}%`,
        description: 'Korting bij een retourrit'
      },
      frequentRider: {
        name: 'Vaste klantenkorting',
        value: this.discounts.frequentRider * 100,
        formatted: `${this.discounts.frequentRider * 100}%`,
        description: 'Korting voor vaste klanten'
      },
      onlinePayment: {
        name: 'Online betalingskorting',
        value: this.discounts.onlinePayment * 100,
        formatted: `${this.discounts.onlinePayment * 100}%`,
        description: 'Korting bij online betalen'
      },
      promoCode: {
        name: 'Actiecodes',
        codes: Object.entries(this.discounts.promoCode).map(([code, value]) => ({
          code,
          value: value * 100,
          formatted: `${value * 100}%`,
          description: `Actiecode: ${code}`
        }))
      }
    };
  }
}
