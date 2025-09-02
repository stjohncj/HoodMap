Rails.application.routes.draw do
  resources :sites
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "main#index", as: :historic_district_map
  get "houses/:id" => "maps#house", as: :house
  get "modal/houses/:id" => "maps#house_modal", as: :house_modal
  
  # Historic district information pages
  get "kewaunee-history" => "info_pages#kewaunee_history", as: :kewaunee_history
  get "mhd-history" => "info_pages#mhd_history", as: :mhd_history
  get "mhd-architecture" => "info_pages#mhd_architecture", as: :mhd_architecture
end
