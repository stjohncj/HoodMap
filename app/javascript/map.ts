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

// Make this a module
export {};

async function initMap(): Promise<void> {
  // Check if map container exists (only initialize on map page)
  const coords = document.getElementById("sites");
  if (!coords) return;

  // Prevent multiple initializations
  if (window.mapInitialized) return;
  window.mapInitialized = true;

  try {
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
  
  // Get the CSS custom property values for house icon colors
  const rootStyles = getComputedStyle(document.documentElement);
  const houseIconColor = rootStyles.getPropertyValue('--site-primary-b-dark').trim();
  const houseInteriorColor = rootStyles.getPropertyValue('--site-primary-a-light').trim();
  
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.log('House icon colors:', {
      houseIconColor,
      houseInteriorColor,
      rawDark: rootStyles.getPropertyValue('--site-primary-b-dark'),
      rawLight: rootStyles.getPropertyValue('--site-primary-a-light')
    });
  }

  sites.forEach((site: HTMLElement, index: number) => {
    // Create custom house marker
    const markerContent = document.createElement('div');
    markerContent.className = 'custom-marker';
    const currentIconZIndex = baseZIndex + index;
    markerContent.style.zIndex = currentIconZIndex.toString();
    markerContent.style.position = 'relative'; // Ensure position is set for z-index to work
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log(`Setting house icon ${index} z-index to:`, currentIconZIndex);
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
        
        const bubbleZIndex = currentIconZIndex + 1000; // Overlay bubble gets much higher z-index
        const newContent = buildContent(site, bubbleZIndex, position, map);
        
        // Use mouseleave on the new content container
        newContent.addEventListener("mouseleave", () => {
          marker.content = markerContent;
        });
        
        newContent.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          // Capture fullscreen state before any potential changes
          const wasInFullscreen = isInFullscreenMode();
          showSiteModal(siteId, wasInFullscreen);
        });
        
        marker.content = newContent;
        
        // Scroll to corresponding site in sidebar
        scrollToSiteInSidebar(siteId);
      });
    }

    // Make sidebar list items clickable
    site.addEventListener("click", () => {
      // Sidebar clicks should not preserve fullscreen (normal behavior)
      showSiteModal(siteId, false);
    });
  });

  // Fit the map to show all markers with some padding
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, 10); // Even less padding for closer zoom

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
  } catch (error: any) {
    console.error("Google Maps initialization error:", error);
    
    // Show error message to user
    const mapElement = document.getElementById("map");
    if (mapElement) {
      mapElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f3f4f6; border-radius: 1rem;">
          <div style="text-align: center; padding: 2rem;">
            <h3 style="color: #dc2626; margin-bottom: 1rem;">Map Loading Error</h3>
            <p style="color: #6b7280; margin-bottom: 1rem;">
              ${error.message || 'Unable to load Google Maps'}
            </p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 1rem; margin-top: 1rem;">
              <p style="color: #991b1b; font-size: 0.9rem; margin: 0;">
                <strong>Common causes:</strong><br>
                • Google Maps API key not configured<br>
                • Billing not enabled on Google Cloud project<br>
                • Maps JavaScript API not enabled<br>
                • API key restrictions blocking access
              </p>
            </div>
            <p style="color: #6b7280; font-size: 0.85rem; margin-top: 1rem;">
              Check your <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px;">GOOGLE_MAPS_API_KEY</code> environment variable
            </p>
          </div>
        </div>
      `;
    }
    
    // Still make sidebar items clickable even without map
    const sites = document.querySelectorAll<HTMLElement>("li.site-list-item");
    sites.forEach((site: HTMLElement) => {
      const siteId = site.getAttribute("data-id");
      if (siteId) {
        site.addEventListener("click", () => {
          showSiteModal(siteId, false);
        });
        site.style.cursor = "pointer";
      }
    });
  }
}

function buildContent(site: HTMLElement, zIndex?: number, position?: google.maps.LatLngLiteral, map?: google.maps.Map): HTMLElement {
  // Create container that will hold both the icon and the bubble
  const container = document.createElement("div");
  container.style.position = 'relative';
  container.style.width = '40px';
  container.style.height = '40px';
  
  // Get the house colors based on the site index
  const index = parseInt(site.getAttribute("data-index") || "0");
  const rootStyles = getComputedStyle(document.documentElement);
  const houseIconColor = index % 2 === 0 
    ? rootStyles.getPropertyValue('--site-primary-b-dark').trim()
    : rootStyles.getPropertyValue('--site-primary-a-light').trim();
  const houseInteriorColor = index % 2 === 0 
    ? rootStyles.getPropertyValue('--site-primary-a').trim()
    : rootStyles.getPropertyValue('--site-primary-b-light').trim();
  
  // Re-create the house icon
  const houseIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <!-- House interior background -->
      <path d="M7,12H17V18H7V12Z" fill="${houseInteriorColor}"/>
      <!-- House outline and structure -->
      <path d="M12,5L19.5,12H17V18H13.5V13H10.5V18H7V12H5L12,5Z" fill="none" stroke="${houseIconColor}" stroke-width="1.5"/>
      <!-- Door -->
      <rect x="10.5" y="13.5" width="3" height="4.5" fill="${houseIconColor}"/>
    </svg>
  `;
  
  container.innerHTML = `
    <div class="custom-marker" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div class="house-icon">${houseIcon}</div>
    </div>
  `;
  
  // Create the text bubble
  const bubble = document.createElement("div");
  bubble.classList.add("marker-tag");
  bubble.style.position = 'absolute';
  
  // Set z-index if provided
  if (zIndex !== undefined) {
    bubble.style.zIndex = zIndex.toString();
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log(`Setting bubble z-index to:`, zIndex);
    }
  }
  
  // Position bubble to avoid overlapping the house icon
  if (position && map) {
    const mapBounds = map.getBounds();
    if (mapBounds) {
      const mapCenter = mapBounds.getCenter();
      const isOnLeftSide = position.lng < mapCenter.lng();
      
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log('Positioning bubble:', {
          position: position,
          mapCenter: { lat: mapCenter.lat(), lng: mapCenter.lng() },
          isOnLeftSide: isOnLeftSide
        });
      }
      
      if (isOnLeftSide) {
        // Position bubble to the right of the icon
        bubble.style.left = '100%';
        bubble.style.marginLeft = '10px';
        bubble.style.top = '50%';
        bubble.style.transform = 'translateY(-50%)';
        bubble.classList.add('bubble-right');
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
          console.log('Applied bubble-right positioning');
        }
      } else {
        // Position bubble to the left of the icon
        bubble.style.right = '100%';
        bubble.style.marginRight = '10px';
        bubble.style.top = '50%';
        bubble.style.transform = 'translateY(-50%)';
        bubble.classList.add('bubble-left');
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
          console.log('Applied bubble-left positioning');
        }
      }
    } else {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log('No map bounds available for positioning');
      }
    }
  } else {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('Position or map not provided for bubble positioning');
    }
  }
  
  const historicName = site.getAttribute("data-historic-name") || "Unknown";
  const builtYear = site.getAttribute("data-built-year") || "";
  
  bubble.innerHTML = historicName + "<br />" + builtYear;
  
  // Add the bubble to the container
  container.appendChild(bubble);
  
  return container;
}

// Function to scroll to corresponding site in sidebar
function scrollToSiteInSidebar(siteId: string): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.log('Trying to scroll to site ID:', siteId);
  }
  
  const sidebarSite = document.querySelector(`li.site-list-item[data-id="${siteId}"]`);
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.log('Found sidebar site element:', sidebarSite);
  }
  
  if (sidebarSite && sidebarSite.parentElement) {
    const scrollContainer = sidebarSite.parentElement; // The <ol> element
    const containerRect = scrollContainer.getBoundingClientRect();
    const siteRect = sidebarSite.getBoundingClientRect();
    
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('Scroll container:', scrollContainer);
      console.log('Container rect:', containerRect);
      console.log('Site rect:', siteRect);
    }
    
    // Calculate the scroll position to center the site in the container
    const scrollTop = scrollContainer.scrollTop + (siteRect.top - containerRect.top) - (containerRect.height / 2) + (siteRect.height / 2);
    
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('Calculated scroll top:', scrollTop);
    }
    
    scrollContainer.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
    
    // Add temporary highlight effect
    sidebarSite.classList.add('highlighted');
    setTimeout(() => {
      sidebarSite.classList.remove('highlighted');
    }, 2000);
  } else {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('Could not find sidebar site or parent element');
      console.log('Available sidebar sites:', document.querySelectorAll('li.site-list-item'));
    }
  }
}

// Modal functionality
async function showSiteModal(siteId: string, preserveFullscreen: boolean = false): Promise<void> {
  const modal = document.getElementById('site-modal');
  const modalContent = document.getElementById('modal-site-content');

  if (!modal || !modalContent) {
    console.error('Modal elements not found');
    return;
  }

  // Show loading state first
  modalContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  
  if (preserveFullscreen) {
    // If we're already in fullscreen, just show the modal in fullscreen style
    // without changing which element is fullscreen
    modal.classList.add('fullscreen-modal');
    modal.style.display = 'flex';
    // Set a high z-index to ensure modal appears above the map
    modal.style.zIndex = '10000';
  } else {
    // Normal modal behavior - exit fullscreen first
    await exitFullscreenIfActive();
    modal.classList.remove('fullscreen-modal');
    modal.style.display = 'flex';
  }

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

// Function to check if currently in fullscreen mode
function isInFullscreenMode(): boolean {
  return !!(document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement);
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

async function closeSiteModal(): Promise<void> {
  const modal = document.getElementById('site-modal');
  
  if (modal) {
    // Simply close the modal
    modal.style.display = 'none';
    modal.classList.remove('fullscreen-modal');
    modal.style.zIndex = '';
    
    // The fullscreen state remains unchanged - if the sites container
    // was in fullscreen, it stays in fullscreen showing the map
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

// Handle fullscreen change events to keep modal state in sync
function handleFullscreenChange(): void {
  const modal = document.getElementById('site-modal');
  
  // If we exit fullscreen while modal is visible (e.g., via minimize button or ESC)
  if (!isInFullscreenMode() && modal && modal.style.display === 'flex' && modal.classList.contains('fullscreen-modal')) {
    // Clean up modal fullscreen state but don't close the modal
    modal.classList.remove('fullscreen-modal');
    modal.style.zIndex = '';
  }
}

// Add fullscreen change listeners
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

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
