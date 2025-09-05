# Service class for caching site images and their URLs at application startup
# This eliminates the need for repeated database queries and Active Storage URL generation
class SiteImageCache
  CACHE_KEY = 'site_image_cache'.freeze
  
  # Build the complete image cache with pre-generated URLs
  def self.build_cache
    Rails.logger.info "Building site image cache..."
    
    # Single optimized query with includes to avoid N+1 queries
    sites_with_images = Site.includes(images_attachments: :blob)
                           .joins(:images_attachments)
                           .distinct
    
    image_cache = {}
    site_cache = {}
    image_count = 0
    
    sites_with_images.find_each do |site|
      # Store array of image IDs for each site for direct access
      site_image_ids = []
      
      site.images.each do |image|
        # Store the attachment reference instead of generating URLs at startup
        image_cache[image.id] = {
          attachment_id: image.id,
          blob_id: image.blob.id,
          blob_key: image.blob.key,
          blob_filename: image.blob.filename.to_s,
          site_name: site.historic_name || site.address,
          site_id: site.id,
          site_address: site.address
        }
        
        site_image_ids << image.id
        image_count += 1
      end
      
      # Store site -> image IDs mapping for efficient site-based lookups
      site_cache[site.id] = {
        site_name: site.historic_name || site.address,
        site_address: site.address,
        image_ids: site_image_ids
      }
    end
    
    Rails.logger.info "Site image cache built: #{image_count} images from #{sites_with_images.count} sites"
    
    # Return both caches
    {
      images: image_cache,
      sites: site_cache
    }
  end
  
  # Get random images from the cache
  def self.random_images(count = 50)
    cache = Rails.cache.read(CACHE_KEY)
    
    if cache.nil? || cache.empty?
      Rails.logger.warn "Site image cache is empty, rebuilding..."
      cache = build_and_store_cache
    end
    
    image_cache = cache[:images] || {}
    
    # Return random sample of cached images with generated URLs
    image_cache.values.sample(count).map do |cached_image|
      # Generate URL from cached blob information  
      blob = ActiveStorage::Blob.find_by(id: cached_image[:blob_id])
      url = blob ? Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true) : nil
      
      {
        url: url,
        alt: "Historic site: #{cached_image[:site_name]}",
        caption: cached_image[:site_name]
      }
    end.compact.select { |img| img[:url].present? }
  end
  
  # Get cached image URL by image ID
  def self.cached_image_url(image_id)
    cache = Rails.cache.read(CACHE_KEY) || {}
    image_cache = cache[:images] || {}
    cached_image = image_cache[image_id]
    
    return nil unless cached_image
    
    # Generate URL from cached blob information
    blob = ActiveStorage::Blob.find_by(id: cached_image[:blob_id])
    blob ? Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true) : nil
  end
  
  # Get all image IDs for a specific site (your suggestion!)
  def self.site_image_ids(site_id)
    cache = Rails.cache.read(CACHE_KEY) || {}
    site_cache = cache[:sites] || {}
    site_cache.dig(site_id, :image_ids) || []
  end
  
  # Get random images for a specific site
  def self.random_site_images(site_id, count = 3)
    image_ids = site_image_ids(site_id).sample(count)
    
    image_ids.map do |image_id|
      cached_image_url(image_id)
    end.compact
  end
  
  # Refresh the cache (for background jobs or manual refresh)
  def self.refresh_cache!
    Rails.logger.info "Refreshing site image cache..."
    build_and_store_cache
  end
  
  # Check if cache exists and is populated
  def self.cache_exists?
    cache = Rails.cache.read(CACHE_KEY)
    cache.present? && cache[:images].present? && cache[:images].any?
  end
  
  # Get cache statistics
  def self.cache_stats
    cache = Rails.cache.read(CACHE_KEY) || {}
    image_cache = cache[:images] || {}
    site_cache = cache[:sites] || {}
    
    {
      total_images: image_cache.size,
      total_sites: site_cache.size,
      cache_key: CACHE_KEY,
      last_built: Rails.cache.read("#{CACHE_KEY}_timestamp")
    }
  end
  
  private
  
  def self.build_and_store_cache
    cache = build_cache
    Rails.cache.write(CACHE_KEY, cache)
    Rails.cache.write("#{CACHE_KEY}_timestamp", Time.current)
    cache
  end
end