# frozen_string_literal: true

namespace :images do
  desc "Optimize images in db/site_pics for web delivery (resize, compress, strip metadata)"
  task :optimize, [ :max_dimension, :quality ] => :environment do |_t, args|
    require "fileutils"

    # Default settings for web optimization
    max_dimension = (args[:max_dimension] || 2000).to_i
    quality = (args[:quality] || 85).to_i

    site_pics_dir = Rails.root.join("db", "site_pics")

    unless Dir.exist?(site_pics_dir)
      puts "Error: #{site_pics_dir} does not exist"
      exit 1
    end

    # Check for ImageMagick
    unless system("which magick > /dev/null 2>&1")
      puts "Error: ImageMagick (magick) is required but not found"
      puts "Install with: brew install imagemagick"
      exit 1
    end

    puts "=" * 60
    puts "IMAGE OPTIMIZATION FOR WEB DELIVERY"
    puts "=" * 60
    puts "Settings:"
    puts "  Max dimension: #{max_dimension}px"
    puts "  JPEG quality: #{quality}%"
    puts "  Source: #{site_pics_dir}"
    puts "=" * 60
    puts

    # Track statistics
    stats = {
      total_files: 0,
      optimized: 0,
      skipped: 0,
      errors: 0,
      original_size: 0,
      optimized_size: 0
    }

    # Create backup directory
    backup_dir = Rails.root.join("db", "site_pics_backup_#{Time.current.strftime('%Y%m%d_%H%M%S')}")

    # Process each site directory
    Dir.glob(site_pics_dir.join("*")).sort.each do |site_dir|
      next unless File.directory?(site_dir)

      site_name = File.basename(site_dir)

      # Find all image files (uniq to handle case-insensitive filesystems)
      image_files = Dir.glob(File.join(site_dir, "*.{jpg,jpeg,png,JPG,JPEG,PNG}")).uniq
      next if image_files.empty?

      puts "Processing: #{site_name}"

      image_files.each do |image_path|
        stats[:total_files] += 1
        filename = File.basename(image_path)
        original_size = File.size(image_path)
        stats[:original_size] += original_size

        # Get image dimensions
        dimensions = `magick identify -format "%wx%h" "#{image_path}" 2>/dev/null`.strip
        if dimensions.empty?
          puts "  ⚠ Skipped (can't read): #{filename}"
          stats[:skipped] += 1
          next
        end

        width, height = dimensions.split("x").map(&:to_i)
        max_current = [ width, height ].max

        # Skip if already optimized (smaller than target)
        if max_current <= max_dimension && original_size < 500_000
          puts "  ✓ Already optimized: #{filename} (#{format_size(original_size)})"
          stats[:skipped] += 1
          stats[:optimized_size] += original_size
          next
        end

        # Create backup on first optimization
        unless Dir.exist?(backup_dir)
          FileUtils.mkdir_p(backup_dir)
          puts "\nCreating backup at: #{backup_dir}\n"
        end

        # Backup this site's directory if not already done
        backup_site_dir = File.join(backup_dir, site_name)
        unless Dir.exist?(backup_site_dir)
          FileUtils.mkdir_p(backup_site_dir)
        end

        # Backup the original file
        backup_path = File.join(backup_site_dir, filename)
        FileUtils.cp(image_path, backup_path) unless File.exist?(backup_path)

        # Optimize the image
        # - Resize to max dimension while maintaining aspect ratio
        # - Set JPEG quality
        # - Strip EXIF/metadata
        # - Auto-orient based on EXIF orientation
        cmd = [
          "magick",
          "\"#{image_path}\"",
          "-auto-orient",
          "-resize", "#{max_dimension}x#{max_dimension}>",
          "-strip",
          "-quality", quality.to_s,
          "-sampling-factor", "4:2:0",
          "-interlace", "Plane",
          "\"#{image_path}\""
        ].join(" ")

        if system(cmd)
          new_size = File.size(image_path)
          stats[:optimized_size] += new_size
          stats[:optimized] += 1

          savings = original_size - new_size
          savings_pct = (savings.to_f / original_size * 100).round(1)

          puts "  ✓ Optimized: #{filename}"
          puts "    #{format_size(original_size)} → #{format_size(new_size)} (saved #{savings_pct}%)"
        else
          puts "  ✗ Error optimizing: #{filename}"
          stats[:errors] += 1
          stats[:optimized_size] += original_size
        end
      end

      puts
    end

    # Print summary
    puts "=" * 60
    puts "OPTIMIZATION COMPLETE"
    puts "=" * 60
    puts "Files processed: #{stats[:total_files]}"
    puts "  Optimized: #{stats[:optimized]}"
    puts "  Skipped: #{stats[:skipped]}"
    puts "  Errors: #{stats[:errors]}"
    puts
    puts "Total size before: #{format_size(stats[:original_size])}"
    puts "Total size after:  #{format_size(stats[:optimized_size])}"

    if stats[:original_size] > 0
      total_savings = stats[:original_size] - stats[:optimized_size]
      total_pct = (total_savings.to_f / stats[:original_size] * 100).round(1)
      puts "Total saved:       #{format_size(total_savings)} (#{total_pct}%)"
    end

    if Dir.exist?(backup_dir)
      puts
      puts "Backup saved to: #{backup_dir}"
    end
  end

  desc "Show statistics about images in db/site_pics"
  task stats: :environment do
    site_pics_dir = Rails.root.join("db", "site_pics")

    unless Dir.exist?(site_pics_dir)
      puts "Error: #{site_pics_dir} does not exist"
      exit 1
    end

    puts "=" * 60
    puts "IMAGE STATISTICS"
    puts "=" * 60
    puts

    total_files = 0
    total_size = 0
    sizes = []
    dimensions = []

    Dir.glob(site_pics_dir.join("*")).sort.each do |site_dir|
      next unless File.directory?(site_dir)

      image_files = Dir.glob(File.join(site_dir, "*.{jpg,jpeg,png,JPG,JPEG,PNG}")).uniq
      next if image_files.empty?

      image_files.each do |image_path|
        total_files += 1
        size = File.size(image_path)
        total_size += size
        sizes << size

        # Get dimensions if magick is available
        if system("which magick > /dev/null 2>&1")
          dim = `magick identify -format "%wx%h" "#{image_path}" 2>/dev/null`.strip
          unless dim.empty?
            w, h = dim.split("x").map(&:to_i)
            dimensions << [ w, h ].max
          end
        end
      end
    end

    if total_files == 0
      puts "No images found"
      exit 0
    end

    puts "Total images: #{total_files}"
    puts "Total size: #{format_size(total_size)}"
    puts "Average size: #{format_size(total_size / total_files)}"
    puts "Smallest: #{format_size(sizes.min)}"
    puts "Largest: #{format_size(sizes.max)}"

    if dimensions.any?
      puts
      puts "Dimensions (max side):"
      puts "  Smallest: #{dimensions.min}px"
      puts "  Largest: #{dimensions.max}px"
      puts "  Average: #{(dimensions.sum / dimensions.size).round}px"

      oversized = dimensions.count { |d| d > 2000 }
      puts "  Over 2000px: #{oversized} (#{(oversized.to_f / total_files * 100).round(1)}%)"
    end

    # Size distribution
    puts
    puts "Size distribution:"
    under_100k = sizes.count { |s| s < 100_000 }
    under_500k = sizes.count { |s| s >= 100_000 && s < 500_000 }
    under_1m = sizes.count { |s| s >= 500_000 && s < 1_000_000 }
    over_1m = sizes.count { |s| s >= 1_000_000 }

    puts "  Under 100KB: #{under_100k}"
    puts "  100KB - 500KB: #{under_500k}"
    puts "  500KB - 1MB: #{under_1m}"
    puts "  Over 1MB: #{over_1m}"
  end

  def format_size(bytes)
    if bytes >= 1_000_000_000
      "#{(bytes / 1_000_000_000.0).round(2)} GB"
    elsif bytes >= 1_000_000
      "#{(bytes / 1_000_000.0).round(2)} MB"
    elsif bytes >= 1_000
      "#{(bytes / 1_000.0).round(1)} KB"
    else
      "#{bytes} B"
    end
  end
end
