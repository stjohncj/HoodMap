require "application_system_test_case"

class SitesTest < ApplicationSystemTestCase
  setup do
    @site = sites(:one)
  end

  test "visiting the index" do
    visit sites_url
    assert_selector "h1", text: "Sites"
  end

  test "should create site" do
    visit sites_url
    click_on "New site"

    fill_in "Address", with: @site.address
    fill_in "Architect", with: @site.architect
    fill_in "Architectural style", with: @site.architectural_style
    fill_in "Built year", with: @site.built_year
    fill_in "Current owner", with: @site.current_owner
    fill_in "Description", with: @site.description
    fill_in "Historic name", with: @site.historic_name
    fill_in "Latitude", with: @site.latitude
    fill_in "Longitude", with: @site.longitude
    fill_in "Original owner", with: @site.original_owner
    fill_in "Survey year", with: @site.survey_year
    click_on "Create Site"

    assert_text "Site was successfully created"
    click_on "Back"
  end

  test "should update Site" do
    visit site_url(@site)
    click_on "Edit this site", match: :first

    fill_in "Address", with: @site.address
    fill_in "Architect", with: @site.architect
    fill_in "Architectural style", with: @site.architectural_style
    fill_in "Built year", with: @site.built_year
    fill_in "Current owner", with: @site.current_owner
    fill_in "Description", with: @site.description
    fill_in "Historic name", with: @site.historic_name
    fill_in "Latitude", with: @site.latitude
    fill_in "Longitude", with: @site.longitude
    fill_in "Original owner", with: @site.original_owner
    fill_in "Survey year", with: @site.survey_year
    click_on "Update Site"

    assert_text "Site was successfully updated"
    click_on "Back"
  end

  test "should destroy Site" do
    visit site_url(@site)
    click_on "Destroy this site", match: :first

    assert_text "Site was successfully destroyed"
  end
end
