/**
 * Products Data
 * A product is split in two parts:
 *   - the catalog record (SKU: brand, variant, size, barcode, ...), shared by every store;
 *   - the store inventory (stock, minimum, price, supplier, location, batches), different in each store.
 * The store part is generated from the store record, so a store always shows the same numbers, and its low-stock
 * and out-of-stock SKUs match the counters shown on the Overview tab.
 */

(function() {
  'use strict';

  var TODAY = new Date(2026, 11, 10);
  var DAY = 86400000;

  // Expiry profiles: [shortest, longest] days to expiry of a batch, and when it counts as "near expiry"
  var PROFILES = {
    dry: { range: [90, 600], near: 30 }, uht: { range: [40, 150], near: 30 }, frozen: { range: [30, 200], near: 30 },
    dairy: { range: [3, 25], near: 7 }, fresh: { range: [1, 6], near: 7 }, meat: { range: [2, 9], near: 7 }, none: null
  };
  var AISLES = { 'Produce': 1, 'Bakery': 2, 'Butcher': 3, 'Fish Counter': 3, 'Dairy': 4, 'Chilled & Frozen': 5, 'Grocery': 6, 'Beverages': 9, 'Cleaning': 10, 'Health & Beauty': 11, 'Pet Shop': 12, 'Checkout': 13 };
  // The usual supplier of each area (every store has its own contract, but the kind of supplier is the same)
  var SUPPLIER_BY_AREA = {
    'Produce': 'Green Valley Produce', 'Dairy': 'Blue Ridge Dairy', 'Beverages': 'Coastal Beverages', 'Bakery': 'Trigal Industrial Bakery',
    'Butcher': 'Good Harvest Farm', 'Fish Counter': 'Good Harvest Farm', 'Chilled & Frozen': 'Good Harvest Farm'
  };

  var POSITIONS = ['Top shelf', 'Middle shelf', 'Bottom shelf'];

  // Products, each sold in at least three versions (SKUs). A product shares its category, expiry profile, allergens, storage
  // and ingredients; each version has its own brand, variant, size, package, units per case (0 = sold loose) and base price.
  // [name, category path, area, expiry profile, allergens, storage, ingredients, [[brand, variant, size, package, units per case, price], ...]]
  var PRODUCTS = [
    ['Chocolate drink powder', 'Grocery > Beverages > Chocolate drinks', 'Grocery', 'dry', 'Contains milk and soy', 'Keep in a cool, dry place', 'Sugar, cocoa powder, maltodextrin, minerals, soy lecithin emulsifier',
      [['Choco Vita', 'Classic', '370 g', 'Can', 12, 9.99], ['Choco Vita', 'Classic', '700 g', 'Pack', 12, 15.49], ['Cocoa Mill', 'Classic', '400 g', 'Pack', 12, 8.49], ['Cocoa Mill', 'Zero sugar', '200 g', 'Pack', 12, 9.29]]],
    ['White rice', 'Grocery > Grains > Rice', 'Grocery', 'dry', 'None', 'Keep in a cool, dry place', 'Milled rice',
      [['Golden Grain', 'Grade 1', '5 kg', 'Bag', 6, 29.9], ['Harvest Table', 'Grade 1', '1 kg', 'Bag', 20, 6.79], ['Prairie Gold', 'Grade 1', '2 kg', 'Bag', 10, 12.5]]],
    ['Carioca beans', 'Grocery > Grains > Beans', 'Grocery', 'dry', 'None', 'Keep in a cool, dry place', 'Carioca beans',
      [['Harvest Table', 'Grade 1', '1 kg', 'Bag', 20, 8.29], ['Golden Grain', 'Grade 1', '1 kg', 'Bag', 20, 8.99], ['Prairie Gold', 'Premium', '1 kg', 'Bag', 20, 9.49]]],
    ['Black beans', 'Grocery > Grains > Beans', 'Grocery', 'dry', 'None', 'Keep in a cool, dry place', 'Black beans',
      [['Harvest Table', 'Grade 1', '1 kg', 'Bag', 20, 9.19], ['Golden Grain', 'Grade 1', '1 kg', 'Bag', 20, 9.69], ['Prairie Gold', 'Grade 1', '500 g', 'Bag', 20, 5.49]]],
    ['Sugar', 'Grocery > Sweeteners > Sugar', 'Grocery', 'dry', 'None', 'Keep in a cool, dry place', 'Sugar',
      [['Sweet Cane', 'Refined', '1 kg', 'Bag', 10, 4.99], ['Sweet Cane', 'Refined', '5 kg', 'Bag', 4, 21.9], ['Golden Grain', 'Crystal', '1 kg', 'Bag', 10, 5.29]]],
    ['Ground roasted coffee', 'Grocery > Coffee > Roasted coffee', 'Grocery', 'dry', 'May contain gluten', 'Keep tightly closed after opening', 'Roasted and ground coffee',
      [['Morning Roast', 'Classic', '500 g', 'Vacuum pack', 12, 18.9], ['Morning Roast', 'Strong', '250 g', 'Vacuum pack', 20, 11.9], ['Cocoa Mill', 'Smooth', '500 g', 'Vacuum pack', 12, 17.5]]],
    ['Spaghetti', 'Grocery > Pasta > Spaghetti', 'Grocery', 'dry', 'Contains gluten', 'Keep in a cool, dry place', 'Durum wheat semolina, eggs',
      [['Pasta Nonna', 'No. 5', '500 g', 'Pack', 20, 7.49], ['Harvest Table', 'No. 8', '500 g', 'Pack', 20, 5.99], ['Golden Grain', 'No. 5', '1 kg', 'Pack', 10, 10.9]]],
    ['Soybean oil', 'Grocery > Oils > Soybean', 'Grocery', 'dry', 'Contains soy', 'Keep away from light and heat', 'Refined soybean oil',
      [['Sunfield', 'Refined', '900 ml', 'PET bottle', 20, 7.99], ['Harvest Table', 'Refined', '900 ml', 'PET bottle', 20, 7.49], ['Prairie Gold', 'Refined', '900 ml', 'PET bottle', 20, 7.69]]],
    ['Sandwich cookies', 'Grocery > Biscuits > Sandwich cookies', 'Grocery', 'dry', 'Contains wheat, milk and soy', 'Keep in a cool, dry place', 'Wheat flour, sugar, cocoa, vegetable fat',
      [['Crunch Duo', 'Original', '90 g', 'Pack', 36, 3.49], ['Crunch Duo', 'Chocolate', '90 g', 'Pack', 36, 3.69], ['Cocoa Mill', 'Vanilla', '100 g', 'Pack', 36, 3.29], ['Crunch Duo', 'Original', '90 g', 'Pack', 12, 9.9, 3]]],
    ['Cola soft drink', 'Beverages > Soft drinks > Cola', 'Beverages', 'dry', 'None', 'Keep in a cool place', 'Carbonated water, sugar, kola nut extract',
      [['Cola Max', 'Original', '2 L', 'PET bottle', 6, 10.99], ['Cola Max', 'Zero sugar', '350 ml', 'Can', 12, 4.49], ['Bubble Co.', 'Original', '2 L', 'PET bottle', 6, 7.99], ['Bubble Co.', 'Zero sugar', '350 ml', 'Can', 12, 3.79], ['Cola Max', 'Original', '350 ml', 'Can', 12, 4.49], ['Cola Max', 'Original', '350 ml', 'Can', 2, 23.9, 6], ['Cola Max', 'Zero sugar', '350 ml', 'Can', 2, 24.9, 6]]],
    ['Orange juice', 'Beverages > Juices > Orange', 'Beverages', 'uht', 'None', 'Refrigerate after opening', 'Orange juice',
      [['Citrus Grove', '100% juice', '1 L', 'Carton', 12, 8.99], ['Citrus Grove', 'Light', '1 L', 'Carton', 12, 8.49], ['Fresh Squeeze', '100% juice', '900 ml', 'Carton', 12, 9.49]]],
    ['Mineral water', 'Beverages > Water > Mineral', 'Beverages', 'dry', 'None', 'Keep in a cool place', 'Natural mineral water',
      [['Clear Spring', 'Still', '1.5 L', 'PET bottle', 6, 3.29], ['Clear Spring', 'Sparkling', '500 ml', 'PET bottle', 12, 2.99], ['Glacier Source', 'Still', '5 L', 'PET bottle', 4, 9.9], ['Clear Spring', 'Still', '1.5 L', 'PET bottle', 1, 17.9, 6]]],
    ['Pilsner beer', 'Beverages > Beer > Pilsner', 'Beverages', 'dry', 'Contains gluten', 'Keep in a cool place', 'Water, barley malt, hops',
      [['Lager Gold', 'Pilsner', '350 ml', 'Can', 12, 3.99], ['Lager Gold', 'Pilsner', '600 ml', 'Bottle', 12, 7.49], ['Hop Valley', 'Pilsner', '350 ml', 'Can', 12, 3.69], ['Lager Gold', 'Pilsner', '350 ml', 'Can', 2, 21.9, 6], ['Hop Valley', 'Pilsner', '350 ml', 'Can', 2, 20.9, 6]]],
    ['Whole milk', 'Dairy > Milk > Whole', 'Dairy', 'uht', 'Contains milk', 'Refrigerate after opening', 'Whole milk',
      [['Blue Meadow', 'Whole UHT', '1 L', 'Carton', 12, 5.49], ['Creamy Farm', 'Whole UHT', '1 L', 'Carton', 12, 5.19], ['Pasture Co.', 'Whole UHT', '1 L', 'Carton', 12, 4.99]]],
    ['Yogurt', 'Dairy > Yogurt > Plain', 'Dairy', 'dairy', 'Contains milk', 'Keep refrigerated at 1–5 °C', 'Milk, milk cultures',
      [['Creamy Farm', 'Plain', '170 g', 'Tub', 24, 3.19], ['Blue Meadow', 'Plain', '170 g', 'Tub', 24, 2.99], ['Alpine Cheese Co.', 'Greek', '160 g', 'Tub', 24, 4.49], ['Creamy Farm', 'Plain', '170 g', 'Tub', 6, 10.9, 4]]],
    ['Sliced mozzarella', 'Dairy > Cheese > Mozzarella', 'Dairy', 'dairy', 'Contains milk', 'Keep refrigerated at 1–5 °C', 'Milk, salt, milk culture, rennet',
      [['Alpine Cheese Co.', 'Sliced', '150 g', 'Vacuum pack', 20, 11.9], ['Blue Meadow', 'Sliced', '200 g', 'Vacuum pack', 20, 14.9], ['Creamy Farm', 'Sliced', '150 g', 'Vacuum pack', 20, 10.9]]],
    ['Butter', 'Dairy > Butter > Butter', 'Dairy', 'dairy', 'Contains milk', 'Keep refrigerated at 1–5 °C', 'Pasteurized cream, salt',
      [['Butter Hill', 'Salted', '200 g', 'Tub', 24, 12.49], ['Butter Hill', 'Unsalted', '200 g', 'Tub', 24, 12.49], ['Blue Meadow', 'Salted', '500 g', 'Tub', 12, 26.9]]],
    ['Creamy cheese spread', 'Dairy > Cheese spread > Creamy', 'Dairy', 'dairy', 'Contains milk', 'Keep refrigerated at 1–5 °C', 'Milk, cream, salt, stabilizers',
      [['Velvet Cream', 'Original', '220 g', 'Cup', 24, 9.49], ['Velvet Cream', 'Light', '220 g', 'Cup', 24, 9.99], ['Alpine Cheese Co.', 'Original', '200 g', 'Cup', 24, 8.99]]],
    ['Banana', 'Produce > Fruit > Bananas', 'Produce', 'fresh', 'None', 'Keep in a cool, ventilated place', '—',
      [['Loose', 'Prata', '1 kg', 'Loose', 0, 6.99], ['Loose', 'Nanica', '1 kg', 'Loose', 0, 5.99], ['Loose', 'Apple banana', '1 kg', 'Loose', 0, 8.49]]],
    ['Apple', 'Produce > Fruit > Apples', 'Produce', 'fresh', 'None', 'Keep refrigerated', '—',
      [['Loose', 'Gala', '1 kg', 'Loose', 0, 9.99], ['Loose', 'Fuji', '1 kg', 'Loose', 0, 10.99], ['Loose', 'Granny Smith', '1 kg', 'Loose', 0, 12.9]]],
    ['Tomato', 'Produce > Vegetables > Tomatoes', 'Produce', 'fresh', 'None', 'Keep in a cool, ventilated place', '—',
      [['Loose', 'Italian', '1 kg', 'Loose', 0, 7.49], ['Loose', 'Cherry', '250 g', 'Tray', 12, 6.99], ['Loose', 'Grape', '300 g', 'Tray', 12, 7.99]]],
    ['Lettuce', 'Produce > Leafy greens > Lettuce', 'Produce', 'fresh', 'None', 'Keep refrigerated', '—',
      [['Green Valley', 'Curly', '1 each', 'Each', 12, 3.99], ['Green Valley', 'Butterhead', '1 each', 'Each', 12, 4.49], ['Green Valley', 'Romaine', '1 each', 'Each', 12, 4.99]]],
    ['Potato', 'Produce > Vegetables > Potatoes', 'Produce', 'fresh', 'None', 'Keep in a cool, dark place', '—',
      [['Loose', 'Washed', '1 kg', 'Loose', 0, 5.99], ['Loose', 'Brushed', '1 kg', 'Loose', 0, 5.49], ['Loose', 'Baby', '1 kg', 'Loose', 0, 8.99]]],
    ['Onion', 'Produce > Vegetables > Onions', 'Produce', 'fresh', 'None', 'Keep in a cool, ventilated place', '—',
      [['Loose', 'Yellow', '1 kg', 'Loose', 0, 4.99], ['Loose', 'Red', '1 kg', 'Loose', 0, 6.49], ['Loose', 'White', '1 kg', 'Loose', 0, 5.49]]],
    ['French bread roll', 'Bakery > Bread > French roll', 'Bakery', 'fresh', 'Contains gluten', 'Consume on the same day', 'Wheat flour, water, salt, yeast',
      [['QuickCart Market Bakery', 'Classic', '1 kg', 'Loose', 0, 18.9], ['QuickCart Market Bakery', 'Whole wheat', '1 kg', 'Loose', 0, 21.9], ['QuickCart Market Bakery', 'Seeded', '1 kg', 'Loose', 0, 23.9]]],
    ['Cornmeal cake', 'Bakery > Cakes > Cornmeal', 'Bakery', 'fresh', 'Contains gluten, eggs and milk', 'Consume within 3 days', 'Cornmeal, sugar, eggs, milk, oil',
      [['QuickCart Market Bakery', 'Classic', '400 g', 'Package', 6, 14.9], ['QuickCart Market Bakery', 'With cheese', '400 g', 'Package', 6, 16.9], ['Soft Slice', 'Classic', '300 g', 'Package', 6, 11.9]]],
    ['Sliced bread', 'Bakery > Packaged bread > Sliced', 'Bakery', 'dairy', 'Contains gluten and soy', 'Keep in a cool, dry place', 'Wheat flour, water, sugar, salt, yeast',
      [['Soft Slice', 'Classic', '500 g', 'Bag', 12, 8.99], ['Soft Slice', 'Whole grain', '500 g', 'Bag', 12, 9.99], ['Harvest Table', 'Classic', '500 g', 'Bag', 12, 7.99]]],
    ['Striploin steak', 'Butcher > Beef > Striploin', 'Butcher', 'meat', 'None', 'Keep refrigerated at 0–4 °C', 'Beef',
      [['Prime Ranch', 'Chilled', '1 kg', 'Tray', 0, 54.9], ['Country Table', 'Chilled', '1 kg', 'Tray', 0, 49.9], ['Prime Ranch', 'Aged', '1 kg', 'Tray', 0, 69.9]]],
    ['Chicken breast', 'Butcher > Poultry > Breast', 'Butcher', 'meat', 'None', 'Keep refrigerated at 0–4 °C', 'Chicken meat',
      [['Farm Fresh', 'Boneless', '1 kg', 'Tray', 0, 21.9], ['Country Table', 'Boneless', '1 kg', 'Tray', 0, 19.9], ['Farm Fresh', 'Skin-on', '1 kg', 'Tray', 0, 17.9]]],
    ['Pork sausage', 'Butcher > Pork > Sausage', 'Butcher', 'meat', 'May contain gluten', 'Keep refrigerated at 0–4 °C', 'Pork, salt, seasoning',
      [['Country Table', 'Tuscan', '500 g', 'Pack', 12, 15.9], ['Farm Fresh', 'Tuscan', '500 g', 'Pack', 12, 14.9], ['Prime Ranch', 'Spicy', '500 g', 'Pack', 12, 17.9]]],
    ['Sliced ham', 'Chilled & Frozen > Deli > Ham', 'Chilled & Frozen', 'dairy', 'May contain milk', 'Keep refrigerated at 1–5 °C', 'Pork, salt, sugar, preservatives',
      [['Farm Fresh', 'Cooked', '200 g', 'Vacuum pack', 20, 9.99], ['Country Table', 'Cooked', '200 g', 'Vacuum pack', 20, 8.99], ['Prime Ranch', 'Smoked', '200 g', 'Vacuum pack', 20, 11.5]]],
    ['Frozen pizza', 'Chilled & Frozen > Frozen > Pizza', 'Chilled & Frozen', 'frozen', 'Contains gluten and milk', 'Keep frozen at -18 °C', 'Wheat flour, mozzarella cheese, tomato sauce',
      [['Farm Fresh', 'Mozzarella', '460 g', 'Box', 12, 19.9], ['Farm Fresh', 'Pepperoni', '460 g', 'Box', 12, 21.9], ['Frosty Land', 'Four cheese', '440 g', 'Box', 12, 20.9]]],
    ['Ice cream', 'Chilled & Frozen > Frozen > Ice cream', 'Chilled & Frozen', 'frozen', 'Contains milk and soy', 'Keep frozen at -18 °C', 'Milk, sugar, vegetable fat, cocoa, strawberry',
      [['Frosty Land', 'Neapolitan', '1.5 L', 'Tub', 6, 24.9], ['Frosty Land', 'Chocolate', '1.5 L', 'Tub', 6, 24.9], ['Creamy Farm', 'Vanilla', '1.5 L', 'Tub', 6, 22.9]]],
    ['Beef burger', 'Chilled & Frozen > Frozen > Burgers', 'Chilled & Frozen', 'frozen', 'Contains gluten', 'Keep frozen at -18 °C', 'Beef, soy protein, salt, seasoning',
      [['Farm Fresh', 'Beef', '672 g', 'Box', 12, 18.9], ['Country Table', 'Beef', '672 g', 'Box', 12, 17.9], ['Prime Ranch', 'Angus', '400 g', 'Box', 12, 24.9]]],
    ['Tilapia fillet', 'Fish Counter > Fish > Tilapia', 'Fish Counter', 'frozen', 'Contains fish', 'Keep frozen at -18 °C', 'Tilapia fillet',
      [['QuickCart Market Seafood', 'Frozen', '800 g', 'Tray', 6, 29.9], ['Blue Tide', 'Frozen', '1 kg', 'Tray', 6, 33.9], ['QuickCart Market Seafood', 'Fresh', '1 kg', 'Tray', 6, 38.9]]],
    ['Gray shrimp', 'Fish Counter > Seafood > Shrimp', 'Fish Counter', 'frozen', 'Contains crustaceans', 'Keep frozen at -18 °C', 'Shrimp',
      [['QuickCart Market Seafood', 'Medium', '500 g', 'Pack', 6, 39.9], ['QuickCart Market Seafood', 'Large', '500 g', 'Pack', 6, 49.9], ['Blue Tide', 'Medium', '400 g', 'Pack', 6, 34.9]]],
    ['Dish soap', 'Cleaning > Dishes > Dish soap', 'Cleaning', 'none', 'None', 'Keep out of reach of children', '—',
      [['Bright Home', 'Neutral', '500 ml', 'Bottle', 24, 2.79], ['Bright Home', 'Lemon', '500 ml', 'Bottle', 24, 2.89], ['Pure Clean', 'Neutral', '500 ml', 'Bottle', 24, 2.49], ['Bright Home', 'Neutral', '500 ml', 'Bottle', 8, 7.49, 3]]],
    ['Bleach', 'Cleaning > Bathroom > Bleach', 'Cleaning', 'none', 'None', 'Keep out of reach of children', '—',
      [['Pure Clean', 'Classic', '2 L', 'Bottle', 6, 6.99], ['Pure Clean', 'Classic', '1 L', 'Bottle', 12, 3.99], ['Bright Home', 'Classic', '2 L', 'Bottle', 6, 7.49]]],
    ['Laundry powder', 'Cleaning > Laundry > Powder', 'Cleaning', 'none', 'None', 'Keep in a dry place', '—',
      [['Fresh Wash', 'Perfect wash', '1.6 kg', 'Box', 6, 24.9], ['Fresh Wash', 'Sensitive', '1.6 kg', 'Box', 6, 26.9], ['Bright Home', 'Lavender', '2 kg', 'Box', 6, 21.9]]],
    ['Toilet paper', 'Cleaning > Paper > Toilet paper', 'Cleaning', 'none', 'None', 'Keep in a dry place', '—',
      [['Soft Cloud', 'Double ply', '30 m roll', 'Pack', 4, 17.9, 12], ['Soft Cloud', 'Triple ply', '30 m roll', 'Pack', 4, 19.9, 8], ['Bright Home', 'Single ply', '30 m roll', 'Pack', 4, 11.9, 12]]],
    ['Shampoo', 'Health & Beauty > Hair > Shampoo', 'Health & Beauty', 'none', 'None', 'Keep in a cool place', '—',
      [['Silk Hair', 'Perfect straight', '325 ml', 'Bottle', 12, 13.9], ['Silk Hair', 'Repair', '325 ml', 'Bottle', 12, 14.9], ['Gentle Touch', 'Nourish', '350 ml', 'Bottle', 12, 15.9]]],
    ['Bar soap', 'Health & Beauty > Bath > Soap', 'Health & Beauty', 'none', 'None', 'Keep in a dry place', '—',
      [['Gentle Touch', 'Original', '90 g', 'Bar', 48, 3.99], ['Gentle Touch', 'Sensitive', '90 g', 'Bar', 48, 4.29], ['Silk Hair', 'Aloe', '90 g', 'Bar', 48, 3.49]]],
    ['Toothpaste', 'Health & Beauty > Oral care > Toothpaste', 'Health & Beauty', 'none', 'None', 'Keep in a cool place', '—',
      [['Bright Smile', 'Total 12', '90 g', 'Tube', 48, 5.49], ['Bright Smile', 'Whitening', '90 g', 'Tube', 48, 6.49], ['Gentle Touch', 'Sensitive', '90 g', 'Tube', 48, 7.29]]],
    ['Adult dog food', 'Pet Shop > Dogs > Dry food', 'Pet Shop', 'dry', 'None', 'Keep in a cool, dry place', 'Corn, meat and bone meal, soy, vitamins',
      [['Happy Tails', 'Beef', '10.1 kg', 'Bag', 1, 129.9], ['Happy Tails', 'Chicken', '10.1 kg', 'Bag', 1, 124.9], ['Wag Bites', 'Beef', '15 kg', 'Bag', 1, 169.9]]],
    ['Cat litter', 'Pet Shop > Cats > Hygiene', 'Pet Shop', 'none', 'None', 'Keep in a dry place', '—',
      [['Purr Clean', 'Granulated', '4 kg', 'Bag', 4, 21.9], ['Purr Clean', 'Scented', '4 kg', 'Bag', 4, 23.9], ['Happy Tails', 'Silica', '3.8 kg', 'Bag', 4, 32.9]]],
    ['Chocolate bar', 'Checkout > Sweets > Chocolate', 'Checkout', 'dry', 'Contains milk and soy', 'Keep in a cool place, away from sunlight', 'Sugar, cocoa butter, milk powder, cocoa mass, soy lecithin',
      [['Choco Vita', 'Milk', '90 g', 'Bar', 24, 5.99], ['Choco Vita', 'Dark', '90 g', 'Bar', 24, 6.49], ['Cocoa Mill', 'Hazelnut', '90 g', 'Bar', 24, 6.99]]],
    ['Chocolate bonbons', 'Checkout > Sweets > Bonbons', 'Checkout', 'dry', 'Contains milk, soy and nuts', 'Keep in a cool place, away from sunlight', 'Sugar, cocoa, milk powder, hazelnut paste, vegetable fat',
      [['Choco Vita', 'Assorted', '250 g', 'Box', 12, 18.9], ['Cocoa Mill', 'Assorted', '200 g', 'Box', 12, 16.9], ['Candy Land', 'Cherry liqueur', '180 g', 'Box', 12, 17.9]]],
    ['Chocolate wafer', 'Checkout > Sweets > Wafers', 'Checkout', 'dry', 'Contains gluten, milk, soy and nuts', 'Keep in a cool, dry place', 'Wheat flour, sugar, vegetable fat, cocoa, hazelnut',
      [['Crunch Duo', 'Hazelnut', '40 g', 'Pack', 40, 2.49], ['Crunch Duo', 'Chocolate', '40 g', 'Pack', 40, 2.49], ['Cocoa Mill', 'Strawberry', '40 g', 'Pack', 40, 2.39]]],
    ['Hard candy', 'Checkout > Sweets > Candy', 'Checkout', 'dry', 'None', 'Keep in a cool, dry place', 'Sugar, glucose syrup, flavorings, colorings',
      [['Candy Land', 'Fruit', '150 g', 'Bag', 24, 4.49], ['Candy Land', 'Mint', '150 g', 'Bag', 24, 4.49], ['Sweet Cane', 'Honey', '140 g', 'Bag', 24, 4.99]]],
    ['Lollipop', 'Checkout > Sweets > Lollipops', 'Checkout', 'dry', 'None', 'Keep in a cool, dry place', 'Sugar, glucose syrup, flavorings, colorings',
      [['Sugar Pop', 'Strawberry', '12 g', 'Each', 50, 0.99], ['Sugar Pop', 'Cola', '12 g', 'Each', 50, 0.99], ['Candy Land', 'Fruit mix', '12 g', 'Each', 50, 1.09], ['Sugar Pop', 'Strawberry', '12 g', 'Each', 10, 8.9, 10]]],
    ['Breath mints', 'Checkout > Sweets > Mints', 'Checkout', 'dry', 'None', 'Keep in a cool, dry place', 'Sugar, dextrose, peppermint flavoring',
      [['Minty Fresh', 'Peppermint', '14 g', 'Tin', 24, 2.99], ['Minty Fresh', 'Spearmint', '14 g', 'Tin', 24, 2.99], ['Candy Land', 'Menthol', '14 g', 'Tin', 24, 2.79]]],
    ['Chewing gum', 'Checkout > Impulse > Gum', 'Checkout', 'dry', 'None', 'Keep in a cool place', 'Gum base, xylitol, flavorings',
      [['Minty Fresh', 'Mint', '8 g', 'Blister pack', 24, 2.49], ['Minty Fresh', 'Strawberry', '8 g', 'Blister pack', 24, 2.49], ['Minty Fresh', 'Cinnamon', '8 g', 'Blister pack', 24, 2.49]]],
    ['Alkaline battery', 'Checkout > Impulse > Batteries', 'Checkout', 'none', 'None', 'Keep in a dry place', '—',
      [['Power Cell', 'AA', '1.5 V', 'Blister pack', 12, 17.9, 2], ['Power Cell', 'AAA', '1.5 V', 'Blister pack', 12, 17.9, 2], ['Power Cell', '9V', '9 V', 'Blister pack', 12, 21.9]]]
  ];

  /** SKU code: brand initials, size and variant, unique across the catalog. */
  var usedCodes = {};
  function skuCode(brand, variant, size, pack) {
    var words = brand.replace(/[.]/g, '').split(' ');
    var brandCode = (words.length > 1 ? words.map(function(w) { return w[0]; }).join('') : brand.slice(0, 3)).toUpperCase().slice(0, 3);
    var base = brandCode + '-' + size.replace(/[ .]/g, '').toUpperCase() + '-' + variant.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() + (pack > 1 ? '-P' + pack : ''), code = base, n = 2;
    while (usedCodes[code]) code = base + n++;
    usedCodes[code] = true;
    return code;
  }

  var CATALOG = [];
  PRODUCTS.forEach(function(p) {
    p[7].forEach(function(v) {
      var i = CATALOG.length;
      CATALOG.push({
        index: i, name: p[0], category: p[1], brand: v[0], variant: v[1], size: v[2], pack: v[3], perCase: v[4], sku: skuCode(v[0], v[1], v[2], v[6] || 1), basePrice: v[5], packQty: v[3] === 'Loose' ? 0 : (v[6] || 1),
        packLabel: v[3] === 'Loose' ? 'Loose' : ((v[6] || 1) > 1 ? 'Pack of ' + v[6] : 'Single'),
        department: p[2], profile: p[3], allergens: p[4], storage: p[5], ingredients: p[6], status: 'Active',
        ean: ean('789' + String(100000000 + i * 7919).slice(0, 9)),
        description: v[3] === 'Loose' ? p[0] + ', sold loose' : p[0] + ', ' + v[1].toLowerCase() + ' (' + v[0] + ')' + ((v[6] || 1) > 1 ? ', pack of ' + v[6] : '')
      });
    });
  });

  /** EAN-13: 12 digits plus the check digit. */
  function ean(twelve) {
    var sum = 0;
    for (var i = 0; i < 12; i++) sum += +twelve[i] * (i % 2 ? 3 : 1);
    return twelve + ((10 - (sum % 10)) % 10);
  }

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function addDays(n) { return new Date(TODAY.getTime() + n * DAY); }

  function roundUp(n, step) { return Math.ceil(n / step) * step; }

  function batchesFor(sku, stock, h, supplier) {
    var prof = PROFILES[sku.profile];
    if (!prof || stock <= 0) return [];
    var count = Math.min(3, 1 + h % 3, stock), first = prof.range[0] + (h >>> 9) % (prof.range[1] - prof.range[0]);
    var offsets = [], qty = [], left = stock, i;
    for (i = 0; i < count; i++) {
      offsets.push(i === 0 ? first : first + (i * (7 + (h >>> (11 + i)) % 20)));
      var q = i === count - 1 ? left : Math.max(1, Math.round(stock / count));
      q = Math.min(q, left - (count - 1 - i));
      qty.push(q); left -= q;
    }
    return offsets.map(function(off, k) {
      var status = off < 0 ? 'Expired' : (off <= prof.near ? 'Near expiry' : 'Valid');
      return {
        lot: 'L' + (26000 + (h + k * 37) % 900), expiry: addDays(off), days: off, qty: qty[k], received: addDays(-(1 + (h >>> 11) % 10 + k * 3)),
        supplier: supplier, status: status
      };
    });
  }

  /** The store inventory of every SKU, same output for the same store. */
  function inventory(site) {
    var code = site.storeCode, suppliers = window.ProgramsData.suppliers;
    var ranked = CATALOG.map(function(s) { return { i: s.index, r: hash(code + '#' + s.index) }; }).sort(function(a, b) { return a.r - b.r; });
    var low = {}, out = {};
    ranked.slice(0, Math.min(site.lowStock, CATALOG.length)).forEach(function(x, k) { low[x.i] = true; if (k < site.outOfStock) out[x.i] = true; });

    return CATALOG.map(function(sku) {
      var h = hash(code + '|' + sku.sku), perishable = sku.profile === 'fresh' || sku.profile === 'dairy' || sku.profile === 'meat';
      // Stock is counted in the hundreds: a minimum of 100 to 180 units, a target of three times that
      var min = (5 + h % 5) * 20, target = min * 3, reorderPoint = min + Math.round(min / 4);
      var stock = out[sku.index] ? 0 : (low[sku.index] ? Math.floor(min * 0.4) + (h >>> 3) % Math.floor(min * 0.5) : min + (h >>> 3) % (target - min));
      var reserved = Math.min(stock, (h % 4) * 10), shelf = Math.min(stock, Math.ceil(stock * 0.3) + h % 3);
      var supplier = SUPPLIER_BY_AREA[sku.department] || suppliers[2];
      var lead = perishable ? 1 + h % 2 : 2 + h % 4, ads = Math.max(1, Math.round(min / (3 + h % 3)));
      var price = Math.round(sku.basePrice * (1 + ((h >>> 5) % 7 - 3) / 100) * 100) / 100, promoPct = (h >>> 7) % 5 === 0 ? [10, 15, 20][h % 3] : 0, promo = promoPct ? Math.round(price * (100 - promoPct)) / 100 : null;
      var aisle = AISLES[sku.department] + (sku.department === 'Mercearia' ? h % 3 : 0), fixture = 1 + (h >>> 4) % 30, pos = (h >>> 6) % 3;
      var days = stock / ads, status = stock === 0 ? 'Out of stock' : (stock < min ? 'Low stock' : 'In stock');
      var risk = stock === 0 ? 'Out of stock' : (days < lead ? 'High' : (days < lead + 2 ? 'Medium' : 'Low'));
      var batches = batchesFor(sku, stock, h, supplier);
      var worst = batches.filter(function(b) { return b.status !== 'Valid'; }).sort(function(a, b) { return a.days - b.days; })[0];
      var unit = sku.perCase === 0 ? 'kg' : 'units';
      return {
        sku: sku, stock: stock, reserved: reserved, available: stock - reserved, shelf: shelf, backroom: stock - shelf, min: min, target: target,
        reorderPoint: reorderPoint, reorderQty: sku.perCase > 1 ? roundUp(target - reorderPoint, sku.perCase) : target - reorderPoint,
        price: price, promo: promo, promoPct: promoPct, supplier: supplier, lead: lead, unit: unit, status: status, risk: risk, ads: ads, daysOfSupply: Math.round(days * 10) / 10,
        suggested: stock <= reorderPoint ? (sku.perCase > 1 ? roundUp(target - stock, sku.perCase) : target - stock) : 0,
        aisle: aisle, fixture: fixture, position: POSITIONS[pos], planogram: 'A' + String(aisle).padStart(2, '0') + '-G' + String(fixture).padStart(2, '0') + '-' + (pos + 1),
        location: 'Aisle ' + aisle + ' · Fixture ' + fixture + ' · ' + POSITIONS[pos], batches: batches,
        alert: worst ? (worst.status === 'Expired' ? 'Expired' : worst.days + (worst.days === 1 ? ' day' : ' days')) : '',
        alertTone: worst ? (worst.status === 'Expired' || worst.days <= 3 ? 'danger' : 'warning') : '',
        lastSold: addDays(-(h % 3)), lastRestocked: addDays(-(2 + (h >>> 2) % 9)), lastCounted: addDays(-(1 + (h >>> 4) % 20)), accuracy: 94 + (h >>> 8) % 7
      };
    });
  }

  /* ---------- the inventory of a store lives for the session, so edits and new products show in every view ---------- */

  var invCache = {}, newCount = 0;
  var SKU_FIELDS = ['brand', 'variant', 'size', 'description', 'ingredients', 'allergens', 'storage'];

  function stored(site) { return invCache[site.storeCode] || (invCache[site.storeCode] = inventory(site)); }

  /** Everything that depends on the stock and the minimum stock of a product, recomputed after one of them changes. */
  function recompute(r) {
    var s = r.sku;
    r.target = r.min * 3;
    r.reorderPoint = r.min + Math.round(r.min / 4);
    r.status = r.stock === 0 ? 'Out of stock' : (r.stock < r.min ? 'Low stock' : 'In stock');
    r.reserved = Math.min(r.reserved, r.stock);
    r.available = r.stock - r.reserved;
    r.shelf = Math.min(r.stock, Math.ceil(r.stock * 0.3) + (r.shelf > 0 ? 0 : 0));
    r.backroom = r.stock - r.shelf;
    var days = r.ads ? r.stock / r.ads : 0;
    r.daysOfSupply = Math.round(days * 10) / 10;
    r.risk = r.stock === 0 ? 'Out of stock' : (days < r.lead ? 'High' : (days < r.lead + 2 ? 'Medium' : 'Low'));
    r.reorderQty = s.perCase > 1 ? roundUp(r.target - r.reorderPoint, s.perCase) : r.target - r.reorderPoint;
    r.suggested = r.stock <= r.reorderPoint ? (s.perCase > 1 ? roundUp(r.target - r.stock, s.perCase) : r.target - r.stock) : 0;
  }

  /** Changes one value of a product of a store: 'price', 'stock', 'min' or 'location'. The promotion follows the price. */
  function edit(site, index, field, value) {
    var r = stored(site).filter(function(x) { return x.sku.index === index; })[0];
    if (!r) return null;
    r.edits = r.edits || {};
    if (field === 'price') {
      r.price = value;
      if (r.promoPct) r.promo = Math.round(r.price * (100 - r.promoPct)) / 100;
    } else if (field === 'stock' || field === 'min') {
      r[field] = value;
      recompute(r);
    } else if (field === 'location') {
      r.location = value;
    } else if (field === 'discount') {
      r.promoPct = value;
      r.promo = value ? Math.round(r.price * (100 - value)) / 100 : null;
    } else if (field === 'supplier') {
      r.supplier = value;
    } else if (field === 'lead' || field === 'ads') {
      r[field] = value;
      recompute(r);
    } else if (SKU_FIELDS.indexOf(field) !== -1) {
      // The SKU record is shared by every store, so the edit gets its own copy
      r.sku = Object.assign({}, r.sku);
      r.sku[field] = value;
    } else if (field === 'aisle' || field === 'fixture' || field === 'position') {
      r[field] = value;
      var pos = Math.max(0, POSITIONS.indexOf(r.position));
      r.location = 'Aisle ' + r.aisle + ' · Fixture ' + r.fixture + ' · ' + r.position;
      r.planogram = 'A' + String(r.aisle).padStart(2, '0') + '-G' + String(r.fixture).padStart(2, '0') + '-' + (pos + 1);
    } else return null;
    r.edits[field] = true;
    return r;
  }

  /** Adds a product to an area of a store (no stock yet). The row is built on one of the area, so it has every field a row needs. */
  function addProduct(site, area, data) {
    var list = stored(site), tpl = list.filter(function(r) { return r.sku.department === area; })[0] || list[0];
    var index = 9000 + (newCount++);
    var packQty = data.packQty || 1;
    var sku = Object.assign({}, tpl.sku, {
      index: index, name: data.name, brand: data.brand, variant: data.variant || 'Standard', size: data.size || '—', packQty: packQty, packLabel: packQty > 1 ? 'Pack of ' + packQty : 'Single',
      sku: data.sku, ean: data.ean || '—', department: area, perCase: 1, description: data.name + ' (' + data.brand + ')'
    });
    var r = Object.assign({}, tpl, {
      sku: sku, stock: 0, reserved: 0, available: 0, shelf: 0, backroom: 0, min: data.min, price: data.price, promo: 0, promoPct: 0, ads: Math.max(1, Math.round(data.min / 4)), unit: 'units',
      location: data.location || 'Not placed yet', alert: '', alertTone: '', batches: [], isNew: true, edits: {}
    });
    recompute(r);
    list.push(r);
    return r;
  }

  /** A package size like "370 g" or "1.5 L" with the number and the unit in columns of their own, so numbers line up with numbers and units with units. */
  function sizeHtml(text) {
    var m = /^\s*(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(String(text == null ? '' : text));
    var esc = function(v) { return String(v).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    if (!m) return esc(text);
    return '<span class="unit-cell"><span class="unit-cell__num">' + esc(m[1]) + '</span><span class="unit-cell__unit">' + esc(m[2]) + '</span></span>';
  }

  window.ProductsData = {
    sizeHtml: sizeHtml,
    today: TODAY,
    aisles: AISLES,
    getCatalog: function() { return CATALOG; },
    getInventory: stored,
    edit: edit,
    addProduct: addProduct,
    brands: function() { var seen = {}; CATALOG.forEach(function(p) { seen[p.brand] = true; }); return Object.keys(seen).filter(function(b) { return b !== 'Loose'; }).sort(function(a, b) { return a.localeCompare(b); }); },
    categories: function() {
      var seen = {};
      CATALOG.forEach(function(s) { seen[s.category.split(' > ')[0]] = true; });
      return Object.keys(seen).sort();
    }
  };
})();
