module MapsHelper
  def google_static_map_url(center_lat:, center_lng:, sites: [], zoom: 15, size: "800x600")
    base_url = "https://maps.googleapis.com/maps/api/staticmap"

    # Use the calculated center directly since we now add padding in the controller
    params = {
      center: "#{center_lat},#{center_lng}",
      zoom: zoom,
      size: size,
      maptype: "roadmap",
      scale: 2, # Higher quality
      key: ENV['GOOGLE_MAPS_API_KEY']
    }

    # Add markers for all sites with consistent colors
    markers = sites.map.with_index do |site, index|
      label = index < 9 ? (index + 1).to_s : ((index + 1) % 10).to_s
      "color:red%7Clabel:#{label}%7C#{site.latitude},#{site.longitude}"
    end

    # Build the URL with markers
    query_string = params.map { |k, v| "#{k}=#{v}" }.join("&")
    marker_string = markers.map { |m| "markers=#{m}" }.join("&")

    "#{base_url}?#{query_string}&#{marker_string}"
  end

  def google_static_map_for_site(site, zoom: 17, size: "600x400")
    base_url = "https://maps.googleapis.com/maps/api/staticmap"

    params = {
      center: "#{site.latitude},#{site.longitude}",
      zoom: zoom,
      size: size,
      maptype: "roadmap",
      markers: "color:red%7C#{site.latitude},#{site.longitude}",
      key: ENV['GOOGLE_MAPS_API_KEY']
    }

    query_string = params.map { |k, v| "#{k}=#{v}" }.join("&")
    "#{base_url}?#{query_string}"
  end
end
