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

  # Parse address into house number and street name components
  # e.g., "123 Main Street" -> { house_number: 123, street_name: "Main Street" }
  def parsed_address
    return { house_number: 0, street_name: address.to_s } if address.blank?

    match = address.match(/\A(\d+)\s+(.+)\z/)
    if match
      { house_number: match[1].to_i, street_name: match[2] }
    else
      { house_number: 0, street_name: address }
    end
  end

  # Sort sites by street name alphabetically, then by house number numerically
  def self.sorted_by_street_and_number
    all.to_a.sort_by do |site|
      parsed = site.parsed_address
      [ parsed[:street_name].downcase, parsed[:house_number] ]
    end
  end
end
