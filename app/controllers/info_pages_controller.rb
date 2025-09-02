class InfoPagesController < ApplicationController
  def kewaunee_history
    @content = File.read(Rails.root.join("db", "site_txt", "Kewaunee_History.txt"))
    @page_title = "Kewaunee History"
  end

  def mhd_history
    @content = File.read(Rails.root.join("db", "site_txt", "MHD_History.txt"))
    @page_title = "Marquette Historic District History"
  end

  def mhd_architecture
    @content = File.read(Rails.root.join("db", "site_txt", "MHD_Architecture.txt"))
    @page_title = "Marquette Historic District Architecture"
  end
end