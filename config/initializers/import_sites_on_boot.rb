# Import sites in the background after server boots
# This is triggered when HOOD_MAP_IMPORT_ON_BOOT is set by docker-entrypoint
# when the database is empty. This allows the health check to pass while
# the import runs asynchronously.

if ENV["HOOD_MAP_IMPORT_ON_BOOT"] && Rails.env.production?
  Rails.application.config.after_initialize do
    Thread.new do
      # Give the server a moment to fully start
      sleep 5

      Rails.logger.info "Starting background site rebuild..."

      begin
        # Load tasks if not already loaded
        Rails.application.load_tasks unless Rake::Task.task_defined?("db:sites:rebuild")

        # Run the rebuild
        Rake::Task["db:sites:rebuild"].invoke

        # Explicitly refresh the image cache after rebuild
        # (rebuild already triggers this via enhance, but be explicit)
        Rails.logger.info "Refreshing site image cache after rebuild..."
        SiteImageCache.refresh_cache!

        Rails.logger.info "Background site rebuild completed successfully!"
      rescue => e
        Rails.logger.error "Background site rebuild failed: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
      end
    end
  end
end
