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
    // Hide the glyph.
    const pinNoGlyph = new google.maps.marker.PinElement({
      glyph: "",
    });

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
      content: pinNoGlyph.element
    });

    // Add event listeners to the marker's element/content
    marker.content.addEventListener("click", () => {
      window.location.href = "/houses/" + site.getAttribute("data-id");
    });

    marker.content.addEventListener("mouseover", () => {
      const newContent = buildContent(site);
      newContent.addEventListener("mouseout", () => {
        marker.content = pinNoGlyph.element;
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
