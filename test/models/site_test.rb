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
  # test "the truth" do
  #   assert true
  # end
end
