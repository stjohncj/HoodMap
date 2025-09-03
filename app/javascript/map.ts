// Map configuration constants
const MAP_ZOOM_INITIAL: number = 16; // Initial zoom level when map loads
// Minimum zoom level after fitting bounds to ensure detail
// This is set higher to avoid zooming out too far when fitting bounds
// and to ensure markers are still visible
// Adjusted to 17 to ensure markers are clearly visible after bounds fit
// This prevents the map from zooming out too much when fitting bounds
// and ensures markers are still clearly visible
const MAP_ZOOM_MIN_AFTER_BOUNDS: number = 17;
// Maximum zoom level for bounding to prevent excessive zooming in
// This is set to 20 to allow for detailed views of markers
// but prevents the map from zooming in too far when fitting bounds
// This ensures that the map does not zoom in too much when fitting bounds
// and that markers remain visible at a reasonable level of detail
const MAP_BOUNDING_ZOOM_MAX: number = 20;

// Extend window object for global variables
declare global {
  interface Window {
    mapInitialized: boolean;
    closeSiteModal: () => void;
  }
}

async function initMap(): Promise<void> {
  // Check if map container exists (only initialize on map page)
  const coords = document.getElementById("sites");
  if (!coords) return;

  // Prevent multiple initializations
  if (window.mapInitialized) return;
  window.mapInitialized = true;

  // Request needed libraries.
  const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
  
  const latStr = coords.getAttribute("data-latitude");
  const lngStr = coords.getAttribute("data-longitude");
  
  if (!latStr || !lngStr) {
    console.error("Missing latitude or longitude data");
    return;
  }
  
  const center: google.maps.LatLngLiteral = {
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
  const sites = document.querySelectorAll<HTMLElement>("li.site-list-item");
  
  // Z-index counter starting at base map z-index + 100
  let baseZIndex = 100;
  
  sites.forEach((site: HTMLElement, index: number) => {
    // Create custom house marker
    const markerContent = document.createElement('div');
    markerContent.className = 'custom-marker';
    const currentIconZIndex = baseZIndex + index;
    markerContent.style.zIndex = currentIconZIndex.toString();
    markerContent.style.position = 'relative'; // Ensure position is set for z-index to work
    if (process.env.NODE_ENV === 'development') {
      console.log(`Setting house icon ${index} z-index to:`, currentIconZIndex);
    }
    markerContent.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="house-icon">
        <path d="M19.07,4.93C17.22,3 14.66,1.96 12,2C9.34,1.96 6.79,3 4.94,4.93C3,6.78 1.96,9.34 2,12C1.96,14.66 3,17.21 4.93,19.06C6.78,21 9.34,22.04 12,22C14.66,22.04 17.21,21 19.06,19.07C21,17.22 22.04,14.66 22,12C22.04,9.34 21,6.78 19.07,4.93M17,12V18H13.5V13H10.5V18H7V12H5L12,5L19.5,12H17Z" fill="#2563eb"/>
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

    const position: google.maps.LatLngLiteral = {
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
      marker.content.addEventListener("click", () => {
        showSiteModal(siteId);
      });

      marker.content.addEventListener("mouseover", () => {
        const bubbleZIndex = currentIconZIndex + 1000; // Overlay bubble gets much higher z-index
        const newContent = buildContent(site, bubbleZIndex);
        newContent.addEventListener("mouseout", () => {
          marker.content = markerContent;
        });
        marker.content = newContent;
      });
    }

    // Make sidebar list items clickable
    site.addEventListener("click", () => {
      showSiteModal(siteId);
    });
  });

  // Fit the map to show all markers with some padding
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: 10 // Even less padding for closer zoom
    });

    // Set zoom bounds after fitBounds to ensure good detail level
    google.maps.event.addListenerOnce(map, 'bounds_changed', function () {
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom < MAP_ZOOM_MIN_AFTER_BOUNDS) {
        map.setZoom(MAP_ZOOM_MIN_AFTER_BOUNDS);
      } else if (currentZoom && currentZoom > MAP_BOUNDING_ZOOM_MAX) {
        map.setZoom(MAP_BOUNDING_ZOOM_MAX);
      }
    });
  }
}

function buildContent(site: HTMLElement, zIndex?: number): HTMLElement {
  const content = document.createElement("div");
  content.classList.add("marker-tag");
  content.style.position = 'relative'; // Ensure position is set for z-index to work
  
  // Set z-index if provided, otherwise use CSS default
  if (zIndex !== undefined) {
    content.style.zIndex = zIndex.toString();
    if (process.env.NODE_ENV === 'development') {
      console.log(`Setting bubble z-index to:`, zIndex);
    }
  }
  
  const historicName = site.getAttribute("data-historic-name") || "Unknown";
  const builtYear = site.getAttribute("data-built-year") || "";
  
  content.innerHTML = historicName + "<br />" + builtYear;
  content.addEventListener("click", () => displayClickedProperty(site));
  return content;
}

function displayClickedProperty(site: HTMLElement): void {
  console.log('display clicked property');
  const siteId = site.getAttribute("data-id");
  if (siteId) {
    showSiteModal(siteId);
  }
}

// Modal functionality
async function showSiteModal(siteId: string): Promise<void> {
  // Exit fullscreen mode if currently active
  await exitFullscreenIfActive();

  const modal = document.getElementById('site-modal');
  const modalContent = document.getElementById('modal-site-content');

  if (!modal || !modalContent) {
    console.error('Modal elements not found');
    return;
  }

  // Show loading state
  modalContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  modal.style.display = 'flex';
  // Don't prevent body scrolling since modal only covers map area

  try {
    // Fetch site content
    const response = await fetch(`/modal/houses/${siteId}`);
    const html = await response.text();
    modalContent.innerHTML = html;
  } catch (error) {
    console.error('Error loading site details:', error);
    modalContent.innerHTML = '<div class="error-message">Error loading site details. Please try again.</div>';
  }
}

// Function to exit fullscreen mode if currently active
async function exitFullscreenIfActive(): Promise<void> {
  if (document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement) {

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }

      // Add a small delay to ensure fullscreen exit completes
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log('Could not exit fullscreen:', error);
    }
  }
}

function closeSiteModal(): void {
  const modal = document.getElementById('site-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  // Don't prevent body scrolling since modal only covers map area
}

// Make closeSiteModal available globally
window.closeSiteModal = closeSiteModal;

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSiteModal();
  }
});

// Add event listeners for modal close elements
document.addEventListener('DOMContentLoaded', () => {
  // Close button event listener
  const closeButton = document.querySelector('.modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeSiteModal);
  }

  // Backdrop click event listener
  const backdrop = document.querySelector('.modal-backdrop-map');
  if (backdrop) {
    backdrop.addEventListener('click', closeSiteModal);
  }
});

// Also add listeners on turbo:load for Turbo navigation
document.addEventListener('turbo:load', () => {
  // Close button event listener
  const closeButton = document.querySelector('.modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeSiteModal);
  }

  // Backdrop click event listener
  const backdrop = document.querySelector('.modal-backdrop-map');
  if (backdrop) {
    backdrop.addEventListener('click', closeSiteModal);
  }
});

// Reset initialization flag when navigating away
document.addEventListener('turbo:before-visit', () => {
  window.mapInitialized = false;
});

// Initialize map on page load and Turbo visits
document.addEventListener('DOMContentLoaded', initMap);
document.addEventListener('turbo:load', initMap);

// Fallback for immediate execution if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMap);
} else {
  initMap();
}
