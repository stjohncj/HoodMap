// Map initialization module
// This file handles Google Maps initialization and site modal functionality

console.log("map_init.js module loaded");

// Map configuration constants
const MAP_ZOOM_INITIAL = 17;
const MAP_ZOOM_MIN_AFTER_BOUNDS = 17; // Force closer zoom to reduce space around markers
const MAP_ZOOM_MAX_AFTER_BOUNDS = 20; // Allow closer zoom for better icon visibility

// Flag to track when a modal is being opened
let isOpeningModal = false;

// Highlight sidebar item and scroll it into centered view
function highlightSidebarItem(siteId) {
  const sidebarItem = document.querySelector(`li.site-list-item[data-id="${siteId}"]`);
  if (!sidebarItem) return;

  // Remove existing highlights
  document.querySelectorAll('li.site-list-item.highlighted').forEach(item => {
    item.classList.remove('highlighted');
  });

  // Add highlight to current item
  sidebarItem.classList.add('highlighted');

  // Scroll to center the item in the sidebar
  const sidebar = document.querySelector('.sites-sidebar ol');
  if (!sidebar) return;

  // Use scrollIntoView with block: 'center' for reliable centering
  sidebarItem.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  });
}

// Remove highlight from sidebar item
function unhighlightSidebarItem(siteId) {
  const sidebarItem = document.querySelector(`li.site-list-item[data-id="${siteId}"]`);
  if (sidebarItem) {
    sidebarItem.classList.remove('highlighted');
  }
}

// Make functions globally available immediately
window.highlightSidebarItem = highlightSidebarItem;
window.unhighlightSidebarItem = unhighlightSidebarItem;

async function initMap() {
  console.log("initMap called, DOM ready state:", document.readyState);

  // Wait for urlState to be available
  if (!window.urlState) {
    console.log("urlState not available yet, waiting...");
    await new Promise(resolve => {
      const checkUrlState = () => {
        if (window.urlState) {
          resolve();
        } else {
          setTimeout(checkUrlState, 10);
        }
      };
      checkUrlState();
    });
  }

  // Check if map container exists (only initialize on map page)
  const coords = document.getElementById("sites");
  console.log("Found #sites element:", coords);
  if (!coords) {
    console.log("No #sites element found, skipping map initialization");
    return;
  }

  // Check current initialization state
  console.log("Current mapInitialized value:", coords.dataset.mapInitialized);

  // Check if map is already initialized for this container
  if (coords.dataset.mapInitialized === 'true') {
    console.log("Map already initialized for this container, skipping");
    // Even if map is initialized, check for site parameter and open modal
    const siteIdFromUrl = window.urlState.get('site');
    console.log("Checking for site parameter:", siteIdFromUrl);
    if (siteIdFromUrl) {
      console.log('Map already initialized but site parameter found:', siteIdFromUrl);
      setTimeout(() => {
        showSiteModal(siteIdFromUrl);
      }, 100);
    }
    return;
  }

  console.log("Setting mapInitialized to true and proceeding with initialization");
  coords.dataset.mapInitialized = 'true';

  try {
    // Request needed libraries.
    const { Map: GoogleMap } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const latStr = coords.getAttribute("data-latitude");
    const lngStr = coords.getAttribute("data-longitude");

    if (!latStr || !lngStr) {
      console.error("Missing latitude or longitude data");
      return;
    }

    const center = {
      lat: parseFloat(latStr),
      lng: parseFloat(lngStr)
    };

    const mapElement = document.getElementById("map");
    console.log("Looking for #map element:", mapElement);
    console.log("All elements with id 'map':", document.querySelectorAll("#map"));
    console.log("All elements with class containing 'map':", document.querySelectorAll("[class*='map']"));

    if (!mapElement) {
      console.error("Map element not found - check if #map exists in DOM");
      console.log("Available elements:", document.querySelectorAll("*"));
      return;
    }

    const map = new GoogleMap(mapElement, {
      zoom: MAP_ZOOM_INITIAL,
      center: center,
      mapId: "MARQUETTE_HISTORIC_DISTRICT",
    });

    // Create bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();
    const sites = document.querySelectorAll("li.site-list-item");

    // Store marker references for hover effects
    const markerMap = new Map();

    // Z-index counter starting at base map z-index + 100
    let baseZIndex = 100;

    sites.forEach((site, index) => {
      // Create custom house marker
      const markerContent = document.createElement('div');
      markerContent.className = 'custom-marker';
      const currentIconZIndex = baseZIndex + index;
      markerContent.style.zIndex = currentIconZIndex.toString();
      markerContent.style.position = 'relative';

      // Get the house colors - consistent for all markers
      const rootStyles = getComputedStyle(document.documentElement);
      let houseIconColor = rootStyles.getPropertyValue('--site-primary-b-dark').trim();
      let houseInteriorColor = rootStyles.getPropertyValue('--site-primary-a-light').trim();

      // Validate colors to prevent XSS - ensure they're valid CSS colors
      const colorRegex = /^(#[0-9a-fA-F]{3,6}|rgb\([^)]*\)|rgba\([^)]*\)|[a-zA-Z]+)$/;
      if (!colorRegex.test(houseIconColor)) houseIconColor = '#4f317d';
      if (!colorRegex.test(houseInteriorColor)) houseInteriorColor = '#f9a825';

      markerContent.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="house-icon">
          <!-- House interior background -->
          <path d="M7,12H17V18H7V12Z" fill="${houseInteriorColor}"/>
          <!-- House outline and structure -->
          <path d="M12,5L19.5,12H17V18H13.5V13H10.5V18H7V12H5L12,5Z" fill="none" stroke="${houseIconColor}" stroke-width="1.5"/>
          <!-- Door -->
          <rect x="10.5" y="13.5" width="3" height="4.5" fill="${houseIconColor}"/>
        </svg>
      `;

      const siteLatStr = site.getAttribute("data-latitude");
      const siteLngStr = site.getAttribute("data-longitude");
      const siteId = site.getAttribute("data-id");
      const historicName = site.getAttribute("data-historic-name");

      if (!siteLatStr || !siteLngStr || !siteId || !historicName) {
        console.warn("Missing required data attributes for site", site);
        return;
      }

      const position = {
        lat: parseFloat(siteLatStr),
        lng: parseFloat(siteLngStr)
      };

      // Add this position to bounds
      bounds.extend(position);

      const marker = new AdvancedMarkerElement({
        title: historicName,
        position: position,
        map: map,
        gmpClickable: true,
        gmpDraggable: false,
        content: markerContent,
        zIndex: currentIconZIndex
      });

      // Add event listeners to the marker's element/content
      if (marker.content) {
        marker.content.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          // Set flag to prevent mouseleave from clearing sidebar highlighting
          isOpeningModal = true;

          const wasInFullscreen = isInFullscreenMode();
          showSiteModal(siteId, wasInFullscreen);

          // Reset flag after a short delay to allow modal to open
          setTimeout(() => {
            isOpeningModal = false;
          }, 100);
        });

        marker.content.addEventListener("mouseenter", () => {
          markerContent.style.transform = 'scale(1.2)';
          markerContent.style.transition = 'transform 0.2s ease-in-out';

          // Change colors on hover
          const svg = markerContent.querySelector('svg');
          const paths = svg.querySelectorAll('path');
          const rect = svg.querySelector('rect');
          const hoverColor = rootStyles.getPropertyValue('--site-primary-a').trim();

          paths.forEach((path, index) => {
            // Change stroke if it exists
            if (path.getAttribute('stroke')) {
              path.setAttribute('stroke', hoverColor);
            }
            // Change fill if it exists and is not "none"
            const fillValue = path.getAttribute('fill');
            if (fillValue && fillValue !== 'none') {
              path.setAttribute('fill', hoverColor);
            }
          });
          if (rect) {
            rect.setAttribute('fill', hoverColor);
          }

          // Highlight corresponding sidebar item and scroll it into view
          highlightSidebarItem(siteId);
        });

        marker.content.addEventListener("mouseleave", () => {
          markerContent.style.transform = 'scale(1)';

          // Reset colors on mouse leave
          const svg = markerContent.querySelector('svg');
          const paths = svg.querySelectorAll('path');
          const rect = svg.querySelector('rect');

          paths.forEach(path => {
            // Reset stroke if it exists
            if (path.getAttribute('stroke')) {
              path.setAttribute('stroke', houseIconColor);
            }
            // Reset fill if it exists and is not "none"
            const fillValue = path.getAttribute('fill');
            if (fillValue && fillValue !== 'none') {
              path.setAttribute('fill', houseInteriorColor);
            }
          });
          if (rect) {
            rect.setAttribute('fill', houseIconColor);
          }

          // Remove highlight from sidebar item (unless we're opening a modal)
          if (!isOpeningModal) {
            unhighlightSidebarItem(siteId);
          }
        });
      }

      // Store marker reference for sidebar hover effects
      markerMap.set(siteId, { marker, markerContent, houseIconColor });
    });

    // Add hover effects from sidebar to map markers
    // Reuse the same hover color as the marker hover effects

    sites.forEach((site) => {
      const siteId = site.getAttribute("data-id");
      if (!siteId || !markerMap.has(siteId)) return;

      const { markerContent, houseIconColor } = markerMap.get(siteId);

      // Add hover effects to sidebar items
      site.addEventListener("mouseenter", () => {
        try {
          console.log('Sidebar hover for site:', siteId);
          console.log('Marker content:', markerContent);

          // Highlight the corresponding marker
          markerContent.style.transform = 'scale(1.2)';
          markerContent.style.transition = 'transform 0.2s ease-in-out';

          // Change marker colors
          const svg = markerContent.querySelector('svg');
          if (svg) {
            const paths = svg.querySelectorAll('path');
            const rect = svg.querySelector('rect');
            const hoverColor = '#f59e0b'; // Direct amber color value

            paths.forEach((path) => {
              // Change stroke if it exists
              if (path.getAttribute('stroke') && path.getAttribute('stroke') !== 'none') {
                path.setAttribute('stroke', hoverColor);
              }
              // Change fill if it exists and is not "none"
              const fillValue = path.getAttribute('fill');
              if (fillValue && fillValue !== 'none') {
                path.setAttribute('fill', hoverColor);
              }
            });
            if (rect) {
              rect.setAttribute('fill', hoverColor);
            }
          }
        } catch (error) {
          console.error('Error in sidebar hover:', error);
        }
      });

      site.addEventListener("mouseleave", () => {
        // Reset marker appearance
        markerContent.style.transform = 'scale(1)';

        // Reset marker colors
        const svg = markerContent.querySelector('svg');
        if (svg) {
          const paths = svg.querySelectorAll('path');
          const rect = svg.querySelector('rect');
          const originalStrokeColor = '#1e293b'; // Direct dark color value
          const originalFillColor = '#fef3c7'; // Direct light color value

          paths.forEach(path => {
            // Reset stroke if it exists
            if (path.getAttribute('stroke') && path.getAttribute('stroke') !== 'none') {
              path.setAttribute('stroke', originalStrokeColor);
            }
            // Reset fill if it exists and is not "none"
            const fillValue = path.getAttribute('fill');
            if (fillValue && fillValue !== 'none') {
              path.setAttribute('fill', originalFillColor);
            }
          });
          if (rect) {
            rect.setAttribute('fill', originalStrokeColor);
          }
        }
      });
    });

    // Fit the map to all markers with padding for better visibility
    if (sites.length > 0) {
      // Minimal padding to allow closer zoom while keeping markers visible
      const padding = {
        top: 15,
        right: 15,
        bottom: 15,
        left: 15
      };

      map.fitBounds(bounds, padding);

      // Add a listener to ensure appropriate zoom level
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        const currentZoom = map.getZoom();
        // Ensure zoom is within reasonable bounds
        if (currentZoom > MAP_ZOOM_MAX_AFTER_BOUNDS) {
          map.setZoom(MAP_ZOOM_MAX_AFTER_BOUNDS);
        } else if (currentZoom < MAP_ZOOM_MIN_AFTER_BOUNDS) {
          map.setZoom(MAP_ZOOM_MIN_AFTER_BOUNDS);
        }
      });
    }

  } catch (error) {
    console.error("Error initializing map:", error);
  }
}

function isInFullscreenMode() {
  return document.fullscreenElement ||
         document.webkitFullscreenElement ||
         document.mozFullScreenElement ||
         document.msFullscreenElement;
}

function showSiteModal(siteId, wasInFullscreen = false) {
  const modal = document.getElementById('site-modal');
  const modalContent = document.getElementById('modal-site-content');

  if (!modal || !modalContent) {
    console.error('Modal elements not found');
    return;
  }

  // Update URL to reflect selected site
  window.urlState.set('site', siteId);

  // Show loading state
  modalContent.innerHTML = '<div class="loading">Loading site details...</div>';
  modal.style.display = 'block';

  // Highlight and scroll to the corresponding sidebar item
  highlightSidebarItem(siteId);

  // Fetch site content
  fetch(`/modal/houses/${siteId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(html => {
      modalContent.innerHTML = html;

      // Initialize any gallery components in the loaded content
      const galleries = modalContent.querySelectorAll('[data-controller="gallery"]');
      galleries.forEach(gallery => {
        // Dispatch a custom event to initialize the gallery
        const event = new CustomEvent('gallery:initialize', {
          detail: { element: gallery }
        });
        document.dispatchEvent(event);
      });
    })
    .catch(error => {
      console.error('Error loading site details:', error);
      modalContent.innerHTML = '<div class="error">Error loading site details. Please try again.</div>';
    });
}

function closeSiteModal() {
  const modal = document.getElementById('site-modal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Remove site from URL
  window.urlState.remove('site');

  // Clear all sidebar highlighting when modal closes
  document.querySelectorAll('.site-list-item.highlighted').forEach(item => {
    item.classList.remove('highlighted');
  });
}

// Make closeSiteModal globally available
window.closeSiteModal = closeSiteModal;

// Event listeners for modal and map initialization
function initializeMap() {
  console.log("initializeMap called");
  initMap().catch(console.error);
}


// Handle Turbo before-cache event to clean up before page is cached
document.addEventListener('turbo:before-cache', () => {
  console.log("turbo:before-cache fired - cleaning up map state");
  const coords = document.getElementById("sites");
  if (coords) {
    // Remove initialization flag so map can be re-initialized when returning to page
    delete coords.dataset.mapInitialized;
    console.log("Removed mapInitialized flag from #sites element");
  }
});

// Handle Turbo events for proper initialization
document.addEventListener('turbo:load', () => {
  console.log("turbo:load fired");
  console.log("Current URL:", window.location.href);
  console.log("URL search params:", window.location.search);

  // Check if we're on the map page
  const coords = document.getElementById("sites");
  const mapElement = document.getElementById("map");
  console.log("Page has #sites element:", !!coords);
  console.log("Page has #map element:", !!mapElement);
  if (coords) {
    console.log("#sites data-map-initialized:", coords.dataset.mapInitialized);
  }

  // Setup modal event handlers
  const modal = document.getElementById('site-modal');
  if (modal && !modal.dataset.eventListenersAdded) {
    // Mark that we've added event listeners to prevent duplicates
    modal.dataset.eventListenersAdded = 'true';

    // Shared handler for close button clicks (used by both click and touch events)
    const handleCloseButtonEvent = (e) => {
      // Check if clicked on .modal-close (static button) or .modal-close-button (dynamic button)
      const closeButton = e.target.closest('.modal-close') || e.target.closest('.modal-close-button');
      if (closeButton) {
        e.preventDefault();
        e.stopPropagation();
        closeSiteModal();
        return true;
      }
      return false;
    };

    // Use event delegation for close buttons (handles both static and dynamically loaded buttons)
    modal.addEventListener('click', (e) => {
      if (handleCloseButtonEvent(e)) return;

      // Check if clicked on backdrop
      if (e.target.classList.contains('modal-backdrop-map')) {
        closeSiteModal();
      }
    });

    // Add touch support for iOS (event delegation)
    modal.addEventListener('touchend', handleCloseButtonEvent);

    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.style.display === 'block') {
        closeSiteModal();
      }
    });
  }

  // Add click handlers to site list items
  const siteListItems = document.querySelectorAll('li.site-list-item');
  siteListItems.forEach(item => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      const siteId = item.getAttribute('data-id');
      if (siteId) {
        showSiteModal(siteId);
      }
    });
  });

  // Initialize the map
  initializeMap();

  // Check URL parameters and restore state
  const siteIdFromUrl = window.urlState.get('site');
  console.log('Site ID from URL:', siteIdFromUrl);
  console.log('Full URL:', window.location.href);
  if (siteIdFromUrl) {
    // Wait a bit for map to initialize before opening modal
    setTimeout(() => {
      console.log('Opening modal for site:', siteIdFromUrl);
      showSiteModal(siteIdFromUrl);
    }, 500);
  }
});

// Fallback for non-Turbo environments
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded fired");
  // Only initialize if container hasn't been initialized yet
  setTimeout(() => {
    const coords = document.getElementById("sites");
    if (coords && coords.dataset.mapInitialized !== 'true') {
      console.log("DOMContentLoaded fallback - initializing map");
      initializeMap();
    }
  }, 100);
});

// Handle browser back/forward navigation
window.addEventListener('urlStateChanged', (event) => {
  const siteId = window.urlState.get('site');
  const modal = document.getElementById('site-modal');

  if (siteId) {
    // URL has a site parameter - open the modal
    showSiteModal(siteId);
  } else if (modal && modal.style.display === 'block') {
    // No site parameter but modal is open - close it
    modal.style.display = 'none';
    document.querySelectorAll('.site-list-item.highlighted').forEach(item => {
      item.classList.remove('highlighted');
    });
  }
});
