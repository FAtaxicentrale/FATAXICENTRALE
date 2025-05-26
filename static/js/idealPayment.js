// iDEAL Betaling module
export class IdealPayment {
    constructor() {
        this.lastPrice = null;
        this.ritId = null;
    }

    async startPayment() {
        try {
            // Controleer prijs
            if (!this.lastPrice || isNaN(this.lastPrice) || parseFloat(this.lastPrice) <= 0) {
                const priceInput = document.getElementById('ritprijs');
                if (priceInput && priceInput.value && !isNaN(priceInput.value) && parseFloat(priceInput.value) > 0) {
                    this.lastPrice = priceInput.value;
                } else {
                    throw new Error('Voer eerst een geldige prijs in');
                }
            }

            // Controleer login status
            if (!window.isLoggedIn) {
                throw new Error('U moet eerst inloggen voordat u iDEAL kunt gebruiken');
            }

            // Controleer telefoonnummer
            const phone = document.getElementById('telefoon');
            if (!phone || !phone.value) {
                throw new Error('Voer eerst uw telefoonnummer in');
            }

            // Controleer ritId
            if (!this.ritId) {
                throw new Error('Er is nog geen rit gereserveerd');
            }

            // Controleer akkoord
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
            alert(error.message || 'Er is een fout opgetreden bij het starten van de iDEAL betaling');
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
