require "csv"

namespace :sites do
  desc "Create directories in db/site_pics for each site address from CSV"
  task create_directories: :environment do
    csv_file = Rails.root.join("db", "mhd.csv")
    site_pics_dir = Rails.root.join("db", "site_pics")

    unless File.exist?(csv_file)
      puts "ERROR: CSV file not found at #{csv_file}"
      exit 1
    end

    puts "🏠 Creating site picture directories..."
    puts "=" * 50

    # Ensure the main site_pics directory exists
    FileUtils.mkdir_p(site_pics_dir) unless Dir.exist?(site_pics_dir)

    created_directories = 0
    existing_directories = 0
    errors = []

    CSV.foreach(csv_file, headers: true, encoding: "utf-8") do |row|
      # Handle BOM in first column name
      name_key = row.headers.first
      next if row[name_key].blank? && row["Address"].blank?

      address = row["Address"]&.strip
      next if address.blank?

      # Sanitize the address for use as a directory name
      sanitized_address = sanitize_directory_name(address)
      directory_path = site_pics_dir.join(sanitized_address)

      begin
        if Dir.exist?(directory_path)
          existing_directories += 1
          puts "✓ Exists: #{sanitized_address}"
        else
          FileUtils.mkdir_p(directory_path)
          created_directories += 1
          puts "✓ Created: #{sanitized_address}"
        end

      rescue => e
        error_msg = "Error creating directory for '#{address}': #{e.message}"
        errors << error_msg
        puts "✗ #{error_msg}"
      end
    end

    puts "=" * 50
    puts "🎉 Directory creation completed!"
    puts "New directories created: #{created_directories}"
    puts "Existing directories found: #{existing_directories}"
    puts "Total directories: #{created_directories + existing_directories}"

    if errors.any?
      puts ""
      puts "Errors encountered:"
      errors.each { |error| puts "  - #{error}" }
    end

    puts ""
    puts "Directory structure created at: #{site_pics_dir}"
    puts "You can now add site pictures to each directory!"
  end

  private

  def sanitize_directory_name(address)
    # Replace spaces with underscores, remove invalid characters
    # Keep alphanumeric, spaces, and common address characters
    sanitized = address.gsub(/[^\w\s\-.]/, "")
                     .gsub(/\s+/, "_")
                     .gsub(/_+/, "_")
                     .strip
                     .gsub(/^_|_$/, "")

    # Ensure it's not empty
    sanitized.empty? ? "unknown_address" : sanitized
  end
end
