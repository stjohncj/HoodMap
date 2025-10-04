# Warm up the site image cache on application startup
# This ensures the cache is ready before the first request
Rails.application.config.after_initialize do
  next if Rails.env.test? # Skip in test environment
  next if defined?(Rails::Console) # Skip in console
  next unless defined?(Rails::Server) || ENV['RAILS_ENV'] == 'production' # Only run when server starts

  # Build cache in background to avoid slowing down server startup
  Thread.new do
    begin
      Rails.logger.info "Warming up site image cache..."
      SiteImageCache.refresh_cache!
      Rails.logger.info "Site image cache warmed up successfully"
    rescue => e
      Rails.logger.error "Failed to warm up cache: #{e.message}"
    end
  end
end
