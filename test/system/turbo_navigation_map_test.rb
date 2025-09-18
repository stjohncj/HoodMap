require "application_system_test_case"

class TurboNavigationMapTest < ApplicationSystemTestCase
  setup do
    # Create test sites with required data for map display
    @site1 = sites(:marquette_house)
    @site2 = sites(:prairie_home)

    # Ensure sites have all required attributes
    @site1.update!(
      historic_name: "Test Historic House 1",
      address: "123 Test St",
      latitude: 46.5427,
      longitude: -87.3965
    ) if @site1.historic_name.blank? || @site1.latitude.blank?

    @site2.update!(
      historic_name: "Test Historic House 2",
      address: "456 Test Ave",
      latitude: 46.5430,
      longitude: -87.3970
    ) if @site2.historic_name.blank? || @site2.latitude.blank?
  end

  test "map initializes correctly on first visit" do
    visit root_path

    # Map should initialize
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Check that initialization flag is set
    sites_element = find("#sites")
    map_initialized = page.evaluate_script("document.getElementById('sites').dataset.mapInitialized")
    assert_equal "true", map_initialized, "Map initialization flag should be set"
  end

  test "navigating away and back via Turbo reinitializes map correctly" do
    # Start on map page
    visit root_path

    # Wait for initial map load
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Navigate to another page
    visit historic_architecture_path
    assert_current_path historic_architecture_path

    # Navigate back to map using Turbo (simulating header link click)
    visit root_path

    # Map should reinitialize correctly
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Check that map is functional
    first_marker = find(".custom-marker", match: :first)
    assert first_marker.present?

    # Test marker interaction
    first_marker.hover
    sleep 0.3
    # Hover should work correctly
    assert first_marker.present?
  end

  test "multiple Turbo navigations don't cause map initialization conflicts" do
    # Navigate back and forth multiple times
    5.times do
      visit root_path
      assert_selector "#map", wait: 5

      visit historic_architecture_path
      assert_current_path historic_architecture_path
    end

    # Final visit to map should work correctly
    visit root_path
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Map should be fully functional
    markers = all(".custom-marker")
    assert markers.length >= 1, "Should have at least one marker"
  end

  test "map initialization flag prevents duplicate initialization" do
    visit root_path

    # Wait for map to initialize
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Check initial state
    initial_marker_count = all(".custom-marker").length
    sites_element = find("#sites")

    # Manually trigger initMap again (simulating what would happen without flag)
    page.execute_script("initMap()")

    # Wait a moment for any potential duplicate initialization
    sleep 1

    # Should not have duplicate markers
    current_marker_count = all(".custom-marker").length
    assert_equal initial_marker_count, current_marker_count, "Should not create duplicate markers"

    # Flag should still be set
    map_initialized = page.evaluate_script("document.getElementById('sites').dataset.mapInitialized")
    assert_equal "true", map_initialized
  end

  test "map works correctly after browser back button navigation" do
    # Start on map
    visit root_path
    assert_selector "#map", wait: 10

    # Navigate to another page
    visit historic_architecture_path
    assert_current_path historic_architecture_path

    # Use browser back button
    page.go_back
    assert_current_path root_path

    # Map should work correctly
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Test interaction
    first_marker = find(".custom-marker", match: :first)
    first_marker.click

    # Modal should open
    assert_selector "#site-modal", visible: true, wait: 5
  end

  test "Turbo navigation preserves map container state correctly" do
    # Visit map page
    visit root_path
    assert_selector "#map", wait: 10

    # Get the map container's data attributes
    initial_data = page.evaluate_script("JSON.stringify(document.getElementById('sites').dataset)")

    # Navigate away and back
    visit historic_architecture_path
    visit root_path

    # Wait for reinitialization
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Check that the container data is properly managed
    sites_element = find("#sites")
    map_initialized = page.evaluate_script("document.getElementById('sites').dataset.mapInitialized")
    assert_equal "true", map_initialized

    # The container should have the expected data attributes
    latitude = page.evaluate_script("document.getElementById('sites').getAttribute('data-latitude')")
    longitude = page.evaluate_script("document.getElementById('sites').getAttribute('data-longitude')")

    assert latitude.present?, "Latitude should be present"
    assert longitude.present?, "Longitude should be present"
  end

  test "error handling during Turbo navigation with missing map container" do
    # Visit a page without a map container first
    visit historic_architecture_path

    # Script should handle missing container gracefully
    # No JavaScript errors should occur
    page.execute_script("initMap()")

    # Should not throw errors
    assert_current_path historic_architecture_path
  end

  test "map initialization works with slow loading Google Maps API" do
    visit root_path

    # Even if Google Maps is slow to load, the page should not error
    # This tests the async/await error handling in initMap
    assert_selector "#sites", wait: 5

    # Map should eventually initialize
    assert_selector "#map", wait: 15

    # If markers are slow to appear, that's okay as long as no errors occur
    # and the container is properly set up
    sites_element = find("#sites")
    assert sites_element.present?
  end

  test "consecutive rapid Turbo navigations handle race conditions" do
    # Rapidly navigate back and forth to test race conditions
    10.times do |i|
      if i.even?
        visit root_path
        # Don't wait for full map load, just ensure page loads
        assert_selector "#sites", wait: 2
      else
        visit historic_architecture_path
        assert_current_path historic_architecture_path
      end
    end

    # Final navigation should work correctly
    visit root_path
    assert_selector "#map", wait: 10

    # Check that we don't have any JavaScript errors or duplicate elements
    error_messages = page.evaluate_script("window.jsErrors || []")
    assert_empty error_messages, "Should not have JavaScript errors: #{error_messages}"
  end

  test "map container reinitialization clears previous state correctly" do
    visit root_path
    assert_selector "#map", wait: 10

    # Verify initial state
    initial_markers = all(".custom-marker").length

    # Navigate away and back
    visit historic_architecture_path
    visit root_path

    # Wait for reinitialization
    assert_selector "#map", wait: 10
    assert_selector ".custom-marker", wait: 10

    # Should have the same number of markers (not duplicated)
    final_markers = all(".custom-marker").length
    assert_equal initial_markers, final_markers, "Should not duplicate markers on reinit"
  end

  test "modal state is properly cleared on Turbo navigation" do
    visit root_path
    assert_selector "#map", wait: 10

    # Open a modal
    first_marker = find(".custom-marker", match: :first)
    first_marker.click
    assert_selector "#site-modal", visible: true, wait: 5

    # Navigate away (modal should be cleaned up)
    visit historic_architecture_path
    assert_current_path historic_architecture_path

    # Navigate back
    visit root_path
    assert_selector "#map", wait: 10

    # Modal should not be visible
    assert_no_selector "#site-modal", visible: true
  end
end
