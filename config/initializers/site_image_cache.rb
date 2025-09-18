# Initialize site image cache after Rails application starts
# This pre-loads all image URLs to eliminate database queries on page loads

Rails.application.config.after_initialize do
  # Only build cache in non-test environments to avoid test pollution
  unless Rails.env.test?
    begin
      # Build cache in a background thread to avoid blocking application startup
      Thread.new do
        # Small delay to ensure database connections are ready
        sleep(2)

        # Build and cache all site image URLs
        SiteImageCache.build_and_store_cache

        Rails.logger.info "Site image cache initialization complete"
      end
    rescue => e
      Rails.logger.error "Failed to initialize site image cache: #{e.message}"
    end
  end
end
