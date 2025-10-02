# Initialize site image cache after Rails application starts
# This pre-loads all image URLs to eliminate database queries on page loads

Rails.application.config.after_initialize do
  # Only build cache in non-test environments to avoid test pollution
  unless Rails.env.test?
    # Build cache in a background thread to avoid blocking application startup
    Thread.new do
      begin
        # Small delay to ensure database connections are ready
        sleep(2)

        # Check if cache database is available before trying to use it
        if defined?(SolidCache) && ActiveRecord::Base.connected?
          # Build and cache all site image URLs
          SiteImageCache.build_and_store_cache
          Rails.logger.info "Site image cache initialization complete"
        else
          Rails.logger.warn "Cache database not available, skipping site image cache initialization"
        end
      rescue ActiveRecord::StatementInvalid, ActiveRecord::NoDatabaseError, ArgumentError => e
        # Database tables might not exist yet (e.g., during initial deployment)
        Rails.logger.warn "Site image cache initialization skipped: #{e.message}"
      rescue => e
        Rails.logger.error "Failed to initialize site image cache: #{e.message}"
      end
    end
  end
end
