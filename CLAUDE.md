# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Rails 8 application for displaying a historic district map with interactive site markers. The application centers around the Marquette Historic District and allows users to explore historic sites through an interactive Google Maps interface.

## Core Architecture

- **Backend**: Rails 8 with SQLite database
- **Frontend**: Hotwire (Turbo + Stimulus) with vanilla JavaScript for Google Maps integration
- **Styling**: CSS with Propshaft asset pipeline
- **JavaScript**: ES6 modules with importmap-rails (no bundling)

### Key Models

- `Site` - Core model representing historic sites with geolocation data (app/models/site.rb:21)
  - Has attached images with Active Storage
  - Contains historic metadata: name, address, owner info, architectural details
  - Includes latitude/longitude for map positioning

### Controllers & Routes

- `MapsController` - Primary controller for map display (app/controllers/maps_controller.rb:1)
  - `historic_district` action: Main map view with all sites
  - `house` action: Individual site detail view
- Root route: `maps#historic_district` 
- Site detail route: `/houses/:id`

### Frontend Architecture

- **Google Maps Integration**: Custom JavaScript in app/javascript/map.js handles:
  - Map initialization with custom markers
  - Site data loaded from HTML data attributes
  - Interactive hover states and click navigation
- **Stimulus Controllers**: 
  - `gallery_controller.js` - Handles image display functionality
- **Asset Pipeline**: Uses Propshaft with separate CSS files for map-specific styling

## Development Commands

### Database
```bash
# Run migrations
bin/rails db:migrate

# Seed database
bin/rails db:seed

# Reset database
bin/rails db:reset
```

### Server
```bash
# Start development server
bin/rails server

# Start with specific port
bin/rails server -p 3000
```

### Testing
```bash
# Run all tests
bin/rails test

# Run specific test file
bin/rails test test/models/site_test.rb

# Run system tests
bin/rails test:system
```

### Code Quality
```bash
# Run RuboCop (Rails Omakase style)
bundle exec rubocop

# Run Brakeman security scanner
bundle exec brakeman

# Auto-annotate models
bundle exec annotate
```

### Console
```bash
# Rails console
bin/rails console

# Database console
bin/rails dbconsole
```

## Key Dependencies

- **Rails 8.0.1** - Main framework
- **Stimulus** - JavaScript framework for interactions
- **Turbo** - SPA-like navigation
- **Active Storage** - File attachments for site images
- **Google Maps JavaScript API** - Map functionality
- **@stimulus-components/lightbox** - Image gallery component

## Database Schema

Sites table includes historic preservation fields:
- Location: latitude, longitude, address
- Historic data: historic_name, built_year, survey_year
- People: original_owner, current_owner, architect
- Details: description, architectural_style

## File Structure Notes

- Map-specific JavaScript: `app/javascript/map.js`
- Map styling: `app/assets/stylesheets/map.css`
- Site images stored via Active Storage
- Custom marker icon: `app/assets/images/marker-house.svg`
- Main map view: `app/views/maps/historic_district.html.erb`

## Google Maps Integration

The application uses Google Maps JavaScript API with:
- Custom map ID: "MARQUETTE_HISTORIC_DISTRICT"
- Advanced markers with custom content
- Hover interactions showing site details
- Click navigation to individual site pages