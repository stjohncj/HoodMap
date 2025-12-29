class MainController < ApplicationController
  # Header images for the map page - specific sites representing architectural styles
  HEADER_SITE_ADDRESSES = [
    "815 Milwaukee Street",   # Duvall House, Italianate, Built: 1881
    "1020 Milwaukee Street",  # William J. Kowalke House, Tudor Revival, Built: 1926
    "1017 Milwaukee Street",  # George and Maude Duvall House, Queen Anne, Built: 1895
    "903 Dodge Street",       # John and Augusta Dishmaker House, Queen Anne, Built: 1900
    "1102 Dodge Street",      # Louis and Amelia Bruemmer House, Second Empire, Built: 1885
    "805 Dodge Street"        # John and Marie Borgman House, Colonial Revival, Built: 1909
  ].freeze

  def index
    @sites = Site.sorted_by_street_and_number

    # Get header images from specific sites
    @header_images = HEADER_SITE_ADDRESSES.map do |address|
      SiteImageCache.find_by_address(address)
    end.compact

    # Calculate center from actual site bounds with padding
    if @sites.any?
      lats = @sites.map(&:latitude).compact
      lngs = @sites.map(&:longitude).compact

      # Add padding around the bounds (roughly 50 meters in each direction)
      lat_padding = 0.0005
      lng_padding = 0.0007

      min_lat = lats.min - lat_padding
      max_lat = lats.max + lat_padding
      min_lng = lngs.min - lng_padding
      max_lng = lngs.max + lng_padding

      @mhd_center_lat = (min_lat + max_lat) / 2.0
      @mhd_center_lng = (min_lng + max_lng) / 2.0
    else
      # Fallback center
      @mhd_center_lat = 44.452829
      @mhd_center_lng = -87.503556
    end
  end
end
