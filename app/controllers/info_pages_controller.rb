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
    
    # Get cached images - no database queries needed!
    all_images = SiteImageCache.random_images(50)  # Get plenty of cached images
    @random_site_images = all_images.first(3)      # First 3 for the top gallery
    @content_images = all_images.drop(3)           # Rest for embedding in content
  end

  private

  # Legacy method kept for compatibility - now uses cache for performance
  def random_site_images(count = 3)
    SiteImageCache.random_images(count)
  end
end
