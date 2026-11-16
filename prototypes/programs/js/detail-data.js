/**
 * Program Detail Data Module
 * Contains lines and equipment data specific to detail page
 */

(function() {
  'use strict';
  
  // Project phases
  const buildStages = [
    { id: 'Planning', date: '01/15/2026' },
    { id: 'Preparation', date: '03/20/2026' },
    { id: 'Installation', date: '06/10/2026' },
    { id: 'Opening', date: '09/22/2026' },
    { id: 'Dismantling', date: '11/30/2026' }
  ];
  
  // Lines data (store areas)
  const linesData = [
    { id: 1, name: 'Produce', nameTag: 'Fresh', description: 'Fresh fruit & vegetables', lineType: 'Housing', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Fresh', targetUPH: 90, pcns: 0, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Receiving Dock', processes: [{ name: 'Inspect incoming crates' }, { name: 'Weigh and register' }] },
        { name: 'Produce Display', processes: [{ name: 'Restock shelves' }, { name: 'Remove spoiled items' }] },
        { name: 'Price Scale', processes: [{ name: 'Check price tags' }] },
        { name: 'Misting & Rotation', processes: [{ name: 'Rotate by expiry date' }] }
      ]
    },
    { id: 2, name: 'Grocery', nameTag: 'Dry goods', description: 'Packaged & dry groceries', lineType: 'Main', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Dry goods', targetUPH: 75, pcns: 0, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Aisle Restock', processes: [{ name: 'Restock from pallet' }, { name: 'Face up products' }] },
        { name: 'Promo Endcaps', processes: [{ name: 'Set up endcap' }] },
        { name: 'Shelf Label Check', processes: [{ name: 'Replace shelf labels' }] }
      ]
    },
    { id: 3, name: 'Bakery', nameTag: 'Fresh', description: 'In-store bakery', lineType: 'Main', level: 'Offline', condSop: '—', processCategory: 'FATP', lineGrouping: 'Fresh', targetUPH: 60, pcns: 0, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Oven', processes: [{ name: 'Bake batch' }, { name: 'Check bread temperature' }] },
        { name: 'Display Counter', processes: [{ name: 'Restock counter' }, { name: 'Mark day-old items' }] },
        { name: 'Packaging', processes: [{ name: 'Bag and label' }] }
      ]
    },
    { id: 4, name: 'Butcher', nameTag: 'Fresh', description: 'Meat counter & cuts', lineType: 'Housing', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Fresh', targetUPH: 100, pcns: 0, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Cutting Table', processes: [{ name: 'Portion cuts' }, { name: 'Sanitize surfaces' }] },
        { name: 'Weighing & Labeling', processes: [{ name: 'Weigh and label' }] },
        { name: 'Cold Display', processes: [{ name: 'Restock display' }, { name: 'Check temperature' }] },
        { name: 'Grinder', processes: [{ name: 'Grind to order' }] }
      ]
    },
    { id: 5, name: 'Dairy', nameTag: 'Fresh', description: 'Milk, cheese & yogurt', lineType: 'Main', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Fresh', targetUPH: 85, pcns: 0, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Dairy Cooler', processes: [{ name: 'Restock by expiry' }, { name: 'Log cooler temperature' }] },
        { name: 'Cheese Counter', processes: [{ name: 'Slice and pack' }] },
        { name: 'Expiry Check', processes: [{ name: 'Pull near-expiry items' }] }
      ]
    },
    { id: 6, name: 'Beverages', nameTag: 'Dry goods', description: 'Soft drinks, juice & alcohol', lineType: 'Housing', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Dry goods', targetUPH: 55, pcns: 2, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Pallet Restock', processes: [{ name: 'Unload pallet' }, { name: 'Restock shelves' }] },
        { name: 'Beverage Cooler', processes: [{ name: 'Refill cooler' }, { name: 'Check temperature' }] },
        { name: 'Alcohol Shelf', processes: [{ name: 'Verify age-restricted labels' }] }
      ]
    },
    { id: 7, name: 'Cleaning', nameTag: 'Dry goods', description: 'Cleaning products', lineType: 'Main', level: 'Offline', condSop: '—', processCategory: 'FATP', lineGrouping: 'Dry goods', targetUPH: 45, pcns: 1, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Aisle Restock', processes: [{ name: 'Restock shelves' }] },
        { name: 'Shelf Label Check', processes: [{ name: 'Correct price tags' }] },
        { name: 'Gondola Organization', processes: [{ name: 'Rearrange gondola' }, { name: 'Fill empty spaces' }] }
      ]
    },
    { id: 8, name: 'Checkout', nameTag: 'Front end', description: 'Checkout lanes', lineType: 'Housing', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Front end', targetUPH: 80, pcns: 2, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Checkout Lane', processes: [{ name: 'Open lane' }, { name: 'Cash count' }] },
        { name: 'Self-checkout', processes: [{ name: 'Monitor kiosks' }, { name: 'Restock bags' }] },
        { name: 'Customer Service', processes: [{ name: 'Handle returns' }] }
      ]
    },
    { id: 9, name: 'Receiving & Stock Room', nameTag: 'Back of house', description: 'Receiving dock & stock room', lineType: 'Main', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Back of house', targetUPH: 65, pcns: 1, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Dock Receiving', processes: [{ name: 'Check delivery against order' }, { name: 'Record shortages and damages' }] },
        { name: 'Stock Count', processes: [{ name: 'Count by area' }, { name: 'Register differences' }] },
        { name: 'Stock Room Put-away', processes: [{ name: 'Move to shelf location' }] }
      ]
    },
    { id: 10, name: 'Chilled & Frozen', nameTag: 'Back of house', description: 'Chilled & frozen goods', lineType: 'Housing', level: 'Offline', condSop: '—', processCategory: 'FATP', lineGrouping: 'Back of house', targetUPH: 50, pcns: 0, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Freezer Aisle', processes: [{ name: 'Restock frozen items' }, { name: 'Check door seals' }] },
        { name: 'Cold Room', processes: [{ name: 'Log temperature' }, { name: 'Rotate stock' }] },
        { name: 'Deli Counter', processes: [{ name: 'Slice and pack' }] }
      ]
    },
    { id: 11, name: 'Fish Counter', nameTag: 'Fresh', description: 'Fish & seafood counter', lineType: 'Housing', level: 'Online', condSop: '—', processCategory: 'SMT', lineGrouping: 'Fresh', targetUPH: 120, pcns: 3, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Ice Bed', processes: [{ name: 'Refresh ice' }, { name: 'Arrange display' }] },
        { name: 'Cleaning & Cutting', processes: [{ name: 'Clean and fillet' }] },
        { name: 'Weighing & Labeling', processes: [{ name: 'Weigh and label' }] }
      ]
    },
    { id: 12, name: 'Health & Beauty', nameTag: 'Dry goods', description: 'Personal care & beauty', lineType: 'Main', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Dry goods', targetUPH: 70, pcns: 1, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Aisle Restock', processes: [{ name: 'Restock shelves' }] },
        { name: 'Shelf Label Check', processes: [{ name: 'Replace shelf labels' }] },
        { name: 'Security Tag', processes: [{ name: 'Tag high-value items' }] }
      ]
    },
    { id: 13, name: 'Pet Shop', nameTag: 'Dry goods', description: 'Pet food & supplies', lineType: 'Main', level: 'Online', condSop: '—', processCategory: 'FATP', lineGrouping: 'Dry goods', targetUPH: 95, pcns: 0, stationCount: 25, processCount: 30, hc: 18, equipCount: 26, uniqueEquipCount: 12, uniqueCons: 10,stations: [
        { name: 'Aisle Restock', processes: [{ name: 'Restock bags and cans' }] },
        { name: 'Bulk Food', processes: [{ name: 'Refill bulk bins' }] },
        { name: 'Price Check', processes: [{ name: 'Verify prices' }] }
      ]
    }
  ];
  
  // Equipment data
  const equipmentData = [
    { name: 'Price Scale', shortName: 'PSC-01', vendor: 'Approved', usage: '03', type: 'DFM', category: 'Manual Fixture', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', lineSide: 'Left', qty: 5, date: '15 Mar 2026', dri: 'John Smith', pdDri: 'Jane Doe', cmDri: 'Bob Wilson' },
    { name: 'Handheld Scanner', shortName: 'HSC-02', vendor: 'Pending', usage: '05', type: 'TE', category: 'Semi Auto Fixture', engIntent: 'POR', mpIntent: 'MP Evaluation', lineSide: 'Right', qty: 10, date: '20 Mar 2026', dri: 'Alice Brown', pdDri: 'Charlie Davis', cmDri: 'Diana Evans' },
    { name: 'Label Printer', shortName: 'LBL-03', vendor: 'Approved', usage: '01', type: 'AE', category: 'Bench Top Automated Fixture', engIntent: 'DOE', mpIntent: 'MP Evaluation', lineSide: 'Left', qty: 8, date: '18 Mar 2026', dri: 'Eve Foster', pdDri: 'Frank Green', cmDri: 'Grace Hill' },
    { name: 'Pallet Jack', shortName: 'PLJ-04', vendor: 'Approved', usage: '07', type: 'ME', category: 'Conveyor', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', lineSide: 'Right', qty: 6, date: '22 Mar 2026', dri: 'Henry Irving', pdDri: 'Iris Jones', cmDri: 'Jack Kelly' },
    { name: 'Shopping Cart Rack', shortName: 'SCR-05', vendor: 'In Review', usage: '02', type: 'Tool', category: 'Cooling Tunnel', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Left', qty: 3, date: '25 Mar 2026', dri: 'Kate Lewis', pdDri: 'Liam Martin', cmDri: 'Mia Nelson' },
    { name: 'Refrigerated Display Case', shortName: 'RDC-06', vendor: 'Approved', usage: '00', type: 'DFM', category: 'Laser Etching', engIntent: 'Inactive', mpIntent: 'POR', lineSide: 'Right', qty: 2, date: '28 Mar 2026', dri: 'Noah Oliver', pdDri: 'Olivia Parker', cmDri: 'Paul Quinn' },
    { name: 'Freezer Chest', shortName: 'FRZ-07', vendor: 'Approved', usage: '04', type: 'TE', category: 'Laser Welding', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', lineSide: 'Left', qty: 4, date: '30 Mar 2026', dri: 'Quinn Reed', pdDri: 'Rachel Scott', cmDri: 'Sam Taylor' },
    { name: 'Meat Slicer', shortName: 'MSL-08', vendor: 'Pending', usage: '06', type: 'AE', category: 'Oven', engIntent: 'N/A', mpIntent: 'POR', lineSide: 'Right', qty: 2, date: '02 Apr 2026', dri: 'Tina Upton', pdDri: 'Uma Vance', cmDri: 'Victor Wade' },
    { name: 'Bread Oven', shortName: 'BRO-09', vendor: 'In Review', usage: '08', type: 'ME', category: 'Manual Fixture', engIntent: 'Offline', mpIntent: 'DOE', lineSide: 'Left', qty: 1, date: '05 Apr 2026', dri: 'Wendy Xavier', pdDri: 'Xander Young', cmDri: 'Yara Zimmerman' },
    { name: 'Bakery Proofer', shortName: 'BKP-10', vendor: 'Approved', usage: '01', type: 'Tool', category: 'Semi Auto Fixture', engIntent: 'DOE', mpIntent: 'DOE', lineSide: 'Right', qty: 1, date: '08 Apr 2026', dri: 'Zoe Adams', pdDri: 'Aaron Baker', cmDri: 'Bella Carter' },
    { name: 'Produce Mister', shortName: 'PRM-11', vendor: 'Approved', usage: '03', type: 'AE', category: 'Bench Top Automated Fixture', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Left', qty: 2, date: '12 Apr 2026', dri: 'Carlos Diaz', pdDri: 'Diana Ellis', cmDri: 'Ethan Ford' },
    { name: 'Checkout Terminal', shortName: 'CKT-12', vendor: 'Approved', usage: '05', type: 'ME', category: 'Oven', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Right', qty: 1, date: '15 Apr 2026', dri: 'Fiona Grant', pdDri: 'George Hall', cmDri: 'Holly Ivers' },
    { name: 'Self-checkout Kiosk', shortName: 'SCK-13', vendor: 'In Review', usage: '02', type: 'TE', category: 'Bench Top Automated Fixture', engIntent: 'MP Evaluation', mpIntent: 'POR', lineSide: 'Left', qty: 2, date: '18 Apr 2026', dri: 'Isaac Jackson', pdDri: 'Julia Klein', cmDri: 'Kevin Lopez' },
    { name: 'Checkout Conveyor', shortName: 'CKC-14', vendor: 'Pending', usage: '04', type: 'TE', category: 'Semi Auto Fixture', engIntent: 'DOE', mpIntent: 'MP Evaluation', lineSide: 'Right', qty: 1, date: '20 Apr 2026', dri: 'Laura Moore', pdDri: 'Marco Nash', cmDri: 'Nina Owens' },
    { name: 'Cardboard Baler', shortName: 'CBL-15', vendor: 'Approved', usage: '06', type: 'ME', category: 'Conveyor', engIntent: 'Inactive', mpIntent: 'DOE', lineSide: 'Left', qty: 1, date: '22 Apr 2026', dri: 'Omar Prince', pdDri: 'Paula Quinn', cmDri: 'Quincy Reyes' },
    { name: 'Floor Scrubber', shortName: 'FLS-16', vendor: 'Approved', usage: '00', type: 'AE', category: 'Manual Fixture', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Right', qty: 3, date: '25 Apr 2026', dri: 'Rita Silva', pdDri: 'Steve Torres', cmDri: 'Tara Ung' },
    { name: 'Step Ladder', shortName: 'STL-17', vendor: 'Approved', usage: '08', type: 'Tool', category: 'Manual Fixture', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', lineSide: 'Left', qty: 12, date: '27 Apr 2026', dri: 'Ursula Vega', pdDri: 'Vince Walsh', cmDri: 'Wanda Xu' },
    { name: 'Hand Truck', shortName: 'HTR-18', vendor: 'In Review', usage: '03', type: 'AE', category: 'Laser Etching', engIntent: 'POR', mpIntent: 'MP Evaluation', lineSide: 'Right', qty: 2, date: '30 Apr 2026', dri: 'Xavier Yates', pdDri: 'Yolanda Zane', cmDri: 'Zach Abbott' },
    { name: 'Cold Room Thermometer', shortName: 'CRT-19', vendor: 'Approved', usage: '07', type: 'TE', category: 'Bench Top Automated Fixture', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Left', qty: 4, date: '02 May 2026', dri: 'Andre Bishop', pdDri: 'Beatriz Chan', cmDri: 'Cyrus Diaz' },
    { name: 'Shelf Label Printer', shortName: 'SLP-20', vendor: 'Pending', usage: '02', type: 'TE', category: 'Manual Fixture', engIntent: 'DOE', mpIntent: 'DOE', lineSide: 'Right', qty: 2, date: '05 May 2026', dri: 'Dora Elliot', pdDri: 'Erik Farrow', cmDri: 'Faye Gomez' },
    { name: 'Bagging Station', shortName: 'BGS-21', vendor: 'Approved', usage: '05', type: 'AE', category: 'Bench Top Automated Fixture', engIntent: 'MP Evaluation', mpIntent: 'POR', lineSide: 'Left', qty: 2, date: '08 May 2026', dri: 'Gustavo Hines', pdDri: 'Helena Ito', cmDri: 'Ivan Jansen' },
    { name: 'Deli Scale', shortName: 'DLS-22', vendor: 'Approved', usage: '01', type: 'ME', category: 'Cooling Tunnel', engIntent: 'N/A', mpIntent: 'MP Evaluation', lineSide: 'Right', qty: 1, date: '10 May 2026', dri: 'Julia Kaur', pdDri: 'Kai Lam', cmDri: 'Leo Marsh' },
    { name: 'Fish Ice Bed', shortName: 'FIB-23', vendor: 'In Review', usage: '04', type: 'TE', category: 'Manual Fixture', engIntent: 'DOE', mpIntent: 'DOE', lineSide: 'Left', qty: 3, date: '12 May 2026', dri: 'Mira Novak', pdDri: 'Nate Ortega', cmDri: 'Olga Park' },
    { name: 'Meat Grinder', shortName: 'MGR-24', vendor: 'Approved', usage: '00', type: 'ME', category: 'Semi Auto Fixture', engIntent: 'Offline', mpIntent: 'Inactive', lineSide: 'Right', qty: 1, date: '15 May 2026', dri: 'Peter Quon', pdDri: 'Queenie Ross', cmDri: 'Ryan Suzuki' },
    { name: 'Vacuum Sealer', shortName: 'VSL-25', vendor: 'Approved', usage: '06', type: 'Tool', category: 'FIFO', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Left', qty: 4, date: '18 May 2026', dri: 'Sofia Tanaka', pdDri: 'Theo Ueda', cmDri: 'Uma Vidal' },
    { name: 'Cash Drawer', shortName: 'CSD-26', vendor: 'Approved', usage: '08', type: 'Tool', category: 'Manual Fixture', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Right', qty: 8, date: '20 May 2026', dri: 'Vera Wu', pdDri: 'Wesley Xiao', cmDri: 'Yasmin Zeng' },
    { name: 'Receipt Printer', shortName: 'RCP-27', vendor: 'Approved', usage: '03', type: 'Tool', category: 'Manual Fixture', engIntent: 'MP Evaluation', mpIntent: 'POR', lineSide: 'Left', qty: 15, date: '23 May 2026', dri: 'Aaron Cole', pdDri: 'Brianna Dutta', cmDri: 'Cesar Eng' },
    { name: 'Security Gate', shortName: 'SEC-28', vendor: 'In Review', usage: '02', type: 'TE', category: 'Bench Top Automated Fixture', engIntent: 'DOE', mpIntent: 'DOE', lineSide: 'Right', qty: 2, date: '25 May 2026', dri: 'Diego Furlan', pdDri: 'Ella Ghosh', cmDri: 'Felix Hsu' },
    { name: 'Dairy Cooler', shortName: 'DRC-29', vendor: 'Approved', usage: '05', type: 'TE', category: 'Bench Top Automated Fixture', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Left', qty: 3, date: '28 May 2026', dri: 'Grace Ito', pdDri: 'Hugo Juarez', cmDri: 'Isla Kwon' },
    { name: 'Beverage Cooler', shortName: 'BVC-30', vendor: 'Pending', usage: '01', type: 'ME', category: 'Cooling Tunnel', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', lineSide: 'Right', qty: 1, date: '30 May 2026', dri: 'Jamal Lin', pdDri: 'Karina Mota', cmDri: 'Leo Nakamura' },
    { name: 'Pallet Wrapper', shortName: 'PWR-31', vendor: 'Approved', usage: '07', type: 'ME', category: 'Cooling Tunnel', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Left', qty: 1, date: '02 Jun 2026', dri: 'Mateo Oduya', pdDri: 'Nadia Patel', cmDri: 'Oscar Qadir' },
    { name: 'Forklift', shortName: 'FKL-32', vendor: 'Approved', usage: '04', type: 'ME', category: 'Conveyor', engIntent: 'DOE', mpIntent: 'MP Evaluation', lineSide: 'Right', qty: 1, date: '05 Jun 2026', dri: 'Priya Reddy', pdDri: 'Quinn Silva', cmDri: 'Ravi Thakur' },
    { name: 'Rotisserie Oven', shortName: 'ROT-33', vendor: 'Approved', usage: '06', type: 'TE', category: 'Manual Fixture', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Left', qty: 20, date: '08 Jun 2026', dri: 'Sarah Uy', pdDri: 'Tomas Vega', cmDri: 'Uma Wei' },
    { name: 'Juice Dispenser', shortName: 'JDS-34', vendor: 'In Review', usage: '00', type: 'ME', category: 'Conveyor', engIntent: 'POR', mpIntent: 'POR', lineSide: 'Right', qty: 5, date: '10 Jun 2026', dri: 'Victor Xie', pdDri: 'Willow Yao', cmDri: 'Xander Zaman' },
    { name: 'Weighing Labeler', shortName: 'WLB-35', vendor: 'Pending', usage: '03', type: 'AE', category: 'Bench Top Automated Fixture', engIntent: 'DOE', mpIntent: 'DOE', lineSide: 'Left', qty: 2, date: '12 Jun 2026', dri: 'Yuki Aoki', pdDri: 'Zara Bello', cmDri: 'Adrian Cho' }
  ];
  
  // Consumables data
  const consumablesData = [
    { stationName: 'Workstation 01', applicationName: 'Pricing', consumableName: 'Price Labels', vendor: 'Acme Corp', vendorPN: 'ADH-001', engIntent: 'Production', mpIntent: 'MP Evaluation', consumableType: 'Adhesive', category: 'Bonding', subcategory: 'Tape', itemDescription: 'Double-sided adhesive tape for component bonding', applePN: 'APL-ADH-001', cmPN: 'CM-ADH-001', package: 'Roll', packageUOM: 'EA', packageDescription: '50m roll', packageCost: '$25.00', purchasePack: '10', unitOfMeasure: 'Meter', costPerUOM: '$0.50', safetyDataSheet: 'SDS-001', technicalDataSheet: 'TDS-001', installedImage: 'IMG-001', usageTestPoints: '2.5', retestRate: '5%', lifecycle: '6 months', effectiveUsage: '2.38', testedRate: '95%', buildDuration: '30 days', buffer: '10%', engineeringDailyUsage: '12.5', engOrderQty: '375', inHandDate: '15 Apr 2026' },
    { stationName: 'Workstation 02', applicationName: 'Cleaning', consumableName: 'Surface Sanitizer', vendor: 'CleanTech', vendorPN: 'CLN-002', engIntent: 'Production', mpIntent: 'MP Evaluation', consumableType: 'Chemical', category: 'Cleaning', subcategory: 'Solution', itemDescription: 'Industrial cleaning solution for electronics', applePN: 'APL-CLN-002', cmPN: 'CM-CLN-002', package: 'Bottle', packageUOM: 'EA', packageDescription: '1L bottle', packageCost: '$15.00', purchasePack: '12', unitOfMeasure: 'Liter', costPerUOM: '$15.00', safetyDataSheet: 'SDS-002', technicalDataSheet: 'TDS-002', installedImage: 'IMG-002', usageTestPoints: '1.0', retestRate: '2%', lifecycle: '12 months', effectiveUsage: '0.98', testedRate: '98%', buildDuration: '30 days', buffer: '15%', engineeringDailyUsage: '8.2', engOrderQty: '246', inHandDate: '22 Apr 2026' },
    { stationName: 'Workstation 03', applicationName: 'Packaging', consumableName: 'Stretch Film', vendor: 'FilmPro', vendorPN: 'PRT-003', engIntent: 'Production', mpIntent: 'MP Evaluation', consumableType: 'Film', category: 'Protection', subcategory: 'Surface', itemDescription: 'Protective film for display surfaces', applePN: 'APL-PRT-003', cmPN: 'CM-PRT-003', package: 'Roll', packageUOM: 'EA', packageDescription: '100m roll', packageCost: '$87.50', purchasePack: '5', unitOfMeasure: 'Meter', costPerUOM: '$0.88', safetyDataSheet: 'SDS-003', technicalDataSheet: 'TDS-003', installedImage: 'IMG-003', usageTestPoints: '1.2', retestRate: '3%', lifecycle: '18 months', effectiveUsage: '1.16', testedRate: '97%', buildDuration: '45 days', buffer: '12%', engineeringDailyUsage: '15.8', engOrderQty: '711', inHandDate: '10 May 2026' },
    { stationName: 'Workstation 01', applicationName: 'Checkout', consumableName: 'Thermal Receipt Paper', vendor: 'ThermalTech', vendorPN: 'THM-004', engIntent: 'Production', mpIntent: 'POR', consumableType: 'Paste', category: 'Thermal', subcategory: 'Interface', itemDescription: 'High-performance thermal interface paste', applePN: 'APL-THM-004', cmPN: 'CM-THM-004', package: 'Tube', packageUOM: 'EA', packageDescription: '10g tube', packageCost: '$12.00', purchasePack: '20', unitOfMeasure: 'Gram', costPerUOM: '$1.20', safetyDataSheet: 'SDS-004', technicalDataSheet: 'TDS-004', installedImage: 'IMG-004', usageTestPoints: '0.5', retestRate: '1%', lifecycle: '24 months', effectiveUsage: '0.495', testedRate: '99%', buildDuration: '30 days', buffer: '20%', engineeringDailyUsage: '3.2', engOrderQty: '96', inHandDate: '05 Apr 2026' },
    { stationName: 'Workstation 04', applicationName: 'Bagging', consumableName: 'Plastic Bags', vendor: 'OilCo', vendorPN: 'LUB-005', engIntent: 'Maintenance', mpIntent: 'MP Evaluation', consumableType: 'Oil', category: 'Lubricant', subcategory: 'Synthetic', itemDescription: 'Synthetic lubricant for precision mechanisms', applePN: 'APL-LUB-005', cmPN: 'CM-LUB-005', package: 'Bottle', packageUOM: 'EA', packageDescription: '500ml bottle', packageCost: '$25.00', purchasePack: '6', unitOfMeasure: 'Milliliter', costPerUOM: '$0.05', safetyDataSheet: 'SDS-005', technicalDataSheet: 'TDS-005', installedImage: 'IMG-005', usageTestPoints: '5.0', retestRate: '8%', lifecycle: '9 months', effectiveUsage: '4.6', testedRate: '92%', buildDuration: '60 days', buffer: '25%', engineeringDailyUsage: '18.4', engOrderQty: '1104', inHandDate: '28 Apr 2026' },
    { stationName: 'Workstation 05', applicationName: 'Fresh Packing', consumableName: 'Meat Trays', vendor: 'SolderPro', vendorPN: 'SLD-006', engIntent: 'Production', mpIntent: 'POR', consumableType: 'Wire', category: 'Soldering', subcategory: 'Lead-Free', itemDescription: 'Lead-free solder wire SAC305', applePN: 'APL-SLD-006', cmPN: 'CM-SLD-006', package: 'Spool', packageUOM: 'EA', packageDescription: '500g spool', packageCost: '$92.50', purchasePack: '10', unitOfMeasure: 'Gram', costPerUOM: '$0.19', safetyDataSheet: 'SDS-006', technicalDataSheet: 'TDS-006', installedImage: 'IMG-006', usageTestPoints: '3.2', retestRate: '4%', lifecycle: '15 months', effectiveUsage: '3.07', testedRate: '96%', buildDuration: '30 days', buffer: '18%', engineeringDailyUsage: '22.1', engOrderQty: '663', inHandDate: '18 Apr 2026' },
    { stationName: 'Workstation 05', applicationName: 'Fresh Packing', consumableName: 'Bakery Paper', vendor: 'SolderPro', vendorPN: 'FLX-007', engIntent: 'Production', mpIntent: 'MP Evaluation', consumableType: 'Paste', category: 'Soldering', subcategory: 'No-Clean', itemDescription: 'No-clean flux paste for SMT', applePN: 'APL-FLX-007', cmPN: 'CM-FLX-007', package: 'Jar', packageUOM: 'EA', packageDescription: '100g jar', packageCost: '$18.00', purchasePack: '15', unitOfMeasure: 'Gram', costPerUOM: '$0.18', safetyDataSheet: 'SDS-007', technicalDataSheet: 'TDS-007', installedImage: 'IMG-007', usageTestPoints: '1.8', retestRate: '6%', lifecycle: '12 months', effectiveUsage: '1.69', testedRate: '94%', buildDuration: '30 days', buffer: '15%', engineeringDailyUsage: '9.7', engOrderQty: '291', inHandDate: '12 May 2026' },
    { stationName: 'Workstation 02', applicationName: 'Cleaning', consumableName: 'Disinfectant Wipes', vendor: 'CleanTech', vendorPN: 'IPA-008', engIntent: 'Production', mpIntent: 'MP Evaluation', consumableType: 'Chemical', category: 'Cleaning', subcategory: 'Solvent', itemDescription: '99.9% pure isopropyl alcohol', applePN: 'APL-IPA-008', cmPN: 'CM-IPA-008', package: 'Bottle', packageUOM: 'EA', packageDescription: '1L bottle', packageCost: '$6.50', purchasePack: '24', unitOfMeasure: 'Liter', costPerUOM: '$6.50', safetyDataSheet: 'SDS-008', technicalDataSheet: 'TDS-008', installedImage: 'IMG-008', usageTestPoints: '0.8', retestRate: '1%', lifecycle: '24 months', effectiveUsage: '0.792', testedRate: '99%', buildDuration: '30 days', buffer: '10%', engineeringDailyUsage: '5.5', engOrderQty: '165', inHandDate: '08 Apr 2026' },
    { stationName: 'Workstation 06', applicationName: 'Food Safety', consumableName: 'Disposable Gloves', vendor: 'SafetyFirst', vendorPN: 'ESD-009', engIntent: 'Safety', mpIntent: 'MP Evaluation', consumableType: 'Safety', category: 'ESD', subcategory: 'Grounding', itemDescription: 'Adjustable ESD wrist strap with ground cord', applePN: 'APL-ESD-009', cmPN: 'CM-ESD-009', package: 'Box', packageUOM: 'EA', packageDescription: '10 units per box', packageCost: '$32.50', purchasePack: '5', unitOfMeasure: 'Unit', costPerUOM: '$3.25', safetyDataSheet: 'SDS-009', technicalDataSheet: 'TDS-009', installedImage: 'IMG-009', usageTestPoints: '1.0', retestRate: '0%', lifecycle: '36 months', effectiveUsage: '1.0', testedRate: '100%', buildDuration: '90 days', buffer: '5%', engineeringDailyUsage: '2.8', engOrderQty: '252', inHandDate: '25 Apr 2026' },
    { stationName: 'Workstation 02', applicationName: 'Cleaning', consumableName: 'Paper Towels', vendor: 'CleanTech', vendorPN: 'WIP-010', engIntent: 'Production', mpIntent: 'MP Evaluation', consumableType: 'Wipe', category: 'Cleaning', subcategory: 'Disposable', itemDescription: 'Lint-free cleanroom wipes', applePN: 'APL-WIP-010', cmPN: 'CM-WIP-010', package: 'Box', packageUOM: 'EA', packageDescription: '100 wipes per box', packageCost: '$12.00', purchasePack: '20', unitOfMeasure: 'Wipe', costPerUOM: '$0.12', safetyDataSheet: 'SDS-010', technicalDataSheet: 'TDS-010', installedImage: 'IMG-010', usageTestPoints: '10.0', retestRate: '12%', lifecycle: '3 months', effectiveUsage: '8.8', testedRate: '88%', buildDuration: '30 days', buffer: '30%', engineeringDailyUsage: '45.2', engOrderQty: '1356', inHandDate: '02 May 2026' }
  ];
  
  // Programs whose Process Flow / Equipment / Consumables tabs should render empty
  const EMPTY_PROGRAMS = ['EX02'];

  function getCurrentProgramCode() {
    try {
      var params = new URLSearchParams(window.location.search);
      return (params.get('code') || '').toUpperCase();
    } catch (e) {
      return '';
    }
  }

  function isEmptyProgram() {
    return EMPTY_PROGRAMS.indexOf(getCurrentProgramCode()) !== -1;
  }

  // Export to global scope
  window.DetailData = {
    getBuildStages: function() {
      return buildStages;
    },
    getLines: function() {
      return isEmptyProgram() ? [] : linesData;
    },
    getEquipment: function() {
      return isEmptyProgram() ? [] : equipmentData;
    },
    getConsumables: function() {
      return isEmptyProgram() ? [] : consumablesData;
    }
  };
})();
