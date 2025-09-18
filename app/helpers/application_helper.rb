module ApplicationHelper
  # Get cached site image URL by image ID
  # Returns the cached URL if available, otherwise falls back to Active Storage
  def cached_site_image_url(image_or_id)
    return nil if image_or_id.nil?

    image_id = image_or_id.is_a?(ActiveStorage::Attachment) ? image_or_id.id : image_or_id

    # Try to get from cache first
    cached_url = SiteImageCache.cached_image_url(image_id)
    return cached_url if cached_url.present?

    # Fallback to Active Storage if cache miss
    if image_or_id.is_a?(ActiveStorage::Attachment)
      url_for(image_or_id)
    else
      # If we only have an ID, we need to query the database
      attachment = ActiveStorage::Attachment.find_by(id: image_id)
      attachment ? url_for(attachment) : nil
    end
  end

  # Get cache statistics for debugging/admin purposes
  def site_image_cache_stats
    SiteImageCache.cache_stats
  end

  # Check if the image cache is properly loaded
  def site_image_cache_loaded?
    SiteImageCache.cache_exists?
  end

  # Manual cache refresh (for admin/development use)
  def refresh_site_image_cache!
    SiteImageCache.refresh_cache!
  end
end
