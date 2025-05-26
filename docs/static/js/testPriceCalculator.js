// Importeer de PriceCalculator klasse
import { PriceCalculator } from './priceCalculator.js';

// Maak een nieuwe instantie van de prijscalculator
const calculator = new PriceCalculator();

// Testgegevens
const testData = {
  distance: 15, // km
  duration: 25, // minuten
  options: {
    dateTime: '2023-12-25T20:00:00', // Kerstavond om 20:00
    passengers: 2,
    luggage: 1,
    fromAirport: false,
    toAirport: false,
    isRoundTrip: false,
    isFrequentRider: true,
    paymentMethod: 'online',
    promoCode: 'WELKOM10'
  }
};

// Voer de tests uit
function runTests() {
  console.log('=== Testen Prijscalculator ===\n');
  
  // Test 1: Basisprijsberekening
  try {
    const baseFare = calculator.calculateBaseFare(testData.distance, testData.duration);
    console.log(`✅ Basisprijs voor ${testData.distance} km en ${testData.duration} min:`, calculator.formatPrice(baseFare));
  } catch (error) {
    console.error('❌ Fout bij basisprijsberekening:', error.message);
  }
  
  // Test 2: Toeslagen berekenen
  try {
    const surcharges = calculator.calculateSurcharges(testData.distance, testData.duration, testData.options);
    console.log(`✅ Toeslagen totaal:`, calculator.formatPrice(surcharges.total));
    console.log('   Details:', surcharges.details.map(d => `${d.description}: ${calculator.formatPrice(d.amount)}`).join(', '));
  } catch (error) {
    console.error('❌ Fout bij berekenen toeslagen:', error.message);
  }
  
  // Test 3: Kortingen berekenen
  try {
    const discounts = calculator.calculateDiscounts(testData.distance, testData.duration, testData.options);
    console.log(`✅ Kortingen totaal:`, calculator.formatPrice(discounts.total));
    console.log('   Details:', discounts.details.map(d => `${d.description}: ${calculator.formatPrice(d.amount)}`).join(', '));
  } catch (error) {
    console.error('❌ Fout bij berekenen kortingen:', error.message);
  }
  
  // Test 4: Totale prijsberekening
  try {
    const totalFare = calculator.calculateTotalFare(testData.distance, testData.duration, testData.options);
    console.log(`✅ Totaalprijs:`, calculator.formatPrice(totalFare.total));
    console.log(`   Inclusief BTW (${totalFare.taxRate * 100}%):`, calculator.formatPrice(totalFare.taxAmount));
  } catch (error) {
    console.error('❌ Fout bij totale prijsberekening:', error.message);
  }
  
  // Test 5: Prijsopgave genereren
  try {
    const quote = calculator.generateQuote(testData.distance, testData.duration, testData.options);
    console.log(`✅ Prijsopgave gegenereerd:`, quote.formatted.total);
  } catch (error) {
    console.error('❌ Fout bij genereren prijsopgave:', error.message);
  }
  
  // Test 6: Kortingscode valideren
  try {
    const validation = calculator.validatePromoCode('WELKOM10');
    console.log(`✅ Kortingscode validatie (WELKOM10):`, validation.isValid ? 'Geldig' : 'Ongeldig');
    console.log(`   Korting: ${validation.formattedDiscount}`);
  } catch (error) {
    console.error('❌ Fout bij valideren kortingscode:', error.message);
  }
  
  // Test 7: Rit schatten
  try {
    console.log('\n=== Rit schatten ===');
    const estimate = await calculator.estimateTrip('Amsterdam Centraal', 'Schiphol Airport');
    console.log(`✅ Geschatte afstand: ${estimate.formatted.distance}`);
    console.log(`✅ Geschatte reistijd: ${estimate.formatted.duration}`);
    console.log(`✅ Geschatte prijs: ${estimate.formatted.price}`);
  } catch (error) {
    console.error('❌ Fout bij schatten rit:', error.message);
  }
}

// Voer de tests uit
runTests().catch(console.error);
