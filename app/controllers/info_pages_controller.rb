class InfoPagesController < ApplicationController
  def kewaunee_history
    @content = File.read(Rails.root.join("db", "site_txt", "Kewaunee_History.txt"))
    @page_title = "Kewaunee History"
  end

  def mhd_history
    @content = File.read(Rails.root.join("db", "site_txt", "MHD_History.txt"))
    @page_title = "Marquette Historic District Background"
  end

  def mhd_architecture
    @content = File.read(Rails.root.join("db", "site_txt", "MHD_Architecture.txt"))
    @page_title = "Marquette Historic District Architecture"
    
    # Get all available random site images in one call
    all_images = random_site_images(50)  # Get plenty of images
    @random_site_images = all_images.first(3)  # First 3 for the top gallery
    @content_images = all_images.drop(3)       # Rest for embedding in content
  end

  private

  def random_site_images(count = 3)
    sites_with_images = Site.joins(:images_attachments).distinct
    return [] if sites_with_images.empty?
    
    selected_sites = sites_with_images.limit(count * 3).sample(count)
    selected_sites.map do |site|
      image = site.images.sample
      {
        url: url_for(image),
        alt: "Historic site: #{site.historic_name || site.address}",
        caption: site.historic_name || site.address
      }
    end
  end
end
