require "test_helper"

class ImageLoadingPerformanceTest < ActionDispatch::IntegrationTest
  setup do
    # Clear cache before each test
    Rails.cache.clear

    # Create test sites with images
    @site1 = sites(:marquette_house)
    @site2 = sites(:prairie_home)

    # Ensure sites have required attributes
    @site1.update!(
      historic_name: "Test Historic House 1",
      address: "123 Test St"
    ) if @site1.historic_name.blank?

    @site2.update!(
      historic_name: "Test Historic House 2",
      address: "456 Test Ave"
    ) if @site2.historic_name.blank?
  end

  teardown do
    Rails.cache.clear
  end

  test "historic architecture page loads without database queries for images when cache is warm" do
    skip_unless_images_exist

    # Warm the cache
    SiteImageCache.build_and_store_cache

    # Count SQL queries during page load
    query_count = 0
    ActiveSupport::Notifications.subscribe "sql.active_record" do |name, start, finish, id, payload|
      # Skip schema queries and cache queries
      unless payload[:sql].match?(/PRAGMA|sqlite_master|CACHE/)
        query_count += 1
      end
    end

    get mhd_architecture_path

    # Should have minimal queries (just the basic page load, not image fetching)
    assert_response :success
    assert query_count < 5, "Expected fewer than 5 queries, got #{query_count}"
  end

  test "historic architecture page rebuilds cache when empty and loads successfully" do
    skip_unless_images_exist

    # Ensure cache is empty
    Rails.cache.clear
    assert_not SiteImageCache.cache_exists?

    # Page should still load and rebuild cache automatically
    get mhd_architecture_path

    assert_response :success
    assert SiteImageCache.cache_exists?, "Cache should be rebuilt automatically"

    # Check that images are displayed
    assert_select ".architecture-gallery", "Gallery section should exist"
  end

  test "historic architecture page performance with cold cache vs warm cache" do
    skip_unless_images_exist

    # Measure cold cache performance
    Rails.cache.clear
    cold_start = Time.current
    get mhd_architecture_path
    cold_duration = Time.current - cold_start

    assert_response :success

    # Measure warm cache performance
    warm_start = Time.current
    get mhd_architecture_path
    warm_duration = Time.current - warm_start

    assert_response :success

    # Warm cache should be faster than cold cache
    # Allow some tolerance for test environment variations
    assert warm_duration < cold_duration + 0.1,
           "Warm cache (#{warm_duration}s) should be faster than cold cache (#{cold_duration}s)"
  end

  test "historic architecture page displays random images on each request" do
    skip_unless_images_exist

    # Warm the cache
    SiteImageCache.build_and_store_cache

    # Make multiple requests and collect displayed images
    image_sets = []
    3.times do
      get mhd_architecture_path
      assert_response :success

      # Extract image sources from response
      doc = Nokogiri::HTML(response.body)
      images = doc.css(".architecture-gallery img").map { |img| img["src"] }
      image_sets << images if images.any?
    end

    # Skip if no images found
    skip "No images found in responses" if image_sets.empty?

    # Check that we got some variation in images (not identical every time)
    unique_sets = image_sets.uniq
    assert unique_sets.length > 1, "Should get different image sets on different requests"
  end

  test "historic architecture page handles sites without images gracefully" do
    # Clear all images and cache
    Site.all.each { |site| site.images.purge }
    Rails.cache.clear

    get mhd_architecture_path

    assert_response :success

    # Should still render the page even with no images
    assert_select "h1", text: /Marquette Historic District/i
  end

  test "site image cache URLs are valid and accessible" do
    skip_unless_images_exist

    # Build cache
    cache = SiteImageCache.build_and_store_cache

    # Test that cached URLs are accessible
    cache[:images].each do |image_id, image_data|
      url = image_data[:url]
      assert url.present?, "Image #{image_id} should have a URL"
      assert url.include?("/rails/active_storage/blobs"),
             "URL should be Active Storage path: #{url}"

      # Test that URL is accessible (extract path from full URL if needed)
      url_path = URI.parse(url).path
      get url_path
      assert_response :success, "Image URL should be accessible: #{url_path}"
    end
  end

  test "cache stats are accurate after page loads" do
    skip_unless_images_exist

    # Start with empty cache
    Rails.cache.clear

    # Load page (should rebuild cache)
    get mhd_architecture_path
    assert_response :success

    # Check cache stats
    stats = SiteImageCache.cache_stats

    assert stats[:total_images] > 0, "Should have cached some images"
    assert stats[:total_sites] > 0, "Should have cached some sites"
    assert stats[:last_built].present?, "Should have a last_built timestamp"
    assert_in_delta Time.current, stats[:last_built], 10.seconds,
                    "Cache should have been built recently"
  end

  test "cache handles concurrent requests safely" do
    skip_unless_images_exist

    # Clear cache
    Rails.cache.clear

    # Simulate concurrent requests
    threads = []
    results = []

    5.times do
      threads << Thread.new do
        get mhd_architecture_path
        results << { status: response.status, cache_exists: SiteImageCache.cache_exists? }
      end
    end

    threads.each(&:join)

    # All requests should succeed
    results.each do |result|
      assert_equal 200, result[:status], "All concurrent requests should succeed"
    end

    # Cache should exist after concurrent access
    assert SiteImageCache.cache_exists?, "Cache should exist after concurrent requests"
  end

  private

  def skip_unless_images_exist
    sites_with_images = Site.joins(:images_attachments).distinct
    skip "No sites with images found in test database" if sites_with_images.empty?
  end
end
