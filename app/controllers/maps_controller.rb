class MapsController < ApplicationController
  def house
    @site = Site.find(params[:id])
  end

  def house_modal
    @site = Site.find(params[:id])
    render partial: "sites/site_modal", locals: { site: @site }
  end
end
