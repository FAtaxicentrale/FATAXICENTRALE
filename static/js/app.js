// Functie om modules veilig te laden
async function loadModule(modulePath) {
    try {
        const module = await import(modulePath);
        console.log(`Module geladen: ${modulePath}`);
        return module;
    } catch (error) {
        console.error(`Fout bij het laden van module: ${modulePath}`, error);
        return null;
    }
}

// Hoofdapplicatie klasse
class App {
    constructor() {
        this.modules = {};
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('Bezig met initialiseren van de applicatie...');

            // Initialiseer de kaart eerst
            if (document.getElementById('map')) {
                await import('./map.js').then(module => {
                    this.modules.mapManager = module.mapManager;
                    this.modules.mapManager.init();
                    console.log('Kaart module geladen en geïnitialiseerd');
                }).catch(error => {
                    console.error('Fout bij het laden van de kaart module:', error);
                });
            }

            // Laad alle overige modules
            await this.loadModules();

            // Initialiseer de UI met de map manager
            await this.initializeUI();
            
            // Voeg event listeners toe
            this.addEventListeners();
            
            // Log dat de applicatie klaar is
            console.log('Applicatie is klaar voor gebruik');

            this.initialized = true;
            console.log('Applicatie succesvol geïnitialiseerd');
        } catch (error) {
            console.error('Fout bij het initialiseren van de applicatie:', error);
            this.showError('Er is een fout opgetreden bij het laden van de applicatie');
        }
    }

    async loadModules() {
        const modulePaths = [
            './config.js',
            './utils.js',
            './location.js',
            './addressSuggestions.js',
            './idealPayment.js',
            './languageSettings.js',
            './priceCalculator.js',
            './formHandler.js',
            './ui.js',
            './validator.js',
            // Opmerking: map.js wordt apart geladen om laadvolgorde te garanderen,
            './map.js'
        ];

        // Laad alle modules parallel
        const loadedModules = await Promise.all(modulePaths.map(loadModule));
        
        // Sla de modules op in het modules object
        [
            'config', 'utils', 'location', 'addressSuggestions',
            'idealPayment', 'languageSettings', 'priceCalculator',
            'formHandler', 'ui', 'validator'
        ].forEach((name, index) => {
            this.modules[name] = loadedModules[index];
        });
    }

    async initializeUI() {
        try {
            // Initialiseer de UI componenten
            if (this.modules.ui?.UI) {
                this.ui = new this.modules.ui.UI();
                
                // Geef de benodigde managers door aan de UI
                const managers = {
                    mapManager: this.modules.map || window.mapManager,
                    bookingManager: this.modules.booking?.bookingManager
                };
                
                await this.ui.initialize(managers);
                console.log('UI succesvol geïnitialiseerd');
            }

            // Initialiseer adressuggesties als aparte module
            if (this.modules.addressSuggestions?.AddressSuggestions) {
                this.addressSuggestions = new this.modules.addressSuggestions.AddressSuggestions();
                await this.initializeAddressSuggestions();
                console.log('Adres suggesties succesvol geïnitialiseerd');
            }
        } catch (error) {
            console.error('Fout bij het initialiseren van de UI componenten:', error);
            throw error;
        }
    }

    async initializeAddressSuggestions() {
        try {
            // Voeg hier de adres suggesties initialisatie code toe
            console.log('Adres suggesties initialiseren...');
            // ... bestaande code voor adres suggesties ...
        } catch (error) {
            console.error('Fout bij het initialiseren van adres suggesties:', error);
        }
    }

    addEventListeners() {
        // Voeg hier event listeners toe
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.suggesties-box') && !e.target.matches('input[data-suggestie]')) {
                this.addressSuggestions?.closeAllSuggestions();
            }
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        errorDiv.innerHTML = `
            <h2>Er is een fout opgetreden</h2>
            <p>${message}</p>
            <p>Probeer de pagina te verversen. Als het probleem aanhoudt, neem dan contact op met de beheerder.</p>
        `;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
}

// Exporteer de App klasse voor gebruik in andere bestanden
export { App };

// Initialiseer de applicatie wanneer het DOM geladen is
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new App();
    await app.initialize();
});
