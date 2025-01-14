class CreateSites < ActiveRecord::Migration[8.0]
  def change
    create_table :sites do |t|
      t.string :historic_name
      t.string :address
      t.string :original_owner
      t.string :current_owner
      t.text :description
      t.string :architect
      t.string :architectural_style
      t.decimal :latitude
      t.decimal :longitude
      t.integer :survey_year
      t.integer :built_year

      t.timestamps
    end
  end
end
