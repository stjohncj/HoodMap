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

class Site < ApplicationRecord
  has_many_attached :images do |attachable|
    attachable.variant :thumb, resize_to_limit: [ 100, 100 ]
  end
end
