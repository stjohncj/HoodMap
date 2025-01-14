json.extract! site, :id, :historic_name, :address, :original_owner, :current_owner, :description, :architect, :architectural_style, :latitude, :longitude, :survey_year, :built_year, :created_at, :updated_at
json.url site_url(site, format: :json)
