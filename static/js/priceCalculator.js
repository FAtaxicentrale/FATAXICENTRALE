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
        amount: 2.50,   // Bedrag in euro's
        percentage: 0   // Percentage van het totaal (optioneel)
      },
      
      // Weekendtoeslag (vrijdag 18:00 - maandag 06:00)
      weekend: {
        days: [5, 6, 0], // Vrijdag, zaterdag, zondag
        startHour: 18,   // Vrijdagavond
        endHour: 6,      // Maandagochtend
        amount: 3.00,    // Bedrag in euro's
        percentage: 0    // Percentage van het totaal (optioneel)
      },
      
      // Feestdagen
      holiday: {
        amount: 4.00,    // Bedrag in euro's
        percentage: 0,   // Percentage van het totaal (optioneel)
        holidays: [      // Nederlandse feestdagen (voorbeeld, uitbreidbaar)
          '01-01', // Nieuwjaarsdag
          '04-27', // Koningsdag
          '05-05', // Bevrijdingsdag (niet altijd vrij)
          '12-25', // Eerste kerstdag
          '12-26'  // Tweede kerstdag
        ]
      },
      
      // Luchthaventoeslag
      airport: {
        amount: 7.50,    // Vast bedrag
        locations: [    // Luchthaven locaties (coördinaten of plaatsnamen)
          'Schiphol',
          'Eindhoven Airport',
          'Rotterdam The Hague Airport',
          'Groningen Airport Eelde',
          'Maastricht Aachen Airport'
        ]
      },
      
      // Reserveringstoeslag (bij vooraf boeken)
      reservation: {
        amount: 2.50
      },
      
      // Betaalwijze toeslag (bij contant betalen)
      paymentMethod: {
        cash: 0,        // Geen toeslag voor contant
        pin: 0,         // Geen toeslag voor pin
        creditcard: 1.50 // Toeslag voor creditcard
      },
      
      // Extra passagiers (per persoon boven de 4)
      extraPassenger: {
        amount: 1.00
      },
      
      // Grote bagage (per stuk)
      largeLuggage: {
        amount: 1.50
      },
      
      // Huisdieren (per dier)
      pet: {
        amount: 2.00
      },
      
      // Wachtgeld (per begonnen kwartier)
      waitingTime: {
        perMinute: 0.50
      }
    };
    
    // Kilometervergoeding bij files
    this.trafficJamRate = 0.35; // Per minuut stilstand
    
    // Kilometervergoeding bij omrijden
    this.detourRate = 2.00; // Per extra kilometer
  }
  
  /**
   * Bereken de basisprijs op basis van afstand en reistijd
   * @param {number} distance - Afstand in kilometers
   * @param {number} duration - Reistijd in minuten
   * @returns {number} Basisprijs in euro's
   */
  calculateBasePrice(distance, duration) {
    if (isNaN(distance) || isNaN(duration) || distance < 0 || duration < 0) {
      throw new Error('Ongeldige invoer voor berekening basisprijs');
    }
    
    const distanceCost = distance * this.baseRates.perKm;
    const timeCost = duration * this.baseRates.perMinute;
    let total = this.baseRates.start + distanceCost + timeCost;
    
    // Zorg ervoor dat het totaal binnen de minimum- en maximumbedragen valt
    total = Math.max(total, this.baseRates.minFare);
    total = Math.min(total, this.baseRates.maxFare);
    
    return this.roundPrice(total);
  }
  
  /**
   * Controleer of er nachttoeslag van toepassing is
   * @param {Date} date - Te controleren datum/tijd
   * @returns {boolean} Of nachttoeslag van toepassing is
   */
  isNightSurcharge(date) {
    const hour = date.getHours();
    return hour >= this.surcharges.night.start || hour < this.surcharges.night.end;
  }
  
  /**
   * Controleer of er weekendtoeslag van toepassing is
   * @param {Date} date - Te controleren datum/tijd
   * @returns {boolean} Of weekendtoeslag van toepassing is
   */
  isWeekendSurcharge(date) {
    const day = date.getDay(); // 0 = zondag, 6 = zaterdag
    const hour = date.getHours();
    
    // Vrijdagavond na 18:00
    if (day === 5 && hour >= this.surcharges.weekend.startHour) return true;
    
    // Zaterdag de hele dag
    if (day === 6) return true;
    
    // Zondag tot 06:00
    if (day === 0 && hour < this.surcharges.weekend.endHour) return true;
    
    return false;
  }
  
  /**
   * Controleer of het een feestdag is
   * @param {Date} date - Te controleren datum
   * @returns {boolean} Of het een feestdag is
   */
  isHoliday(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dateStr = `${month}-${day}`;
    
    return this.surcharges.holiday.holidays.includes(dateStr);
  }
  
  /**
   * Bereken alle toeslagen
   * @param {Object} options - Opties voor de berekening
   * @param {Date} options.date - Datum/tijd van de rit
   * @param {string} options.paymentMethod - Betaalmethode ('cash', 'pin', 'creditcard')
   * @param {number} options.passengers - Aantal passagiers
   * @param {number} options.largeLuggage - Aantal grote bagagestukken
   * @param {number} options.pets - Aantal huisdieren
   * @param {number} options.waitingTime - Wachttijd in minuten
   * @param {boolean} options.isAirport - Of de bestemming een luchthaven is
   * @returns {Object} Overzicht van alle toeslagen
   */
  calculateSurcharges({
    date = new Date(),
    paymentMethod = 'pin',
    passengers = 1,
    largeLuggage = 0,
    pets = 0,
    waitingTime = 0,
    isAirport = false
  } = {}) {
    const result = {
      night: 0,
      weekend: 0,
      holiday: 0,
      airport: 0,
      payment: 0,
      extraPassenger: 0,
      luggage: 0,
      pets: 0,
      waiting: 0,
      total: 0
    };
    
    // Nachttoeslag
    if (this.isNightSurcharge(date)) {
      result.night = this.surcharges.night.amount;
    }
    
    // Weekendtoeslag
    if (this.isWeekendSurcharge(date)) {
      result.weekend = this.surcharges.weekend.amount;
    }
    
    // Feestdagentoeslag
    if (this.isHoliday(date)) {
      result.holiday = this.surcharges.holiday.amount;
    }
    
    // Luchthaventoeslag
    if (isAirport) {
      result.airport = this.surcharges.airport.amount;
    }
    
    // Betaalmethode toeslag
    if (this.surcharges.paymentMethod[paymentMethod] !== undefined) {
      result.payment = this.surcharges.paymentMethod[paymentMethod];
    }
    
    // Extra passagiers (boven de 4)
    const extraPassengers = Math.max(0, passengers - 4);
    if (extraPassengers > 0) {
      result.extraPassenger = extraPassengers * this.surcharges.extraPassenger.amount;
    }
    
    // Grote bagage
    if (largeLuggage > 0) {
      result.luggage = largeLuggage * this.surcharges.largeLuggage.amount;
    }
    
    // Huisdieren
    if (pets > 0) {
      result.pets = pets * this.surcharges.pet.amount;
    }
    
    // Wachttijd (afgerond naar boven op hele minuten)
    if (waitingTime > 0) {
      const minutes = Math.ceil(waitingTime);
      result.waiting = minutes * this.surcharges.waitingTime.perMinute;
    }
    
    // Bereken totaal
    result.total = Object.values(result).reduce((sum, value) => sum + value, 0);
    
    return result;
  }
  
  /**
   * Bereken de totale prijs inclusief alle toeslagen
   * @param {Object} options - Opties voor de berekening
   * @param {number} options.distance - Afstand in kilometers
   * @param {number} options.duration - Reistijd in minuten
   * @param {Object} options.surcharges - Toeslagen (optioneel, wordt berekend indien niet opgegeven)
   * @param {number} options.discount - Kortingspercentage (0-100)
   * @returns {Object} Gedetailleerde prijsopgave
   */
  calculateTotalPrice({
    distance,
    duration,
    surcharges = null,
    discount = 0
  }) {
    // Bereken basisprijs
    const basePrice = this.calculateBasePrice(distance, duration);
    
    // Bereken toeslagen indien niet opgegeven
    const calculatedSurcharges = surcharges || this.calculateSurcharges();
    const totalSurcharges = calculatedSurcharges.total || 0;
    
    // Bereken totaal voor korting
    let subtotal = basePrice + totalSurcharges;
    
    // Pas korting toe indien van toepassing
    let discountAmount = 0;
    if (discount > 0 && discount <= 100) {
      discountAmount = (subtotal * discount) / 100;
      subtotal -= discountAmount;
    }
    
    // Rond af op 2 decimalen
    const total = this.roundPrice(subtotal);
    
    return {
      base: basePrice,
      surcharges: calculatedSurcharges,
      totalSurcharges: this.roundPrice(totalSurcharges),
      discount: this.roundPrice(discountAmount),
      total: total,
      formatted: this.formatPrice(total)
    };
  }
  
  /**
   * Rond een bedrag af op 2 decimalen
   * @param {number} amount - Te ronden bedrag
   * @returns {number} Afgerond bedrag
   */
  roundPrice(amount) {
    return Math.round(amount * 100) / 100;
  }
  
  /**
   * Formatteer een bedrag als valuta
   * @param {number} amount - Te formatteren bedrag
   * @returns {string} Geformatteerd bedrag met valutateken
   */
  formatPrice(amount) {
    return `€ ${amount.toFixed(2).replace('.', ',')}`;
  }
  
  /**
   * Genereer een prijsopgave voor weergave
   * @param {Object} priceInfo - Prijsinformatie van calculateTotalPrice
   * @returns {string} Geformatteerde prijsopgave
   */
  generatePriceBreakdown(priceInfo) {
    if (!priceInfo) return '';
    
    const lines = [
      `Basisprijs: ${this.formatPrice(priceInfo.base)}`,
      `Toeslagen: ${this.formatPrice(priceInfo.totalSurcharges)}`
    ];
    
    if (priceInfo.discount > 0) {
      lines.push(`Korting: -${this.formatPrice(priceInfo.discount)}`);
    }
    
    lines.push(`Totaal: ${this.formatPrice(priceInfo.total)}`);
    
    return lines.join('\n');
  }
}

export default PriceCalculator;
