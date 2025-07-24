import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="gallery"
export default class extends Controller {
  connect() {
  }
  display() {
    console.log('display clicked image')
  }

}
