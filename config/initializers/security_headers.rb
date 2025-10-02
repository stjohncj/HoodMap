# Security headers configuration for production
if Rails.env.production?
  Rails.application.config.force_ssl = true

  # Additional security headers
  Rails.application.config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    policy.script_src  :self, :https, :unsafe_inline, "https://maps.googleapis.com", "https://use.fontawesome.com"
    policy.style_src   :self, :https, :unsafe_inline
    policy.connect_src :self, :https

    # Allow Google Maps
    policy.frame_src "https://maps.googleapis.com"
  end

  # Ensure HTTPS is enforced at the application level
  Rails.application.config.session_store :cookie_store,
    key: '_hood_map_session',
    secure: true,
    httponly: true,
    same_site: :lax
end