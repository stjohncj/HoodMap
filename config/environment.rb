# Load the Rails application.
require_relative "application"

# Set secret_key_base before initialization if in production
if ENV["RAILS_ENV"] == "production"
  puts "DEBUG: Available ENV vars: #{ENV.keys.select { |k| k.start_with?('RAILS', 'SECRET', 'DATABASE') }.join(', ')}"

  # Fallback to a hardcoded value if SECRET_KEY_BASE is not in ENV
  # This is temporary to get the app running
  if ENV["SECRET_KEY_BASE"].blank?
    puts "WARNING: SECRET_KEY_BASE not found in ENV, using fallback"
    ENV["SECRET_KEY_BASE"] = "dbf6b12f94b73cde0d0fddcdcc2fe299e25bde424f454f987408b49b47d238e3192344b7886019d24709cba79b4fb718efa56cea1328a0720979ea1152bca9ee"
  end

  Rails.application.config.secret_key_base = ENV["SECRET_KEY_BASE"]
  puts "DEBUG: Set secret_key_base"
end

# Initialize the Rails application.
Rails.application.initialize!
