namespace :markers do
  desc "Generate static marker SVG files"
  task generate: :environment do
    # Color schemes
    colors = {
      "blue" => {
        house: "#4F317D",
        interior: "#FFB920",
        text: "#FFFFFF"
      },
      "gold" => {
        house: "#FFB920",
        interior: "#FFF5E6",
        text: "#4F317D"
      }
    }

    # Generate markers for numbers 1-50 in both colors
    (1..50).each do |number|
      colors.each do |color_name, scheme|
        svg_content = <<~SVG
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <!-- Drop shadow -->
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
              </filter>
            </defs>

            <!-- House background/interior -->
            <path d="M14,24H34V36H14V24Z" fill="#{scheme[:interior]}" filter="url(#shadow)"/>

            <!-- House outline -->
            <path d="M24,10L39,24H34V36H27V26H21V36H14V24H9L24,10Z" fill="none" stroke="#{scheme[:house]}" stroke-width="2.5" filter="url(#shadow)"/>

            <!-- Door -->
            <rect x="21" y="27" width="6" height="9" fill="#{scheme[:house]}"/>

            <!-- Number circle -->
            <circle cx="24" cy="20" r="8" fill="#{scheme[:house]}" stroke="white" stroke-width="1"/>

            <!-- Number text -->
            <text x="24" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#{scheme[:text]}">#{number}</text>
          </svg>
        SVG

        filename = "public/markers/house_#{color_name}_#{number}.svg"
        File.write(filename, svg_content)
        puts "Generated #{filename}"
      end
    end

    puts "\nGenerated #{50 * colors.length} marker files in public/markers/"
  end
end