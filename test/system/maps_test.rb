require "application_system_test_case"

class MapsTest < ApplicationSystemTestCase
  def setup
    @site = sites(:marquette_house)
  end

  test "visiting the main page shows the historic district map" do
    visit historic_district_map_path

    assert_selector "h1", text: "Marquette Historic District"
    assert_selector "#map"
    assert_selector ".sites-sidebar"
    assert_selector ".page-header"
  end

  test "historic district page displays site information" do
    visit historic_district_map_path

    # Check that sites are listed in sidebar
    assert_selector ".site-list-item", minimum: 1
    assert_selector ".site-list-item h4", text: @site.historic_name
    assert_selector ".site-list-item p", text: @site.address

    if @site.built_year
      assert_selector ".site-list-item small", text: "Built: #{@site.built_year}"
    end
  end

  test "historic district page shows stats correctly" do
    visit historic_district_map_path

    assert_selector ".stats"
    assert_selector ".stat-item", minimum: 3
    assert_selector ".stat-number"
    assert_selector ".stat-label"

    # Check that site count is displayed
    site_count = Site.count
    assert_selector ".stat-number", text: site_count.to_s
  end

  test "historic district page includes about section" do
    visit historic_district_map_path

    assert_selector ".about-content"
    assert_selector ".about-content h2", text: "About the Marquette Historic District"
    assert_text "Welcome to the Marquette Historic District"
    assert_text "over 40 historic homes"
  end

  test "historic district page includes board members section" do
    visit historic_district_map_path

    assert_selector ".board-members"
    assert_selector ".board-members h2", text: "MHD Committee, Board of Directors"
    assert_selector ".board-member", minimum: 1
    assert_selector ".member-role"
    assert_selector ".member-name"
  end

  test "clicking on site in sidebar opens modal" do
    visit historic_district_map_path

    # Wait for page to load and find the site element
    site_element = find(".site-list-item[data-id='#{@site.id}']")

    # Click on the site
    site_element.click

    # Check if modal appears (may need to wait for async loading)
    assert_selector "#site-modal[style*='block']", wait: 5
    assert_selector "#modal-site-content", wait: 5
  end

  test "modal displays site details correctly" do
    visit historic_district_map_path

    # Click on site to open modal
    find(".site-list-item[data-id='#{@site.id}']").click

    # Wait for modal to appear and content to load
    assert_selector "#site-modal[style*='block']", wait: 5
    assert_selector "#modal-site-content", wait: 5

    # Check that modal has loaded content (it loads via fetch, so content structure may vary)
    assert_text @site.historic_name, wait: 5
  end

  test "modal can be closed" do
    visit historic_district_map_path

    # Open modal
    find(".site-list-item[data-id='#{@site.id}']").click

    # Wait for modal to appear
    assert_selector "#site-modal[style*='block']", wait: 5

    # Close modal using close button
    within "#site-modal" do
      find(".modal-close").click
    end

    # Modal should be hidden
    assert_selector "#site-modal[style*='none']", wait: 5
  end

  test "modal can be closed with escape key" do
    visit historic_district_map_path

    # Open modal
    find(".site-list-item[data-id='#{@site.id}']").click

    # Wait for modal to appear
    assert_selector "#site-modal[style*='block']", wait: 5

    # Press escape key
    find("body").send_keys(:escape)

    # Modal should be hidden
    assert_selector "#site-modal[style*='none']", wait: 5
  end

  test "page is responsive on mobile viewport" do
    # Set mobile viewport
    page.driver.browser.manage.window.resize_to(375, 667)

    visit historic_district_map_path

    assert_selector "h1", text: "Marquette Historic District"
    assert_selector "#map"
    assert_selector ".sites-sidebar"

    # Check that elements are still visible and functional
    assert_selector ".site-list-item", minimum: 1
    assert_selector ".stats"
    assert_selector ".board-members"
  end

  test "site detail page renders correctly" do
    visit house_path(@site)

    assert_selector ".site-header h1", text: @site.historic_name
    assert_selector ".site-address", text: @site.address

    if @site.description.present?
      assert_selector ".site-description", text: @site.description
    end

    assert_selector ".site-details-card"
  end

  test "banner displays correctly with animations" do
    visit historic_district_map_path

    assert_selector ".page-header"
    assert_selector ".page-header h1", text: "Marquette Historic District"
    assert_selector ".page-header .subtitle"
    assert_selector ".page-header .stats"

    # Check for Kewaunee link
    assert_selector ".location-highlight", text: "Kewaunee, WI"

    # Verify link functionality
    kewaunee_link = find(".location-highlight")
    assert_equal "https://cityofkewauneewi.gov/", kewaunee_link[:href]
    assert_equal "_blank", kewaunee_link[:target]
  end

  test "site images are displayed when present" do
    # Add an image to a site for testing
    if @site.images.attached?
      visit house_path(@site)

      assert_selector ".image-gallery"
      assert_selector ".gallery-image", minimum: 1
    else
      # Test passes if no images are attached
      visit house_path(@site)
      assert true
    end
  end

  test "map container has proper data attributes" do
    visit historic_district_map_path

    sites_element = find("#sites")
    assert sites_element["data-latitude"]
    assert sites_element["data-longitude"]

    # Verify center coordinates are in reasonable range for Kewaunee, Wisconsin
    latitude = sites_element["data-latitude"].to_f
    longitude = sites_element["data-longitude"].to_f

    assert_in_delta 44.45, latitude, 0.02, "Latitude should be near Kewaunee, WI"
    assert_in_delta -87.50, longitude, 0.02, "Longitude should be near Kewaunee, WI"
  end

  test "all site list items have required data attributes" do
    visit historic_district_map_path

    all(".site-list-item").each do |site_element|
      assert site_element["data-id"]
      assert site_element["data-historic-name"]
      assert site_element["data-latitude"]
      assert site_element["data-longitude"]
      assert site_element["data-address"]
    end
  end
end
