namespace :cache do
  desc "Refresh the site image cache"
  task refresh: :environment do
    puts "Refreshing site image cache..."
    cache = SiteImageCache.refresh_cache!
    stats = SiteImageCache.cache_stats
    puts "Cache refreshed successfully!"
    puts "  - Total images: #{stats[:total_images]}"
    puts "  - Total sites: #{stats[:total_sites]}"
    puts "  - Last built: #{stats[:last_built]}"
  end
end

# Hook into database tasks to refresh cache after data changes
namespace :db do
  task refresh_cache: :environment do
    Rake::Task["cache:refresh"].invoke
  end
end

# Automatically refresh cache after these database tasks
%w[db:seed db:reset db:migrate db:schema:load].each do |task_name|
  Rake::Task[task_name].enhance do
    Rake::Task["db:refresh_cache"].invoke
  end
end
