/**
 * Booking Module
 * Handles all booking-related functionality
 */

export class Booking {
  constructor(app) {
    this.app = app;
    this.bookings = this.loadBookings();
    this.currentBooking = null;
  }

  /**
   * Create a new booking
   * @param {Object} bookingData - The booking data
   * @returns {Promise<Object>} - The created booking with ID and status
   */
  async createBooking(bookingData) {
    try {
      // Validate booking data
      if (!this.validateBookingData(bookingData)) {
        throw new Error('Ongeldige boekingsgegevens');
      }
      
      // Generate booking reference
      const bookingRef = this.generateBookingReference();
      
      // Create booking object
      const booking = {
        id: Date.now().toString(),
        reference: bookingRef,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...bookingData
      };
      
      // Add to bookings
      this.bookings.push(booking);
      
      // Save to local storage
      this.saveBookings();
      
      // Set as current booking
      this.currentBooking = booking;
      
      // In a real app, this would send the booking to your backend
      await this.sendBookingToBackend(booking);
      
      return {
        success: true,
        bookingId: booking.id,
        reference: booking.reference,
        status: booking.status
      };
      
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        error: error.message || 'Er is een fout opgetreden bij het maken van de boeking'
      };
    }
  }

  /**
   * Get a booking by ID
   * @param {string} bookingId - The booking ID
   * @returns {Object|null} - The booking or null if not found
   */
  getBooking(bookingId) {
    return this.bookings.find(booking => booking.id === bookingId) || null;
  }

  /**
   * Update a booking
   * @param {string} bookingId - The booking ID
   * @param {Object} updates - The updates to apply
   * @returns {boolean} - Whether the update was successful
   */
  updateBooking(bookingId, updates) {
    const index = this.bookings.findIndex(booking => booking.id === bookingId);
    
    if (index === -1) return false;
    
    // Update booking
    this.bookings[index] = {
      ...this.bookings[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Save to local storage
    this.saveBookings();
    
    // Update current booking if it's the one being updated
    if (this.currentBooking && this.currentBooking.id === bookingId) {
      this.currentBooking = this.bookings[index];
    }
    
    return true;
  }

  /**
   * Cancel a booking
   * @param {string} bookingId - The booking ID
   * @param {string} [reason] - Optional cancellation reason
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelBooking(bookingId, reason = '') {
    return this.updateBooking(bookingId, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toISOString()
    });
  }

  /**
   * Get all bookings
   * @param {Object} [filters] - Optional filters
   * @returns {Array} - The filtered bookings
   */
  getBookings(filters = {}) {
    let result = [...this.bookings];
    
    // Apply filters
    if (filters.status) {
      result = result.filter(booking => booking.status === filters.status);
    }
    
    if (filters.customerId) {
      result = result.filter(booking => booking.customerId === filters.customerId);
    }
    
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      result = result.filter(booking => new Date(booking.pickupDateTime) >= dateFrom);
    }
    
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      // Set to end of day
      dateTo.setHours(23, 59, 59, 999);
      result = result.filter(booking => new Date(booking.pickupDateTime) <= dateTo);
    }
    
    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return result;
  }

  /**
   * Get the current booking
   * @returns {Object|null} - The current booking or null
   */
  getCurrentBooking() {
    return this.currentBooking;
  }

  /**
   * Clear the current booking
   */
  clearCurrentBooking() {
    this.currentBooking = null;
  }

  /**
   * Validate booking data
   * @param {Object} data - The booking data to validate
   * @returns {boolean} - Whether the data is valid
   */
  validateBookingData(data) {
    if (!data) return false;
    
    const requiredFields = [
      'customerName',
      'customerPhone',
      'pickupAddress',
      'dropoffAddress',
      'pickupDateTime',
      'passengers',
      'estimatedPrice'
    ];
    
    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate email if provided
    if (data.customerEmail && !this.isValidEmail(data.customerEmail)) {
      console.error('Invalid email format');
      return false;
    }
    
    // Validate phone number
    if (!this.isValidPhoneNumber(data.customerPhone)) {
      console.error('Invalid phone number format');
      return false;
    }
    
    // Validate date
    if (isNaN(new Date(data.pickupDateTime).getTime())) {
      console.error('Invalid date format');
      return false;
    }
    
    // Validate passenger count
    const passengers = parseInt(data.passengers, 10);
    if (isNaN(passengers) || passengers < 1 || passengers > 8) {
      console.error('Invalid passenger count');
      return false;
    }
    
    return true;
  }

  /**
   * Generate a booking reference
   * @returns {string} - The generated reference
   */
  generateBookingReference() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude easily confused chars
    let result = 'FA';
    
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if reference is unique
    if (this.bookings.some(booking => booking.reference === result)) {
      return this.generateBookingReference(); // Try again if not unique
    }
    
    return result;
  }

  /**
   * Send booking to backend (simulated)
   * @param {Object} booking - The booking to send
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async sendBookingToBackend(booking) {
    // In a real app, this would make an API call to your backend
    console.log('Sending booking to backend:', booking);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success
    return true;
  }

  /**
   * Load bookings from local storage
   * @returns {Array} - The loaded bookings
   */
  loadBookings() {
    try {
      const saved = localStorage.getItem('taxiBookings');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading bookings from storage:', error);
      return [];
    }
  }

  /**
   * Save bookings to local storage
   */
  saveBookings() {
    try {
      localStorage.setItem('taxiBookings', JSON.stringify(this.bookings));
    } catch (error) {
      console.error('Error saving bookings to storage:', error);
    }
  }

  /**
   * Validate email format
   * @param {string} email - The email to validate
   * @returns {boolean} - Whether the email is valid
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  /**
   * Validate phone number format
   * @param {string} phone - The phone number to validate
   * @returns {boolean} - Whether the phone number is valid
   */
  isValidPhoneNumber(phone) {
    // Basic validation - allows numbers, spaces, +, -, and ()
    const re = /^[0-9\s+\-()]*$/;
    return re.test(phone) && phone.replace(/[^0-9]/g, '').length >= 8;
  }

  /**
   * Get booking status with translation
   * @param {string} status - The status code
   * @returns {Object} - The status with label and color
   */
  getStatusInfo(status) {
    const statuses = {
      pending: { label: 'In afwachting', color: '#FFA500' }, // Orange
      confirmed: { label: 'Bevestigd', color: '#2196F3' }, // Blue
      assigned: { label: 'Toegewezen', color: '#9C27B0' }, // Purple
      enroute: { label: 'Onderweg', color: '#673AB7' }, // Deep Purple
      arrived: { label: 'Aangekomen', color: '#3F51B5' }, // Indigo
      in_progress: { label: 'Rit bezig', color: '#00BCD4' }, // Cyan
      completed: { label: 'Voltooid', color: '#4CAF50' }, // Green
      cancelled: { label: 'Geannuleerd', color: '#F44336' }, // Red
      no_show: { label: 'Niet verschenen', color: '#795548' }, // Brown
      rejected: { label: 'Geweigerd', color: '#607D8B' } // Blue Grey
    };
    
    return statuses[status] || { label: 'Onbekend', color: '#9E9E9E' }; // Grey
  }

  /**
   * Format a date for display
   * @param {string|Date} date - The date to format
   * @param {boolean} includeTime - Whether to include time
   * @returns {string} - The formatted date
   */
  formatDate(date, includeTime = true) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Ongeldige datum';
    
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    if (!includeTime) {
      delete options.hour;
      delete options.minute;
      delete options.hour12;
    }
    
    return d.toLocaleString('nl-NL', options);
  }

  /**
   * Format a price with currency
   * @param {number} amount - The amount to format
   * @returns {string} - The formatted price
   */
  formatPrice(amount) {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Get booking statistics
   * @returns {Object} - The statistics
   */
  getStatistics() {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const recentBookings = this.bookings.filter(
      booking => new Date(booking.createdAt) >= oneMonthAgo
    );
    
    const statusCounts = recentBookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});
    
    const totalRevenue = recentBookings
      .filter(booking => booking.status === 'completed' && booking.finalPrice)
      .reduce((sum, booking) => sum + parseFloat(booking.finalPrice), 0);
    
    return {
      totalBookings: recentBookings.length,
      completedBookings: statusCounts.completed || 0,
      cancelledBookings: statusCounts.cancelled || 0,
      totalRevenue: this.formatPrice(totalRevenue),
      averageRating: this.calculateAverageRating(recentBookings)
    };
  }

  /**
   * Calculate average rating from bookings
   * @param {Array} bookings - The bookings to calculate from
   * @returns {number} - The average rating (0-5)
   */
  calculateAverageRating(bookings) {
    const ratedBookings = bookings.filter(b => b.rating);
    if (ratedBookings.length === 0) return 0;
    
    const total = ratedBookings.reduce((sum, booking) => sum + booking.rating, 0);
    return Math.round((total / ratedBookings.length) * 10) / 10; // 1 decimal place
  }
}

// Export a singleton instance
export const bookingService = new Booking();