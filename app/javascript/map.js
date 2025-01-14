async function initMap() {
  const coords = document.getElementById("sites");
  const city = {
    lat: parseFloat(coords.getAttribute("data-latitude")),
    lng: parseFloat(coords.getAttribute("data-longitude"))
  };

  // Request needed libraries.
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const myLatlng = { lat: -25.363, lng: 131.044 };
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: city,
    mapId: "MARQUETTE_HISTORIC_DISTRICT",
  });

  const sites = document.querySelectorAll("li.site-list-item");
  sites.forEach(site => {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      title: site.getAttribute("data-name"),
      position: {
        lat: parseFloat(site.getAttribute("data-latitude")),
        lng: parseFloat(site.getAttribute("data-longitude"))
      },
      map: map
    });
    marker.addListener("click", () => {
      // map.setCenter(marker.position);
      window.location.href = "/houses/" + site.getAttribute("data-id");
    });
  });
}

initMap();
