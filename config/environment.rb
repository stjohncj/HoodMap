# Load the Rails application.
require_relative "application"

# Set secret_key_base before initialization if in production
if ENV["RAILS_ENV"] == "production"
  puts "DEBUG: RAILS_ENV is production"
  puts "DEBUG: SECRET_KEY_BASE present: #{ENV['SECRET_KEY_BASE'].present?}"
  if ENV["SECRET_KEY_BASE"].present?
    Rails.application.config.secret_key_base = ENV["SECRET_KEY_BASE"]
    puts "DEBUG: Set secret_key_base from ENV"
  else
    puts "DEBUG: SECRET_KEY_BASE not found in ENV!"
  end
end

# Initialize the Rails application.
Rails.application.initialize!
