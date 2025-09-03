require "csv"

namespace :sites do
  desc "Import sites from CSV file at db/mhd.csv"
  task import: :environment do
    csv_file = Rails.root.join("db", "mhd.csv")

    unless File.exist?(csv_file)
      puts "ERROR: CSV file not found at #{csv_file}"
      exit 1
    end

    puts "Starting CSV import from #{csv_file}..."
    puts "=" * 50

    new_records = 0
    updated_records = 0
    errors = []

    CSV.foreach(csv_file, headers: true, encoding: "utf-8") do |row|
      # Skip empty rows (handle BOM in first column name)
      name_key = row.headers.first # This will be "﻿Name" with BOM
      next if row[name_key].blank? && row["Address"].blank?

      # Extract data from CSV row
      historic_name = row[name_key]&.strip
      built_year = parse_year(row["Date Built"])
      address = row["Address"]&.strip
      lat_lng = row["Latitude/Longitude"]&.strip
      description = row["Description"]&.strip

      # Skip if no address (required for upsert logic)
      next if address.blank?

      # Parse latitude and longitude
      latitude, longitude = parse_lat_lng(lat_lng)

      begin
        # Find existing site by address or create new one
        site = Site.find_by(address: address)

        if site
          # Update existing record
          site.update!(
            historic_name: historic_name,
            built_year: built_year,
            latitude: latitude,
            longitude: longitude,
            description: description
          )
          updated_records += 1
          puts "✓ Updated: #{historic_name || address}"
        else
          # Create new record
          site = Site.create!(
            historic_name: historic_name,
            built_year: built_year,
            address: address,
            latitude: latitude,
            longitude: longitude,
            description: description
          )
          new_records += 1
          puts "✓ Created: #{historic_name || address}"
        end

        # Attach images from site_pics directory
        attach_site_images(site, address)

      rescue => e
        error_msg = "Error processing '#{historic_name || address}': #{e.message}"
        errors << error_msg
        puts "✗ #{error_msg}"
      end
    end

    puts "=" * 50
    puts "Import completed!"
    puts "New records created: #{new_records}"
    puts "Existing records updated: #{updated_records}"
    puts "Total processed: #{new_records + updated_records}"

    if errors.any?
      puts ""
      puts "Errors encountered:"
      errors.each { |error| puts "  - #{error}" }
    end
  end

  private

  def attach_site_images(site, address)
    # Convert address to underscored format
    # Example: "1003 Milwaukee Street" -> "1003_Milwaukee_Street"
    underscored_address = address.gsub(" ", "_")

    # Build path to site_pics directory
    pics_dir = Rails.root.join("db", "site_pics", underscored_address)

    # Check if directory exists
    if Dir.exist?(pics_dir)
      # Get all image files in the directory
      image_files = Dir.glob(File.join(pics_dir, "*")).select do |file|
        File.file?(file) && file.match?(/\.(jpg|jpeg|png|gif|webp)/i)
      end

      if image_files.any?
        # Purge existing images to avoid duplicates
        site.images.purge if site.images.attached?

        # Sort images by file size (largest first) to make largest image the featured image
        image_files_sorted = image_files.sort_by { |file| -File.size(file) }
        
        # Attach each image (largest first)
        image_files_sorted.each_with_index do |image_path, index|
          filename = File.basename(image_path)
          file_size_kb = (File.size(image_path) / 1024.0).round(1)
          
          site.images.attach(
            io: File.open(image_path),
            filename: filename,
            content_type: "image/#{File.extname(image_path).delete('.').downcase}"
          )
          
          status_indicator = index == 0 ? "→ Featured" : "→ Attached"
          puts "  #{status_indicator} image: #{filename} (#{file_size_kb} KB)"
        end

        puts "  ✓ Attached #{image_files.count} image(s) for #{address}"
      else
        puts "  ⚠ No image files found in #{pics_dir}"
      end
    else
      puts "  ⚠ No image directory found at #{pics_dir}"
    end
  rescue => e
    puts "  ✗ Error attaching images for #{address}: #{e.message}"
  end

  def parse_year(year_string)
    return nil if year_string.blank?

    # Extract 4-digit year from string like "1909" or "1928-1929"
    year_match = year_string.match(/(\d{4})/)
    year_match ? year_match[1].to_i : nil
  end

  def parse_lat_lng(lat_lng_string)
    return [ nil, nil ] if lat_lng_string.blank?

    # Split by comma and clean up whitespace
    parts = lat_lng_string.split(",").map(&:strip)

    if parts.length == 2
      begin
        latitude = Float(parts[0])
        longitude = Float(parts[1])
        [ latitude, longitude ]
      rescue ArgumentError
        puts "  Warning: Could not parse coordinates '#{lat_lng_string}'"
        [ nil, nil ]
      end
    else
      puts "  Warning: Invalid coordinate format '#{lat_lng_string}'"
      [ nil, nil ]
    end
  end
end
