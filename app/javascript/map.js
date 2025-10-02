// Map configuration constants
const MAP_ZOOM_INITIAL = 16;
const MAP_ZOOM_MIN_AFTER_BOUNDS = 17;
const MAP_BOUNDING_ZOOM_MAX = 20;

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
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log(`Setting house icon ${index} z-index to:`, currentIconZIndex);
      }

      // Get the house colors based on the site index for two-tone effect
      const rootStyles = getComputedStyle(document.documentElement);
      const houseIconColor = index % 2 === 0
        ? rootStyles.getPropertyValue('--site-primary-b-dark').trim()
        : rootStyles.getPropertyValue('--site-primary-a-light').trim();
      const houseInteriorColor = rootStyles.getPropertyValue('--site-primary-a-light').trim();

      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log('House icon colors for index', index, ':', {
          houseIconColor,
          houseInteriorColor
        });
      }

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
          if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
            console.log('Mouse over marker for site:', siteId, 'Position:', position, 'Map bounds:', map?.getBounds());
          }
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
  }
}

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

  const sidebarRect = sidebar.getBoundingClientRect();
  const itemRect = sidebarItem.getBoundingClientRect();

  // Calculate scroll position to center the item
  // scrollTop = (item's position relative to container) - (half of container height) + (half of item height)
  const itemOffsetTop = sidebarItem.offsetTop;
  const itemHeight = itemRect.height;
  const sidebarHeight = sidebarRect.height;

  const targetScrollTop = itemOffsetTop - (sidebarHeight / 2) + (itemHeight / 2);

  // Smooth scroll to the target position
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

// Make closeSiteModal globally available
window.closeSiteModal = closeSiteModal;

// Event listeners for modal
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('site-modal');
  if (modal) {
    // Close modal when clicking the close button
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', closeSiteModal);
    }

    // Close modal when clicking the backdrop
    const backdrop = modal.querySelector('.modal-backdrop-map');
    if (backdrop) {
      backdrop.addEventListener('click', closeSiteModal);
    }

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
});

// Initialize the map
initMap().catch(console.error);