class InfoPagesController < ApplicationController
  # Configuration constants
  ARCHITECTURE_PAGE_NUM_SITE_PICS = 4
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
    # Use constant to control total number of site pictures shown
    top_images = SiteImageCache.random_images(ARCHITECTURE_PAGE_NUM_SITE_PICS)

    # Fallback: if cache is empty, rebuild it once
    if top_images.empty?
      Rails.logger.warn "Site image cache is empty, rebuilding..."
      SiteImageCache.build_and_store_cache
      top_images = SiteImageCache.random_images(ARCHITECTURE_PAGE_NUM_SITE_PICS)
    end

    @images = top_images
    @content_images = mhd_architecture_images
  end

  private

  # Legacy method kept for compatibility - now uses cache for performance
  def random_site_images(count = 3)
    SiteImageCache.random_images(count)
  end

  def mhd_architecture_images
    mhd_architecture_images_data.each_with_index.flat_map do |entry, position|
      images = if entry.nil?
        []
      elsif entry.is_a?(Array)
        entry.map do |address|
          SiteImageCache.find_by_address(address)
        end.compact
      elsif entry.end_with?(".jpg", ".png", ".gif", ".svg")
        # Direct image path - return hash with url key for consistency
        [ { url: ActionController::Base.helpers.asset_path(entry) } ]
      else
        [ SiteImageCache.find_by_address(entry) ]
      end

      # Add position to each image hash
      images.compact.map do |img|
        img.merge(position: position)
      end
    end
  end

  # List of all images used in the MHD architecture page, in order
  # Some entries are nil (no image for that section)
  # Some entries are arrays (multiple images for that section)
  def mhd_architecture_images_data
    [
      nil, # italianate style
      "815 Milwaukee Street",
      nil, # second empire style
      "1102 Dodge Street",
      nil,
      nil, # queen anne style
      "821 Dodge Street",
      nil,
      nil,
      nil,
      [ "822 Dodge Street", "222 Dorelle Street" ],
      "1018 Dodge Street",
      [ "1017 Milwaukee Street", "1203 Dodge Street", "1213 Dodge Street" ],
      "903 Dodge Street",
      "805 Dodge Street",
      nil, # four square style
      [ "803 Milwaukee Street", "1003 Milwaukee Street" ],
      [ "909 Dodge Street", "414 Dorelle Street", "916 Milwaukee Street" ],
      nil,
      nil, # period revival style
      [ "804 Milwaukee Street", "205 Rose Street" ],
      "1104 Dodge Street",
      "1020 Milwaukee Street",
      "1122 Milwaukee Street",
      "1119 Dodge Street",
      "MarquetteSchoolKewaunee.jpg",
      nil
    ]
  end
end
