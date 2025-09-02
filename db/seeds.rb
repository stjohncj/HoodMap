# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Load the Rails application's rake tasks if not already loaded
Rails.application.load_tasks unless defined?(Rake::Task) && Rake::Task.task_defined?("sites:import")

# Call the sites:import rake task
# The task itself will output progress messages
Rake::Task["sites:import"].invoke
