class MainController < ApplicationController
  def index
    @sites = Site.all

    # Calculate center from actual site bounds
    if @sites.any?
      lats = @sites.map(&:latitude).compact
      lngs = @sites.map(&:longitude).compact
      @mhd_center_lat = (lats.min + lats.max) / 2.0
      @mhd_center_lng = (lngs.min + lngs.max) / 2.0
    else
      # Fallback center
      @mhd_center_lat = 44.452829
      @mhd_center_lng = -87.503556
    end
  end
end
