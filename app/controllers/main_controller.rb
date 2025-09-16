class MainController < ApplicationController
  def index
    @sites = Site.all

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
