async function initMap() {
  // Check if map container exists (only initialize on map page)
  const coords = document.getElementById("sites");
  if (!coords) return;
  
  // Prevent multiple initializations
  if (window.mapInitialized) return;
  window.mapInitialized = true;

  // Request needed libraries.
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const { PinElement } = await google.maps.importLibrary("marker");
  const center = {
    lat: parseFloat(coords.getAttribute("data-latitude")),
    lng: parseFloat(coords.getAttribute("data-longitude"))
  };

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: center,
    mapId: "MARQUETTE_HISTORIC_DISTRICT",
  });

  // Create bounds to fit all markers
  const bounds = new google.maps.LatLngBounds();
  const sites = document.querySelectorAll("li.site-list-item");
  sites.forEach(site => {
    // console.log("site is ", site);
    // Create custom house marker
    const markerContent = document.createElement('div');
    markerContent.className = 'custom-marker';
    markerContent.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="house-icon">
        <path d="M19.07,4.93C17.22,3 14.66,1.96 12,2C9.34,1.96 6.79,3 4.94,4.93C3,6.78 1.96,9.34 2,12C1.96,14.66 3,17.21 4.93,19.06C6.78,21 9.34,22.04 12,22C14.66,22.04 17.21,21 19.06,19.07C21,17.22 22.04,14.66 22,12C22.04,9.34 21,6.78 19.07,4.93M17,12V18H13.5V13H10.5V18H7V12H5L12,5L19.5,12H17Z" fill="#2563eb"/>
      </svg>
    `;

    const position = {
      lat: parseFloat(site.getAttribute("data-latitude")),
      lng: parseFloat(site.getAttribute("data-longitude"))
    };

    // Add this position to bounds
    bounds.extend(position);

    const marker = new google.maps.marker.AdvancedMarkerElement({
      title: site.getAttribute("data-historic-name"),
      position: position,
      map: map,
      gmpClickable: true,
      gmpDraggable: false,
      content: markerContent
    });

    // Add event listeners to the marker's element/content
    marker.content.addEventListener("click", () => {
      window.location.href = "/houses/" + site.getAttribute("data-id");
    });

    marker.content.addEventListener("mouseover", () => {
      const newContent = buildContent(site);
      newContent.addEventListener("mouseout", () => {
        marker.content = markerContent;
      });
      marker.content = newContent;
    });
    
    // Make sidebar list items clickable
    site.addEventListener("click", () => {
      window.location.href = "/houses/" + site.getAttribute("data-id");
    });
  });

  // Fit the map to show all markers with some padding
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: 50 // Add 50px padding around the bounds
    });

    // Set a maximum zoom level to prevent zooming in too much for a single marker
    google.maps.event.addListenerOnce(map, 'bounds_changed', function () {
      if (map.getZoom() > 20) {
        map.setZoom(20);
      }
    });
  }

}

function toggleHighlight(markerView, site) {
  if (markerView.content.classList.contains("highlight")) {
    markerView.content.classList.remove("highlight");
    markerView.zIndex = null;
  } else {
    markerView.content.classList.add("highlight");
    markerView.zIndex = 1;
  }
}

function buildContent(site) {
  const content = document.createElement("div");
  content.classList.add("marker-tag");
  content.innerHTML = site.getAttribute("data-historic-name") + "<br />" + site.getAttribute("data-built-year");
  content.addEventListener("click", () => displayClickedProperty(site));
  return content;
}

function displayClickedProperty(site) {
  console.log('display clicked property');
  window.location.href = "/houses/" + site.getAttribute("data-id");
}

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
