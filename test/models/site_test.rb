# == Schema Information
#
# Table name: sites
#
#  id                  :integer          not null, primary key
#  historic_name       :string
#  address             :string
#  original_owner      :string
#  current_owner       :string
#  description         :text
#  architect           :string
#  architectural_style :string
#  latitude            :decimal(, )
#  longitude           :decimal(, )
#  survey_year         :integer
#  built_year          :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

require "test_helper"

class SiteTest < ActiveSupport::TestCase
  def setup
    @site = sites(:marquette_house)
  end

  test "should be valid with valid attributes" do
    assert @site.valid?
  end

  test "should have many attached images" do
    assert_respond_to @site, :images
    assert_kind_of ActiveStorage::Attached::Many, @site.images
  end

  test "images should support thumb variant" do
    # Create a test image file
    image_blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new("test image content"),
      filename: "test.jpg",
      content_type: "image/jpeg"
    )
    
    @site.images.attach(image_blob)
    
    assert @site.images.attached?
    assert_respond_to @site.images.first, :variant
  end

  test "should allow nil values for optional fields" do
    site = Site.new
    
    # These fields should be allowed to be nil
    assert_nil site.historic_name
    assert_nil site.address
    assert_nil site.original_owner
    assert_nil site.current_owner
    assert_nil site.description
    assert_nil site.architect
    assert_nil site.architectural_style
    assert_nil site.latitude
    assert_nil site.longitude
    assert_nil site.survey_year
    assert_nil site.built_year
    
    # Site should still be valid even with nil values
    assert site.valid?
  end

  test "should accept valid latitude and longitude" do
    @site.latitude = 44.4619
    @site.longitude = -87.5069
    
    assert @site.valid?
    assert_equal 44.4619, @site.latitude
    assert_equal -87.5069, @site.longitude
  end

  test "should accept valid years" do
    @site.built_year = 1895
    @site.survey_year = 1993
    
    assert @site.valid?
    assert_equal 1895, @site.built_year
    assert_equal 1993, @site.survey_year
  end

  test "should handle string attributes properly" do
    @site.historic_name = "Test Historic House"
    @site.address = "123 Test Street"
    @site.original_owner = "John Doe"
    @site.current_owner = "Jane Smith"
    @site.architect = "Frank Lloyd Wright"
    @site.architectural_style = "Prairie"
    @site.description = "A beautiful historic home with significant architectural features."
    
    assert @site.valid?
    assert_equal "Test Historic House", @site.historic_name
    assert_equal "123 Test Street", @site.address
    assert_equal "John Doe", @site.original_owner
    assert_equal "Jane Smith", @site.current_owner
    assert_equal "Frank Lloyd Wright", @site.architect
    assert_equal "Prairie", @site.architectural_style
    assert_equal "A beautiful historic home with significant architectural features.", @site.description
  end

  test "should have timestamps" do
    assert_respond_to @site, :created_at
    assert_respond_to @site, :updated_at
    assert_not_nil @site.created_at
    assert_not_nil @site.updated_at
  end

  test "should update updated_at on save" do
    original_updated_at = @site.updated_at
    
    # Wait a small amount to ensure timestamp difference
    sleep 0.01
    
    @site.historic_name = "Updated Name"
    @site.save!
    
    assert @site.updated_at > original_updated_at
  end
end
