// iDEAL Betaling module
class IdealPayment {
    constructor() {
        this.lastPrice = null;
        this.ritId = null;
        this.initialize();
    }
    
    initialize() {
        // Voeg event listeners toe voor prijswijzigingen
        const priceElement = document.getElementById('ritprijs');
        if (priceElement) {
            // Gebruik een MutationObserver om wijzigingen in de prijs te detecteren
            const observer = new MutationObserver((mutations) => {
                this.updateIdealButtonVisibility();
            });
            
            // Configureer en start de observer
            observer.observe(priceElement, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
            
            // Initialiseer de knop zichtbaarheid
            this.updateIdealButtonVisibility();
        }
    }
    
    updateIdealButtonVisibility() {
        const idealBtn = document.getElementById('idealPayBtn');
        if (!idealBtn) return;
        
        const priceElement = document.getElementById('ritprijs');
        if (priceElement) {
            const priceText = priceElement.textContent || priceElement.value || '0';
            const price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
            
            if (price > 0) {
                idealBtn.style.display = 'flex';
                this.lastPrice = price;
            } else {
                idealBtn.style.display = 'none';
            }
        }
    }

    async startPayment() {
        const idealBtn = document.getElementById('idealPayBtn');
        const originalBtnHtml = idealBtn ? idealBtn.innerHTML : '';
        
        try {
            // Toon laadstatus op de knop
            if (idealBtn) {
                idealBtn.disabled = true;
                idealBtn.innerHTML = '<span class="spinner"></span> Bezig met voorbereiden...';
            }
            
            // Controleer prijs
            if (!this.lastPrice || isNaN(this.lastPrice) || parseFloat(this.lastPrice) <= 0) {
                const priceElement = document.getElementById('ritprijs');
                if (priceElement) {
                    const priceText = priceElement.textContent || priceElement.value || '0';
                    const price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    
                    if (price > 0) {
                        this.lastPrice = price;
                    } else {
                        throw new Error('Voer eerst een geldige prijs in');
                    }
                } else {
                    throw new Error('Kan de prijs niet vinden');
                }
            }

            // Controleer login status
            if (!window.isLoggedIn) {
                throw new Error('U moet eerst inloggen voordat u iDEAL kunt gebruiken');
            }

            // Controleer verplichte velden
            const requiredFields = [
                { id: 'telefoon', error: 'Voer uw telefoonnummer in' },
                { id: 'naam', error: 'Voer uw naam in' },
                { id: 'email', error: 'Voer uw e-mailadres in' },
                { id: 'ophaaladres', error: 'Voer het ophaaladres in' },
                { id: 'afzetadres', error: 'Voer het afzetadres in' }
            ];
            
            for (const field of requiredFields) {
                const element = document.getElementById(field.id);
                if (!element || !element.value.trim()) {
                    throw new Error(field.error);
                }
            }

            // Controleer of er een rit is berekend
            if (!this.ritId) {
                const ritprijs = document.getElementById('ritprijs');
                if (!ritprijs || !ritprijs.textContent || ritprijs.textContent.includes('0,00')) {
                    throw new Error('Bereken eerst de ritprijs voordat u betaalt');
                }
            }

            // Controleer akkoord met voorwaarden
            const agreement = document.getElementById('akkoord');
            if (!agreement || !agreement.checked) {
                throw new Error('U moet akkoord gaan met de voorwaarden voordat u kunt betalen');
            }

            // Haal iDEAL configuratie op
            const idealConfig = await this.getIdealConfig();
            
            // Start iDEAL betaling
            const response = await fetch('/api/ideal/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ritId: this.ritId,
                    bedrag: this.lastPrice,
                    iban: idealConfig.iban,
                    bank: idealConfig.bank
                })
            });

            if (!response.ok) {
                throw new Error('Kon iDEAL betaling niet starten');
            }

            const data = await response.json();
            window.open(data.url, '_blank');
        } catch (error) {
            console.error('Fout bij iDEAL betaling:', error);
            
            // Toon de foutmelding in het resultaatveld als het beschikbaar is
            const resultElement = document.getElementById('resultaat');
            if (resultElement) {
                resultElement.innerHTML = `
                    <div class="error-message" style="color: #d32f2f; background-color: #ffebee; 
                        padding: 12px; border-radius: 4px; margin: 10px 0; border-left: 4px solid #d32f2f;">
                        <strong>Fout:</strong> ${error.message || 'Er is een fout opgetreden bij het starten van de betaling'}
                    </div>`;
                
                // Scroll naar de foutmelding
                resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // Fallback naar alert als het resultaatveld niet beschikbaar is
                alert(`Fout: ${error.message || 'Er is een fout opgetreden bij het starten van de betaling'}`);
            }
            
            // Herstel knop
            if (idealBtn) {
                idealBtn.disabled = false;
                idealBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    async getIdealConfig() {
        try {
            const response = await fetch('/api/ideal/config');
            if (!response.ok) {
                throw new Error('Kon iDEAL configuratie niet ophalen');
            }
            return await response.json();
        } catch (error) {
            console.error('Fout bij ophalen van iDEAL configuratie:', error);
            
            // Toon de foutmelding in het resultaatveld als het beschikbaar is
            const resultElement = document.getElementById('resultaat');
            if (resultElement) {
                resultElement.innerHTML = `
                    <div class="error-message" style="color: #d32f2f; background-color: #ffebee; 
                        padding: 12px; border-radius: 4px; margin: 10px 0; border-left: 4px solid #d32f2f;">
                        <strong>Fout:</strong> ${error.message || 'Er is een fout opgetreden bij het ophalen van de iDEAL configuratie'}
                    </div>`;
                
                // Scroll naar de foutmelding
                resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // Fallback naar alert als het resultaatveld niet beschikbaar is
                alert(`Fout: ${error.message || 'Er is een fout opgetreden bij het ophalen van de iDEAL configuratie'}`);
            }
            throw error;
        }
    }

    setPrice(price) {
        this.lastPrice = price;
    }

    setRitId(ritId) {
        this.ritId = ritId;
    }
}

// Exporteer de klasse voor gebruik in andere modules
export { IdealPayment };

// Maak beschikbaar in globaal bereik voor achterwaartse compatibiliteit
if (typeof window !== 'undefined') {
  window.IdealPayment = IdealPayment;
  window.idealPayment = new IdealPayment();
  
  // Globale functie voor backward compatibility
  window.startIdealPay = function() {
    if (window.idealPayment) {
      return window.idealPayment.startPayment();
    } else {
      console.error('iDEAL betalingsmodule is niet geladen');
      return false;
    }
  };
}
