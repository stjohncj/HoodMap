module MapsHelper
  def google_static_map_url(center_lat:, center_lng:, sites: [], zoom: 15, size: "800x600", request: nil)
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

    # Build the base URL
    query_string = params.map { |k, v| "#{k}=#{v}" }.join("&")
    url = "#{base_url}?#{query_string}"

    # Use custom house markers hosted on GitHub
    sites.each_with_index do |site, index|
      # Alternate colors for visual variety
      color = index.even? ? "blue" : "gold"
      number = (index + 1).to_s

      # Use GitHub raw URLs for the marker icons (PNG format required by Google)
      # These are publicly accessible from the repository
      icon_url = "https://raw.githubusercontent.com/stjohncj/HoodMap/google-maps-static/public/markers/house_#{color}_#{number}.png"
      encoded_icon = CGI.escape(icon_url)

      # Add marker with custom icon
      # Using scale:2 to ensure icon is visible
      url += "&markers=scale:2%7Canchor:center%7Cicon:#{encoded_icon}%7C#{site.latitude},#{site.longitude}"
    end

    url
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
