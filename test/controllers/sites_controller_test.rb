require "test_helper"

class SitesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @site = sites(:one)
  end

  test "should get index" do
    get sites_url
    assert_response :success
  end

  test "should get new" do
    get new_site_url
    assert_response :success
  end

  test "should create site" do
    assert_difference("Site.count") do
      post sites_url, params: { site: { address: @site.address, architect: @site.architect, architectural_style: @site.architectural_style, built_year: @site.built_year, current_owner: @site.current_owner, description: @site.description, historic_name: @site.historic_name, latitude: @site.latitude, longitude: @site.longitude, original_owner: @site.original_owner, survey_year: @site.survey_year } }
    end

    assert_redirected_to site_url(Site.last)
  end

  test "should show site" do
    get site_url(@site)
    assert_response :success
  end

  test "should get edit" do
    get edit_site_url(@site)
    assert_response :success
  end

  test "should update site" do
    patch site_url(@site), params: { site: { address: @site.address, architect: @site.architect, architectural_style: @site.architectural_style, built_year: @site.built_year, current_owner: @site.current_owner, description: @site.description, historic_name: @site.historic_name, latitude: @site.latitude, longitude: @site.longitude, original_owner: @site.original_owner, survey_year: @site.survey_year } }
    assert_redirected_to site_url(@site)
  end

  test "should destroy site" do
    assert_difference("Site.count", -1) do
      delete site_url(@site)
    end

    assert_redirected_to sites_url
  end
end
