class MapsController < ApplicationController
  def historic_district
    @mhd_center_lat = 44.454752344607115
    @mhd_center_lng = -87.50453644092718
    @sites = Site.all
  end

  def house
    @site = Site.find(params[:id])
  end

  def house_modal
    @site = Site.find(params[:id])
    render partial: 'sites/site_modal', locals: { site: @site }
  end
end
