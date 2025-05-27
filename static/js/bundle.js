// Bundle bestand dat alle JavaScript bestanden laadt
// Dit bestand wordt handmatig samengesteld

// Laad alle benodigde bestanden in de juiste volgorde
const scripts = [
  'static/js/config.js',
  'static/js/translations.js',
  'static/js/utils.js',
  'static/js/location.js',
  'static/js/addressSuggestions.js',
  'static/js/priceCalculator.js',
  'static/js/map.js',
  'static/js/idealPayment.js',
  'static/js/languageSettings.js',
  'static/js/formHandler.js',
  'static/js/draft-manager.js',
  'static/js/app.js',
  'static/js/main.js'
];

// Functie om scripts te laden
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log(`✅ ${src} loaded`);
      resolve();
    };
    script.onerror = () => {
      console.error(`❌ Error loading ${src}`);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

// Laad alle scripts
async function loadAllScripts() {
  try {
    for (const script of scripts) {
      await loadScript(script);
    }
    console.log('All scripts loaded successfully');
  } catch (error) {
    console.error('Error loading scripts:', error);
  }
}

// Start het laden van de scripts
loadAllScripts().then(() => {
  // Initialiseer de app wanneer klaar
  if (typeof App !== 'undefined') {
    const app = new App();
    window.app = app;
    app.initialize().catch(error => {
      console.error('Fout bij het starten van de applicatie:', error);
    });
  }
});
