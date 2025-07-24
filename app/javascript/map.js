async function initMap() {
  // Request needed libraries.
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const { PinElement } = await google.maps.importLibrary("marker");

  const coords = document.getElementById("sites");
  const center = {
    lat: parseFloat(coords.getAttribute("data-latitude")),
    lng: parseFloat(coords.getAttribute("data-longitude"))
  };

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: center,
    mapId: "MARQUETTE_HISTORIC_DISTRICT",
  });


  const sites = document.querySelectorAll("li.site-list-item");
  sites.forEach(site => {
    // console.log("site is ", site);
    // Hide the glyph.
    const pinNoGlyph = new google.maps.marker.PinElement({
      glyph: "",
    });
    const marker = new google.maps.marker.AdvancedMarkerElement({
      title: site.getAttribute("data-historic-name"),
      position: {
        lat: parseFloat(site.getAttribute("data-latitude")),
        lng: parseFloat(site.getAttribute("data-longitude"))
      },
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
  });

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

initMap();
