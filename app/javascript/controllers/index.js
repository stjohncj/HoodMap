// Import and register all your controllers from the importmap via controllers/**/*_controller
import { application } from "./application"
import GalleryController from "./gallery_controller"

// Register controllers
application.register("gallery", GalleryController)
