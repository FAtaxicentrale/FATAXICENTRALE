/**
 * Helper functie om modules consistent te exporteren in verschillende omgevingen
 * @param {string} moduleName - Naam van de module (wordt gebruikt voor globale export)
 * @param {Object} exports - Object met de te exporteren waarden
 */
function registerModule(moduleName, exports) {
  // CommonJS/Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }
  
  // Browser globals
  if (typeof window !== 'undefined') {
    window[moduleName] = exports;
  }
  
  // ES Module export (wordt genegeerd als niet ondersteund)
  try {
    // Creëer een dynamische export als we in een module context zitten
    const exportObj = {};
    for (const [key, value] of Object.entries(exports)) {
      exportObj[key] = value;
    }
    return exportObj;
  } catch (e) {
    // Geen module ondersteuning, we hebben al aan window toegevoegd
    return exports;
  }
}

// Exporteer de helper zelf
const moduleHelper = { registerModule };

// Registreer de helper in alle beschikbare module systemen
if (typeof module !== 'undefined' && module.exports) {
  module.exports = moduleHelper;
}

if (typeof window !== 'undefined') {
  window.moduleHelper = moduleHelper;
}

export { registerModule };
export default moduleHelper;
