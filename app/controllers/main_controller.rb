class MainController < ApplicationController
  def index
    @mhd_center_lat = 44.454752344607115
    @mhd_center_lng = -87.50453644092718
    @sites = Site.all
  end
end
