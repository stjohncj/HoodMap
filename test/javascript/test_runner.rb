# Simple test runner for JavaScript functionality
# This integrates with Rails test suite

require "test_helper"

class JavaScriptFunctionalityTest < ActiveSupport::TestCase
  test "map.ts compiles without TypeScript errors" do
    # Check if the TypeScript file can be built successfully
    result = system("yarn build 2>&1")
    assert result, "TypeScript compilation should succeed"
  end

  test "map JavaScript constants are properly defined" do
    # Read the compiled JavaScript file
    map_js_path = Rails.root.join("app", "assets", "builds", "map.js")

    if File.exist?(map_js_path)
      map_content = File.read(map_js_path)

      # Check for key constants
      assert_includes map_content, "MAP_ZOOM_INITIAL", "Should contain zoom initial constant"
      assert_includes map_content, "MAP_ZOOM_MIN_AFTER_BOUNDS", "Should contain min zoom constant"
      assert_includes map_content, "MAP_BOUNDING_ZOOM_MAX", "Should contain max zoom constant"
    else
      skip "Compiled JavaScript file not found. Run 'yarn build' first."
    end
  end

  test "TypeScript types are properly defined" do
    # Read the TypeScript source file
    map_ts_path = Rails.root.join("app", "javascript", "map.ts")
    map_content = File.read(map_ts_path)

    # Check for TypeScript type annotations
    assert_includes map_content, ": number", "Should contain number type annotations"
    assert_includes map_content, ": Promise<void>", "Should contain Promise return types"
    assert_includes map_content, ": string", "Should contain string type annotations"
    assert_includes map_content, ": HTMLElement", "Should contain HTMLElement types"
    assert_includes map_content, "google.maps", "Should use Google Maps types"
  end

  test "map functionality has proper error handling" do
    map_ts_path = Rails.root.join("app", "javascript", "map.ts")
    map_content = File.read(map_ts_path)

    # Check for error handling patterns
    assert_includes map_content, "try {", "Should contain try-catch blocks"
    assert_includes map_content, "catch", "Should contain catch blocks"
    assert_includes map_content, "console.error", "Should log errors"
    assert_includes map_content, "console.warn", "Should log warnings"
  end

  test "modal functionality is properly implemented" do
    map_ts_path = Rails.root.join("app", "javascript", "map.ts")
    map_content = File.read(map_ts_path)

    # Check for modal functions
    assert_includes map_content, "showSiteModal", "Should contain showSiteModal function"
    assert_includes map_content, "closeSiteModal", "Should contain closeSiteModal function"
    assert_includes map_content, "exitFullscreenIfActive", "Should contain fullscreen exit function"
  end

  test "Google Maps integration is properly typed" do
    map_ts_path = Rails.root.join("app", "javascript", "map.ts")
    map_content = File.read(map_ts_path)

    # Check for Google Maps API usage with types
    assert_includes map_content, "google.maps.importLibrary", "Should use importLibrary"
    assert_includes map_content, "AdvancedMarkerElement", "Should use AdvancedMarkerElement"
    assert_includes map_content, "LatLngBounds", "Should use LatLngBounds"
    assert_includes map_content, "LatLngLiteral", "Should use LatLngLiteral type"
  end

  test "event listeners are properly set up" do
    map_ts_path = Rails.root.join("app", "javascript", "map.ts")
    map_content = File.read(map_ts_path)

    # Check for event listeners
    assert_includes map_content, "addEventListener", "Should set up event listeners"
    assert_includes map_content, "DOMContentLoaded", "Should listen for DOM ready"
    assert_includes map_content, "turbo:load", "Should listen for Turbo events"
    assert_includes map_content, "keydown", "Should listen for keyboard events"
  end

  test "TypeScript configuration is valid" do
    tsconfig_path = Rails.root.join("tsconfig.json")
    assert File.exist?(tsconfig_path), "tsconfig.json should exist"

    tsconfig_content = File.read(tsconfig_path)
    config = JSON.parse(tsconfig_content)

    assert config["compilerOptions"], "Should have compiler options"
    assert config["compilerOptions"]["strict"], "Should have strict mode enabled"
    assert config["include"], "Should specify include paths"
    assert_includes config["include"], "app/javascript/**/*", "Should include JavaScript directory"
  end

  test "build script handles TypeScript files" do
    package_json_path = Rails.root.join("package.json")

    if File.exist?(package_json_path)
      package_content = File.read(package_json_path)
      package_data = JSON.parse(package_content)

      build_script = package_data.dig("scripts", "build")
      assert build_script, "Should have build script"
      assert_includes build_script, "--loader:.ts=ts", "Should handle TypeScript files"
    else
      skip "package.json not found"
    end
  end
end
