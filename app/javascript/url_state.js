// URLStateManager - Centralized utility for managing application state in URL parameters
// Allows deep linking, bookmarking, and proper browser back/forward behavior

class URLStateManager {
  constructor() {
    this.refreshParams();
    this.setupPopStateListener();
  }

  // Refresh params from current URL
  refreshParams() {
    this.params = new URLSearchParams(window.location.search);
  }

  // Get a parameter value from the URL
  get(key) {
    // Always read from current URL to avoid stale data
    this.refreshParams();
    return this.params.get(key);
  }

  // Set a parameter and update the URL (without page reload)
  set(key, value) {
    if (value === null || value === undefined || value === '') {
      this.params.delete(key);
    } else {
      this.params.set(key, value);
    }
    this.updateURL();
  }

  // Set multiple parameters at once
  setMultiple(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        this.params.delete(key);
      } else {
        this.params.set(key, value);
      }
    });
    this.updateURL();
  }

  // Remove a parameter
  remove(key) {
    this.params.delete(key);
    this.updateURL();
  }

  // Remove multiple parameters at once
  removeMultiple(keys) {
    keys.forEach(key => this.params.delete(key));
    this.updateURL();
  }

  // Clear all parameters
  clear() {
    this.params = new URLSearchParams();
    this.updateURL();
  }

  // Update the browser URL with current parameters
  updateURL() {
    const newURL = this.params.toString()
      ? `${window.location.pathname}?${this.params.toString()}`
      : window.location.pathname;

    window.history.pushState({ path: newURL }, '', newURL);
  }

  // Listen for browser back/forward button
  setupPopStateListener() {
    window.addEventListener('popstate', (event) => {
      // Reload params from current URL
      this.params = new URLSearchParams(window.location.search);

      // Trigger custom event that other code can listen to
      window.dispatchEvent(new CustomEvent('urlStateChanged', {
        detail: { params: this.params }
      }));
    });
  }

  // Get all parameters as an object
  getAllParams() {
    const obj = {};
    for (const [key, value] of this.params.entries()) {
      obj[key] = value;
    }
    return obj;
  }
}

export default URLStateManager;
