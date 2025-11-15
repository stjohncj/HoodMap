# Warm up the site image cache on application startup
# This ensures the cache is ready before the first request
Rails.application.config.after_initialize do
  next if Rails.env.test? # Skip in test environment
  next if defined?(Rails::Console) # Skip in console
  next if defined?(Rake) # Skip during rake tasks

  # Build cache in background to avoid slowing down server startup
  # Don't wait for cache - let healthcheck pass while cache builds
  Thread.new do
    begin
      # Small delay to ensure database is ready
      sleep(2)
      Rails.logger.info "Warming up site image cache..."
      SiteImageCache.refresh_cache!
      Rails.logger.info "Site image cache warmed up successfully"
    rescue ActiveRecord::StatementInvalid, ActiveRecord::NoDatabaseError => e
      Rails.logger.warn "Site image cache warmup skipped: #{e.message}"
    rescue => e
      Rails.logger.error "Failed to warm up cache: #{e.message}"
    end
  end
end
