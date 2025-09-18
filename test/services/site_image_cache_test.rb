require "test_helper"

class SiteImageCacheTest < ActiveSupport::TestCase
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

  test "cache key constant is defined" do
    assert_equal "site_image_cache", SiteImageCache::CACHE_KEY
  end

  test "build_cache returns proper structure" do
    cache = SiteImageCache.build_cache

    assert_kind_of Hash, cache
    assert_includes cache.keys, :images
    assert_includes cache.keys, :sites
    assert_kind_of Hash, cache[:images]
    assert_kind_of Hash, cache[:sites]
  end

  test "build_cache includes sites with images" do
    skip_unless_images_exist

    cache = SiteImageCache.build_cache

    # Should include sites that have images
    site_ids_with_images = Site.joins(:images_attachments).distinct.pluck(:id)
    cache_site_ids = cache[:sites].keys

    site_ids_with_images.each do |site_id|
      assert_includes cache_site_ids, site_id, "Cache should include site #{site_id} that has images"
    end
  end

  test "build_cache pre-generates URLs" do
    skip_unless_images_exist

    cache = SiteImageCache.build_cache

    cache[:images].each do |image_id, image_data|
      assert_includes image_data.keys, :url, "Image data should include pre-generated URL"
      assert_kind_of String, image_data[:url], "URL should be a string"
      assert_match %r{^/rails/active_storage/blobs}, image_data[:url], "URL should be Active Storage path"
    end
  end

  test "build_cache includes required image metadata" do
    skip_unless_images_exist

    cache = SiteImageCache.build_cache

    cache[:images].each do |image_id, image_data|
      assert_includes image_data.keys, :attachment_id
      assert_includes image_data.keys, :blob_id
      assert_includes image_data.keys, :blob_key
      assert_includes image_data.keys, :blob_filename
      assert_includes image_data.keys, :url
      assert_includes image_data.keys, :site_name
      assert_includes image_data.keys, :site_id
      assert_includes image_data.keys, :site_address

      assert_equal image_id, image_data[:attachment_id]
    end
  end

  test "build_cache includes site metadata" do
    skip_unless_images_exist

    cache = SiteImageCache.build_cache

    cache[:sites].each do |site_id, site_data|
      assert_includes site_data.keys, :site_name
      assert_includes site_data.keys, :site_address
      assert_includes site_data.keys, :image_ids

      assert_kind_of Array, site_data[:image_ids]
      assert_kind_of String, site_data[:site_name]
      assert_kind_of String, site_data[:site_address]
    end
  end

  test "build_and_store_cache stores cache and timestamp" do
    cache = SiteImageCache.build_and_store_cache

    stored_cache = Rails.cache.read(SiteImageCache::CACHE_KEY)
    timestamp = Rails.cache.read("#{SiteImageCache::CACHE_KEY}_timestamp")

    assert_equal cache, stored_cache
    assert_kind_of Hash, cache
    assert_includes cache.keys, :images
    assert_includes cache.keys, :sites
    assert_kind_of Time, timestamp
    assert_in_delta Time.current, timestamp, 5.seconds
  end

  test "cache_exists? returns false when cache is empty" do
    Rails.cache.clear

    assert_not SiteImageCache.cache_exists?
  end

  test "cache_exists? returns appropriate value based on cache content" do
    SiteImageCache.build_and_store_cache

    # Check if cache was stored correctly
    cache = Rails.cache.read(SiteImageCache::CACHE_KEY)
    assert cache.present?
    assert_kind_of Hash, cache
    assert_includes cache.keys, :images
    assert_includes cache.keys, :sites

    # cache_exists? depends on whether there are actual images
    # In empty test DB, it should return false; with images it should return true
    if cache[:images].any?
      assert SiteImageCache.cache_exists?
    else
      assert_not SiteImageCache.cache_exists?
    end
  end

  test "cache_stats returns correct structure" do
    SiteImageCache.build_and_store_cache

    stats = SiteImageCache.cache_stats

    assert_includes stats.keys, :total_images
    assert_includes stats.keys, :total_sites
    assert_includes stats.keys, :cache_key
    assert_includes stats.keys, :last_built

    assert_kind_of Integer, stats[:total_images]
    assert_kind_of Integer, stats[:total_sites]
    assert_equal SiteImageCache::CACHE_KEY, stats[:cache_key]
  end

  test "cache_stats with empty cache" do
    Rails.cache.clear

    stats = SiteImageCache.cache_stats

    assert_equal 0, stats[:total_images]
    assert_equal 0, stats[:total_sites]
    assert_nil stats[:last_built]
  end

  test "random_images returns array" do
    result = SiteImageCache.random_images(5)

    assert_kind_of Array, result
    assert_operator result.length, :<=, 5
  end

  test "random_images rebuilds cache when empty" do
    Rails.cache.clear

    result = SiteImageCache.random_images(3)

    # Should rebuild cache automatically
    cache = Rails.cache.read(SiteImageCache::CACHE_KEY)
    assert cache.present?
    assert_kind_of Hash, cache
    assert_kind_of Array, result

    # Result length depends on whether there are images in the database
    if cache[:images].any?
      assert_operator result.length, :>, 0
    else
      assert_equal 0, result.length
    end
  end

  test "random_images returns correct structure" do
    skip_unless_images_exist

    SiteImageCache.build_and_store_cache
    result = SiteImageCache.random_images(3)

    result.each do |image|
      assert_includes image.keys, :url
      assert_includes image.keys, :alt
      assert_includes image.keys, :caption

      assert_kind_of String, image[:url]
      assert_kind_of String, image[:alt]
      assert_kind_of String, image[:caption]

      assert_match %r{Historic home, the}, image[:alt]
    end
  end

  test "random_images filters out images without URLs" do
    # Create cache with some invalid data
    invalid_cache = {
      images: {
        1 => { url: "/valid/url", site_name: "Valid Site" },
        2 => { url: "", site_name: "Invalid Site" },
        3 => { url: nil, site_name: "Nil Site" }
      },
      sites: {}
    }

    Rails.cache.write(SiteImageCache::CACHE_KEY, invalid_cache)

    result = SiteImageCache.random_images(10)

    # Should only return images with present URLs
    result.each do |image|
      assert image[:url].present?, "Should filter out images without URLs"
    end

    # In this test we intentionally put one valid image, so we should get exactly one back
    assert_equal 1, result.length, "Should return exactly one valid image from test cache"
  end

  test "cached_image_url returns URL for valid image ID" do
    skip_unless_images_exist

    SiteImageCache.build_and_store_cache
    cache = Rails.cache.read(SiteImageCache::CACHE_KEY)

    if cache[:images].any?
      image_id = cache[:images].keys.first
      expected_url = cache[:images][image_id][:url]

      result = SiteImageCache.cached_image_url(image_id)

      assert_equal expected_url, result
    end
  end

  test "cached_image_url returns nil for invalid image ID" do
    SiteImageCache.build_and_store_cache

    result = SiteImageCache.cached_image_url(999999)

    assert_nil result
  end

  test "cached_image_url returns nil when cache is empty" do
    Rails.cache.clear

    result = SiteImageCache.cached_image_url(1)

    assert_nil result
  end

  test "site_image_ids returns array of image IDs for site" do
    skip_unless_images_exist

    SiteImageCache.build_and_store_cache
    cache = Rails.cache.read(SiteImageCache::CACHE_KEY)

    if cache[:sites].any?
      site_id = cache[:sites].keys.first
      expected_ids = cache[:sites][site_id][:image_ids]

      result = SiteImageCache.site_image_ids(site_id)

      assert_equal expected_ids, result
      assert_kind_of Array, result
    end
  end

  test "site_image_ids returns empty array for invalid site ID" do
    SiteImageCache.build_and_store_cache

    result = SiteImageCache.site_image_ids(999999)

    assert_equal [], result
  end

  test "random_site_images returns URLs for site" do
    skip_unless_images_exist

    SiteImageCache.build_and_store_cache
    cache = Rails.cache.read(SiteImageCache::CACHE_KEY)

    if cache[:sites].any?
      site_id = cache[:sites].keys.first

      result = SiteImageCache.random_site_images(site_id, 2)

      assert_kind_of Array, result
      assert_operator result.length, :<=, 2

      result.each do |url|
        assert_kind_of String, url
        assert_match %r{^/rails/active_storage/blobs}, url
      end
    end
  end

  test "refresh_cache! rebuilds and stores cache" do
    # Clear cache first
    Rails.cache.clear
    assert_not SiteImageCache.cache_exists?

    result = SiteImageCache.refresh_cache!

    # Cache should be rebuilt and method should return the cache
    cache = Rails.cache.read(SiteImageCache::CACHE_KEY)
    assert cache.present?
    assert_kind_of Hash, cache
    assert_equal cache, result
  end

  private

  def skip_unless_images_exist
    sites_with_images = Site.joins(:images_attachments).distinct
    skip "No sites with images found in test database" if sites_with_images.empty?
  end
end
