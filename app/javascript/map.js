// Map configuration constants
const MAP_ZOOM_INITIAL = 16;
const MAP_ZOOM_MIN_AFTER_BOUNDS = 17;
const MAP_BOUNDING_ZOOM_MAX = 20;

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

  // Get the item's position relative to the scrollable container
  const sidebarRect = sidebar.getBoundingClientRect();
  const itemRect = sidebarItem.getBoundingClientRect();

  // Check if item is already fully visible in the sidebar
  const isFullyVisible = (
    itemRect.top >= sidebarRect.top &&
    itemRect.bottom <= sidebarRect.bottom
  );

  // Only scroll if the item is not fully visible
  if (isFullyVisible) return;

  // Calculate the item's position within the sidebar's scroll area
  const itemRelativeTop = itemRect.top - sidebarRect.top + sidebar.scrollTop;
  const sidebarHeight = sidebar.clientHeight;
  const itemHeight = sidebarItem.clientHeight;

  // Center the item
  const targetScrollTop = itemRelativeTop - (sidebarHeight / 2) + (itemHeight / 2);

  // Smooth scroll the sidebar
  sidebar.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth'
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
  // Check if map container exists (only initialize on map page)
  const coords = document.getElementById("sites");
  if (!coords) return;

  // Prevent multiple initializations
  if (window.mapInitialized) return;
  window.mapInitialized = true;

  try {
    // Request needed libraries.
    const { Map } = await google.maps.importLibrary("maps");
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
    if (!mapElement) {
      console.error("Map element not found");
      return;
    }

    const map = new Map(mapElement, {
      zoom: MAP_ZOOM_INITIAL,
      center: center,
      mapId: "MARQUETTE_HISTORIC_DISTRICT",
    });

    // Create bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();
    const sites = document.querySelectorAll("li.site-list-item");

    // Z-index counter starting at base map z-index + 100
    let baseZIndex = 100;

    sites.forEach((site, index) => {
      // Create custom house marker
      const markerContent = document.createElement('div');
      markerContent.className = 'custom-marker';
      const currentIconZIndex = baseZIndex + index;
      markerContent.style.zIndex = currentIconZIndex.toString();
      markerContent.style.position = 'relative';

      // Get the house colors based on the site index for two-tone effect
      const rootStyles = getComputedStyle(document.documentElement);
      const houseIconColor = index % 2 === 0
        ? rootStyles.getPropertyValue('--site-primary-b-dark').trim()
        : rootStyles.getPropertyValue('--site-primary-a-light').trim();
      const houseInteriorColor = rootStyles.getPropertyValue('--site-primary-a-light').trim();

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
          // Capture fullscreen state before any potential changes
          const wasInFullscreen = isInFullscreenMode();
          showSiteModal(siteId, wasInFullscreen);
        });

        marker.content.addEventListener("mouseenter", () => {
          markerContent.style.transform = 'scale(1.2)';
          markerContent.style.transition = 'transform 0.2s ease-in-out';

          // Highlight corresponding sidebar item and scroll it into view
          highlightSidebarItem(siteId);
        });

        marker.content.addEventListener("mouseleave", () => {
          markerContent.style.transform = 'scale(1)';

          // Remove highlight from sidebar item
          unhighlightSidebarItem(siteId);
        });
      }
    });

    // Fit the map to all markers with a minimum zoom
    if (sites.length > 0) {
      map.fitBounds(bounds);

      // Add a listener to ensure minimum zoom after bounds fit
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        const currentZoom = map.getZoom();
        if (currentZoom > MAP_BOUNDING_ZOOM_MAX) {
          map.setZoom(MAP_BOUNDING_ZOOM_MAX);
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

  // Highlight the sidebar item when opening modal
  highlightSidebarItem(siteId);

  // Show loading state
  modalContent.innerHTML = '<div class="loading">Loading site details...</div>';
  modal.style.display = 'block';

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

    // Remove highlight from any highlighted sidebar item
    document.querySelectorAll('li.site-list-item.highlighted').forEach(item => {
      item.classList.remove('highlighted');
    });
  }
}

// Make modal functions globally available
window.showSiteModal = showSiteModal;
window.closeSiteModal = closeSiteModal;

// Handle URL site parameter on page load
function handleSiteUrlParameter() {
  // Only run on the map page
  if (!document.getElementById('sites')) return;

  const urlParams = new URLSearchParams(window.location.search);
  const siteId = urlParams.get('site');

  if (siteId) {
    // Small delay to ensure sidebar is rendered
    setTimeout(() => {
      highlightSidebarItem(siteId);
      // Also open the modal for this site
      showSiteModal(siteId);
    }, 100);
  }
}

// Listen for Turbo page loads (handles both initial load and navigation)
document.addEventListener('turbo:load', handleSiteUrlParameter);

// Event listeners for modal
document.addEventListener('DOMContentLoaded', () => {
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

    // Use event delegation for close button (since it's loaded dynamically via fetch)
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

  // Prevent page scrolling when cursor is over map container
  const mapContainer = document.querySelector('.map-container');
  if (mapContainer) {
    // Block all scroll-related events on the map container to prevent page scrolling
    mapContainer.addEventListener('wheel', (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });

    mapContainer.addEventListener('touchmove', (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });

    mapContainer.addEventListener('scroll', (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });
  }
});

// Initialize the map
initMap().catch(console.error);
