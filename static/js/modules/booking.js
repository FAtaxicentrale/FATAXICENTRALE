/**
 * Booking module - Handles all booking related functionality
 */

export class BookingManager {
    constructor() {
        this.bookingData = {
            pickupAddress: '',
            dropoffAddress: '',
            stops: [],
            date: '',
            time: '',
            paymentMethod: '',
            discountCode: '',
            notes: '',
            pets: false,
            termsAccepted: false,
            urgent: false
        };
    }

    /**
     * Initialize booking manager
     */
    initialize() {
        this.loadDraft();
        this.setupEventListeners();
        console.log('Booking manager initialized');
    }

    /**
     * Save booking data to local storage as draft
     */
    saveDraft() {
        try {
            localStorage.setItem('bookingDraft', JSON.stringify(this.bookingData));
        } catch (error) {
            console.error('Error saving booking draft:', error);
        }
    }

    /**
     * Load booking data from local storage
     */
    loadDraft() {
        try {
            const draft = localStorage.getItem('bookingDraft');
            if (draft) {
                this.bookingData = { ...this.bookingData, ...JSON.parse(draft) };
                this.updateFormFromData();
            }
        } catch (error) {
            console.error('Error loading booking draft:', error);
        }
    }

    /**
     * Update form fields from booking data
     */
    updateFormFromData() {
        // Update form fields based on bookingData
        const { pickupAddress, dropoffAddress, date, time, paymentMethod, discountCode, notes, pets, termsAccepted, urgent } = this.bookingData;
        
        if (document.getElementById('ophaaladres')) document.getElementById('ophaaladres').value = pickupAddress || '';
        if (document.getElementById('afzetadres')) document.getElementById('afzetadres').value = dropoffAddress || '';
        if (document.getElementById('datum')) document.getElementById('datum').value = date || '';
        if (document.getElementById('tijd')) document.getElementById('tijd').value = time || '';
        if (document.getElementById('betaalmethode')) document.getElementById('betaalmethode').value = paymentMethod || '';
        if (document.getElementById('kortingscode')) document.getElementById('kortingscode').value = discountCode || '';
        if (document.getElementById('opmerkingen')) document.getElementById('opmerkingen').value = notes || '';
        if (document.getElementById('huisdier')) document.getElementById('huisdier').checked = Boolean(pets);
        if (document.getElementById('akkoord')) document.getElementById('akkoord').checked = Boolean(termsAccepted);
        if (document.getElementById('spoed')) document.getElementById('spoed').checked = Boolean(urgent);
    }

    /**
     * Setup event listeners for form fields
     */
    setupEventListeners() {
        // Add event listeners to form fields to update bookingData
        const fields = [
            { id: 'ophaaladres', prop: 'pickupAddress' },
            { id: 'afzetadres', prop: 'dropoffAddress' },
            { id: 'datum', prop: 'date' },
            { id: 'tijd', prop: 'time' },
            { id: 'betaalmethode', prop: 'paymentMethod' },
            { id: 'kortingscode', prop: 'discountCode' },
            { id: 'opmerkingen', prop: 'notes' },
            { id: 'huisdier', prop: 'pets', isCheckbox: true },
            { id: 'akkoord', prop: 'termsAccepted', isCheckbox: true },
            { id: 'spoed', prop: 'urgent', isCheckbox: true }
        ];

        fields.forEach(({ id, prop, isCheckbox }) => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = isCheckbox ? 'change' : 'input';
                element.addEventListener(eventType, (e) => {
                    this.bookingData[prop] = isCheckbox ? e.target.checked : e.target.value;
                    this.saveDraft();
                });
            }
        });

        // Add event listener for window unload to save draft
        window.addEventListener('beforeunload', () => this.saveDraft());
    }

    /**
     * Validate booking data
     */
    validate() {
        const { pickupAddress, dropoffAddress, date, time, termsAccepted } = this.bookingData;
        
        if (!pickupAddress || !dropoffAddress) {
            throw new Error('Vul zowel ophaal- als afzetadres in');
        }
        
        if (!date || !time) {
            throw new Error('Vul een geldige datum en tijd in');
        }
        
        if (!termsAccepted) {
            throw new Error('U moet akkoord gaan met de voorwaarden');
        }
        
        return true;
    }

    /**
     * Submit booking
     */
    async submit() {
        try {
            this.validate();
            
            // Here you would typically send the booking to your backend
            console.log('Submitting booking:', this.bookingData);
            
            // For now, just show a success message
            alert('Boeking succesvol ingediend!');
            
            // Clear the draft after successful submission
            localStorage.removeItem('bookingDraft');
            this.bookingData = {};
            
            return { success: true };
        } catch (error) {
            console.error('Booking submission failed:', error);
            throw error;
        }
    }
}

// Create and export a singleton instance
export const bookingManager = new BookingManager();
