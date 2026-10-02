export type Language = "roman" | "ur";

export interface TranslationDictionary {
  // Common / Navigation
  appName: string;
  appSubtitle: string;
  counterOpen: string;
  welcome: string;
  welcomeSubtitle: string;
  newBill: string;
  overview: string;
  workshop: string;
  liveWorkshop: string;
  inventory: string;
  customers: string;
  billsHistory: string;
  supplierCredit: string;
  reports: string;
  mechanics: string;
  moreOptions: string;
  logout: string;
  loggedOut: string;
  search: string;
  filter: string;
  all: string;
  status: string;
  actions: string;
  save: string;
  cancel: string;
  confirm: string;
  delete: string;
  edit: string;
  print: string;
  download: string;
  resetData: string;
  resetConfirmTitle: string;
  resetSuccess: string;
  yes: string;
  no: string;
  loading: string;
  date: string;
  total: string;
  subtotal: string;
  discount: string;
  grandTotal: string;
  paid: string;
  remaining: string;
  paymentMethod: string;
  notes: string;
  success: string;
  today: string;
  karachi: string;

  // Dashboard Stats
  todaySales: string;
  todayBills: string;
  totalInventoryVal: string;
  totalParts: string;
  lowStockAlert: string;
  outOfStock: string;
  supplierPending: string;
  overdueCredit15Days: string;
  activeBikes: string;
  totalMechanicPayable: string;
  quickActions: string;
  recentBills: string;
  urgentStock: string;
  viewAll: string;
  overdueAlertMsg: string;

  // Workshop
  bay: string;
  bayNumber: string;
  liveBikesCount: string;
  newVehicleEntry: string;
  customerName: string;
  customerPhone: string;
  bikeRegNumber: string;
  bikeModel: string;
  complaint: string;
  assignedMechanic: string;
  partsInstalled: string;
  labourCharges: string;
  estimatedTotal: string;
  addPartToBay: string;
  addLabourToBay: string;
  generateBillNow: string;
  freeBay: string;
  inProgress: string;
  waitingForParts: string;
  readyForBill: string;
  completed: string;
  selectMechanic: string;
  shopCut: string;
  mechanicShare: string;

  // Billing / POS
  posTitle: string;
  posSubtitle: string;
  searchPartsPlaceholder: string;
  selectBikeModelPrompt: string;
  customerDetails: string;
  existingCustomer: string;
  newCustomer: string;
  partsInBill: string;
  labourInBill: string;
  addLabour: string;
  clearCart: string;
  completeBill: string;
  customerCopy: string;
  shopCopy: string;
  thermalSlip: string;
  a4Invoice: string;
  shopPolicy: string;
  insufficientStock: string;
  partAdded: string;

  // Inventory
  inventoryTitle: string;
  inventorySubtitle: string;
  addNewPart: string;
  partName: string;
  category: string;
  compatibleBikes: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  minStockAlertLimit: string;
  shelfLocation: string;
  supplierName: string;
  profitMargin: string;
  inStock: string;
  lowStock: string;
  outOfStockStatus: string;
  quickStockAdjust: string;

  // Mechanics
  mechanicsTitle: string;
  mechanicsSubtitle: string;
  addNewMechanic: string;
  mechanicName: string;
  phone: string;
  specialty: string;
  defaultCut: string;
  payableBalance: string;
  recordPayout: string;
  payoutAmount: string;
  payoutNotes: string;
  ledgerHistory: string;
  earning: string;
  payout: string;

  // Customers
  customersTitle: string;
  customersSubtitle: string;
  addNewCustomer: string;
  totalSpent: string;
  visitCount: string;
  purchaseHistory: string;
  customerAddress: string;

  // Bills
  billsTitle: string;
  billsSubtitle: string;
  billNumber: string;
  cancelBillWarning: string;
  cancelBillConfirm: string;
  stockRestored: string;
  cancelled: string;

  // Suppliers
  suppliersTitle: string;
  suppliersSubtitle: string;
  addSupplierPurchase: string;
  purchasedItems: string;
  dueDate: string;
  recordInstallment: string;
  paymentHistoryRecord: string;
  overdueWarning: string;

  // Reports
  reportsTitle: string;
  reportsSubtitle: string;
  dailyReport: string;
  monthlyReport: string;
  yearlyReport: string;
  grossProfit: string;
  topSellingParts: string;
  exportCsv: string;
  quantitySold: string;
  totalRevenue: string;

  // Language switch
  switchLangPrompt: string;
  urduProper: string;
  romanUrdu: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  roman: {
    // Common / Navigation
    appName: "JILANI AUTOS",
    appSubtitle: "Motorcycle Workshop & Spare Parts Software",
    counterOpen: "Counter Khula Hai",
    welcome: "Khush Amdeed, Dukan Ka Khulasa 🏍️",
    welcomeSubtitle: "Bikri, saman ka stock, gahak ka hisab aur workshop sab yahan se control karein.",
    newBill: "Naya Bill Banayein",
    overview: "Dukan Ka Khulasa",
    workshop: "Live Workshop Bay",
    liveWorkshop: "10 Gariyon Ka Live Kaam",
    inventory: "Saman & Stock",
    customers: "Gahak Record",
    billsHistory: "Purane Bills",
    supplierCredit: "Supplier Udhaar",
    reports: "Munafa & Reports",
    mechanics: "Mechanics & Labour",
    moreOptions: "Mazeed Options",
    logout: "Software Se Log Out",
    loggedOut: "Log out ho gaye",
    search: "Talash karein...",
    filter: "Filter",
    all: "Tamam",
    status: "Halat / Status",
    actions: "Actions",
    save: "Mehfooz Karein",
    cancel: "Mansookh Karein",
    confirm: "Tasdeeq Karein",
    delete: "Delete Karein",
    edit: "Tabdeel Karein",
    print: "Print Nikalein",
    download: "Download",
    resetData: "Demo Data Reset",
    resetConfirmTitle: "Kya aap sach mein sample data reset karna chahte hain?",
    resetSuccess: "Data Kamyabi Se Reset Ho Gaya!",
    yes: "Haan",
    no: "Nahi",
    loading: "Thora intezar karein...",
    date: "Tareekh",
    total: "Kul Raqam",
    subtotal: "Subtotal",
    discount: "Discount (Chhoot)",
    grandTotal: "Kul Jama (Final Total)",
    paid: "Wasool Shuda",
    remaining: "Baqaya",
    paymentMethod: "Raqam Ki Adaigi",
    notes: "Tafseelat / Notes",
    success: "Kamyabi!",
    today: "Aaj",
    karachi: "Karachi, Pakistan",

    // Dashboard Stats
    todaySales: "Aaj Ki Bikri (Sales)",
    todayBills: "Aaj Ke Parchiyan (Bills)",
    totalInventoryVal: "Kul Stock Value",
    totalParts: "Kul Saman (Items)",
    lowStockAlert: "Khatam Hone Wala Saman",
    outOfStock: "Stock Khatam",
    supplierPending: "Supplier Baqaya Udhaar",
    overdueCredit15Days: "15+ Din Purana Udhaar",
    activeBikes: "Workshop Mein Active Bicycles/Bikes",
    totalMechanicPayable: "Mechanics Ka Baqaya",
    quickActions: "Fouri Istemal (Quick Actions)",
    recentBills: "Taaza Tareen Bills",
    urgentStock: "Fouri Mangwane Wala Stock (Urgent)",
    viewAll: "Sab Dekhein",
    overdueAlertMsg: "Warning: Kuch supplier udhaar 15 din se zyada purane ho chuke hain!",

    // Workshop
    bay: "Bay",
    bayNumber: "Bay Number",
    liveBikesCount: "Live Kaam Ki Gariyan",
    newVehicleEntry: "Nayi Gari Dakhil Karein",
    customerName: "Gahak Ka Naam",
    customerPhone: "Mobile Number",
    bikeRegNumber: "Gari Number (Registration)",
    bikeModel: "Motorcycle Model",
    complaint: "Kharabi / Masla (Complaint)",
    assignedMechanic: "Muntakhib Mechanic",
    partsInstalled: "Lagaye Gaye Spare Parts",
    labourCharges: "Mazdoori / Ujrat (Labour)",
    estimatedTotal: "Takhmeena Raqam",
    addPartToBay: "Saman / Part Shamil Karein",
    addLabourToBay: "Mazdoori Shamil Karein",
    generateBillNow: "Final Bill Banayein (Counter Pe Bhein)",
    freeBay: "Khali Bay (Jagah Maujood)",
    inProgress: "Kaam Jari Hai",
    waitingForParts: "Saman Ka Intezar",
    readyForBill: "Kaam Mukammal - Bill Ready",
    completed: "Mukammal",
    selectMechanic: "Mechanic Chunein",
    shopCut: "Dukan Ka Hissa",
    mechanicShare: "Mechanic Ka Hissa",

    // Billing / POS
    posTitle: "Counter POS & Naya Bill",
    posSubtitle: "Gahak ko fouri raseed banakar dain, stock khud ba khud kam ho jaye ga.",
    searchPartsPlaceholder: "Saman ka naam ya SKU likh kar talash karein...",
    selectBikeModelPrompt: "Gari Ka Model Chunein",
    customerDetails: "Gahak Ki Maloomat",
    existingCustomer: "Purana Gahak",
    newCustomer: "Naya Gahak",
    partsInBill: "Bill Mein Saman",
    labourInBill: "Mechanic Ujrat / Labour",
    addLabour: "Labour Shamil Karein",
    clearCart: "Cart Khali Karein",
    completeBill: "Bill Mukammal Karein & Print",
    customerCopy: "Gahak Ki Copy",
    shopCopy: "Dukan Ki Copy",
    thermalSlip: "Thermal 80mm Parchi",
    a4Invoice: "A4 / A5 Invoice",
    shopPolicy: "Becha huwa maal wapis ya tabdeel nahi hoga.",
    insufficientStock: "Stock mein itna saman maujood nahi hai!",
    partAdded: "Saman bill mein shamil kar diya gaya!",

    // Inventory
    inventoryTitle: "Saman & Stock Control",
    inventorySubtitle: "Dukan ke tamam parts, khareed qeemat, farokht qeemat aur munafa check karein.",
    addNewPart: "Naya Part Shamil Karein",
    partName: "Saman Ka Naam",
    category: "Category",
    compatibleBikes: "Munasib Motorcycle Models",
    purchasePrice: "Khareed Qeemat (Cost)",
    sellingPrice: "Farokht Qeemat (Sale)",
    currentStock: "Maujooda Tadad",
    minStockAlertLimit: "Kam Stock Warning Limit",
    shelfLocation: "Almari / Rack Location",
    supplierName: "Supplier Ka Naam",
    profitMargin: "Munafa %",
    inStock: "Stock Maujood Hai",
    lowStock: "Stock Kam Hai",
    outOfStockStatus: "Khatam",
    quickStockAdjust: "Stock Kam / Zyada Karein",

    // Mechanics
    mechanicsTitle: "Mechanics & Mazdoori Khata",
    mechanicsSubtitle: "Ustad aur shagirdon ka kaam, dukan ki commission aur hisab kitab.",
    addNewMechanic: "Naya Mechanic Shamil Karein",
    mechanicName: "Mechanic Ka Naam",
    phone: "Phone Number",
    specialty: "Maharat (Specialty)",
    defaultCut: "Dukan Ka Default Hissa %",
    payableBalance: "Mechanic Ka Dena Baqaya",
    recordPayout: "Hisab Chukta Karein (Payment)",
    payoutAmount: "Ada Ki Gayi Raqam",
    payoutNotes: "Adaigi Ki Tafseel",
    ledgerHistory: "Mechanic Ka Khata & Tareekh",
    earning: "Kamayi (Earning)",
    payout: "Adaigi (Paid Out)",

    // Customers
    customersTitle: "Gahak Record & Khata",
    customersSubtitle: "Tamam purane aur naye gahakon ki khareedari aur motorcycle record.",
    addNewCustomer: "Naya Gahak Mehfooz Karein",
    totalSpent: "Kul Khareedari (Lifetime)",
    visitCount: "Chakkar (Visits)",
    purchaseHistory: "Pichli Khareedari Ka Record",
    customerAddress: "Gahak Ka Pata",

    // Bills
    billsTitle: "Purane Bills & Parchiyan",
    billsSubtitle: "Tareekh ke mutabiq bills dekhein, dobara print karein ya cancel karein.",
    billNumber: "Bill Number",
    cancelBillWarning: "Bill cancel karne se tamam saman wapis stock mein jama ho jaye ga!",
    cancelBillConfirm: "Kya aap sach mein ye bill cancel karna chahte hain?",
    stockRestored: "Bill cancel ho gaya aur saman stock mein wapis jama kar diya gaya!",
    cancelled: "Mansookh Shuda",

    // Suppliers
    suppliersTitle: "Supplier Ka Udhaar Khata",
    suppliersSubtitle: "Karachi wholesale market se udhaar khareedari aur qiston ka hisab.",
    addSupplierPurchase: "Naya Udhaar Darj Karein",
    purchasedItems: "Khareeda Huwa Saman",
    dueDate: "Wapsi Ki Tareekh (Due Date)",
    recordInstallment: "Qist / Raqam Jama Karein",
    paymentHistoryRecord: "Adaigi Ka Record",
    overdueWarning: "15 Din Se Zyada Purana Udhaar Pending Hai!",

    // Reports
    reportsTitle: "Munafa & Sales Reports",
    reportsSubtitle: "Rozana, mahana bikri, khalis munafa aur top bikne wale parts ka jaiza.",
    dailyReport: "Rozana Report",
    monthlyReport: "Mahana Report",
    yearlyReport: "Salana Report",
    grossProfit: "Andaza Khalis Munafa",
    topSellingParts: "Sab Se Zyada Bikne Wale Parts",
    exportCsv: "Excel / CSV File Nikalein",
    quantitySold: "Farokht Shuda Tadad",
    totalRevenue: "Kul Amdan",

    // Language switch
    switchLangPrompt: "Zaban Tabdeel Karein",
    urduProper: "اردو (Proper)",
    romanUrdu: "Roman Urdu",
  },

  ur: {
    // Common / Navigation
    appName: "جیلانی آٹوز",
    appSubtitle: "موٹر سائیکل ورکشاپ و اسپیئر پارٹس مینجمنٹ سافٹ ویئر",
    counterOpen: "کاؤنٹر کھلا ہے",
    welcome: "خوش آمدید، دکان کا خلاصہ 🏍️",
    welcomeSubtitle: "آج کی فروخت، سامان کا اسٹاک، گاہکوں کا حساب اور ورکشاپ سب یہاں سے سنبھالیں۔",
    newBill: "نیا بل بنائیں",
    overview: "دکان کا خلاصہ",
    workshop: "لائیو ورکشاپ بے",
    liveWorkshop: "10 گاڑیوں کا لائیو کام",
    inventory: "سامان اور اسٹاک",
    customers: "گاہکوں کا ریکارڈ",
    billsHistory: "پرانے بلز و رسیدیں",
    supplierCredit: "سپلائر ادھار کھاتہ",
    reports: "منافع اور رپورٹس",
    mechanics: "میکینک اور لیبر کھاتہ",
    moreOptions: "مزید اختیارات",
    logout: "سافٹ ویئر سے لاگ آؤٹ",
    loggedOut: "لاگ آؤٹ ہو چکے ہیں",
    search: "تلاش کریں...",
    filter: "فلٹر",
    all: "تمام",
    status: "حالت / کیفیت",
    actions: "کارروائی",
    save: "محفوظ کریں",
    cancel: "منسوخ کریں",
    confirm: "تصدیق کریں",
    delete: "حذف کریں",
    edit: "تبدیل کریں",
    print: "پرنٹ نکالیں",
    download: "ڈاؤن لوڈ",
    resetData: "نمونہ ڈیٹا ری سیٹ",
    resetConfirmTitle: "کیا آپ واقعی نمونہ ڈیٹا دوبارہ شروع کرنا چاہتے ہیں؟",
    resetSuccess: "ڈیٹا کامیابی سے ری سیٹ ہو گیا!",
    yes: "ہاں",
    no: "نہیں",
    loading: "براہ کرم انتظار فرمائیں...",
    date: "تاریخ",
    total: "کل رقم",
    subtotal: "ذیلی رقم",
    discount: "رعایت (ڈسکاؤنٹ)",
    grandTotal: "کل میزان (فائنل ٹوٹل)",
    paid: "وصول شدہ رقم",
    remaining: "بقایا رقم",
    paymentMethod: "طریقہ ادائیگی",
    notes: "تفصیلات / نوٹس",
    success: "کامیابی!",
    today: "آج",
    karachi: "کراچی، پاکستان",

    // Dashboard Stats
    todaySales: "آج کی کل فروخت (سیلز)",
    todayBills: "آج کی پرچیاں (بلز)",
    totalInventoryVal: "اسٹاک کی کل مالیت",
    totalParts: "کل پرزہ جات (آئٹمز)",
    lowStockAlert: "کم اسٹاک کا سامان",
    outOfStock: "اسٹاک ختم ہو چکا",
    supplierPending: "سپلائر کا واجب الادا ادھار",
    overdueCredit15Days: "15+ دن پرانا ادھار",
    activeBikes: "ورکشاپ میں موجود گاڑیاں",
    totalMechanicPayable: "میکینکس کا واجب الادا حصہ",
    quickActions: "فوری شارٹ کٹس",
    recentBills: "حالیہ پرچیاں اور بلز",
    urgentStock: "فوری منگوانے والا اسٹاک (ارجنٹ)",
    viewAll: "تمام دیکھیں",
    overdueAlertMsg: "انتباہ: سپلائر کا کچھ ادھار 15 دن سے زائد پرانا ہو چکا ہے!",

    // Workshop
    bay: "بے نمبر",
    bayNumber: "ورکشاپ بے",
    liveBikesCount: "لائیو کام کے تحت گاڑیاں",
    newVehicleEntry: "نئی گاڑی کا اندراج کریں",
    customerName: "گاہک کا نام",
    customerPhone: "موبائل نمبر",
    bikeRegNumber: "گاڑی کا نمبر (رجسٹریشن)",
    bikeModel: "موٹر سائیکل ماڈل",
    complaint: "خرابی / کام کی نوعیت",
    assignedMechanic: "مقرر کردہ میکینک",
    partsInstalled: "لگائے گئے اسپیئر پارٹس",
    labourCharges: "مزدوری و اجرت (لیبر)",
    estimatedTotal: "تخمینہ رقم",
    addPartToBay: "سامان / پارٹ شامل کریں",
    addLabourToBay: "مزدوری شامل کریں",
    generateBillNow: "فائنل بل بنائیں (کاؤنٹر بھیجیں)",
    freeBay: "خالی بے (جگہ دستیاب)",
    inProgress: "کام جاری ہے",
    waitingForParts: "سامان کا انتظار",
    readyForBill: "کام مکمل - بل تیار",
    completed: "مکمل شدہ",
    selectMechanic: "میکینک منتخب کریں",
    shopCut: "دکان کا حصہ",
    mechanicShare: "میکینک کا حصہ",

    // Billing / POS
    posTitle: "کاؤنٹر بلنگ اور پوائنٹ آف سیل",
    posSubtitle: "گاہک کو فوری رسید بنا کر دیں، اسٹاک سے سامان خود بخود کٹ جائے گا۔",
    searchPartsPlaceholder: "سامان کا نام یا کوڈ لکھ کر تلاش کریں...",
    selectBikeModelPrompt: "موٹر سائیکل کا ماڈل منتخب کریں",
    customerDetails: "گاہک کی معلومات",
    existingCustomer: "پرانا گاہک",
    newCustomer: "نیا گاہک",
    partsInBill: "بل میں شامل پرزہ جات",
    labourInBill: "میکینک اجرت / لیبر چارجز",
    addLabour: "لیبر چارجز شامل کریں",
    clearCart: "کارٹ خالی کریں",
    completeBill: "بل مکمل کریں اور پرنٹ نکالیں",
    customerCopy: "گاہک کی کاپی",
    shopCopy: "دکان کی کاپی",
    thermalSlip: "تھرمل 80 ملی میٹر پرچی",
    a4Invoice: "A4 / A5 مکمل انوائس",
    shopPolicy: "بیچا ہوا مال واپس یا تبدیل نہیں ہوگا۔",
    insufficientStock: "اسٹاک میں اتنا سامان موجود نہیں ہے!",
    partAdded: "سامان بل میں شامل کر دیا گیا!",

    // Inventory
    inventoryTitle: "سامان و اسٹاک کنٹرول",
    inventorySubtitle: "دکان کے تمام پرزے، خرید قیمت، فروخت قیمت اور منافع کا تناسب چیک کریں۔",
    addNewPart: "نیا پارٹ شامل کریں",
    partName: "سامان کا نام",
    category: "کیٹیگری",
    compatibleBikes: "موافق موٹر سائیکل ماڈلز",
    purchasePrice: "خرید قیمت (لاگت)",
    sellingPrice: "فروخت قیمت (سیل)",
    currentStock: "موجودہ تعداد",
    minStockAlertLimit: "کم اسٹاک وارننگ کی حد",
    shelfLocation: "الماری / ریک لوکیشن",
    supplierName: "سپلائر کا نام",
    profitMargin: "منافع فیصد %",
    inStock: "اسٹاک موجود ہے",
    lowStock: "اسٹاک کم ہے",
    outOfStockStatus: "اسٹاک ختم",
    quickStockAdjust: "اسٹاک کم یا زیادہ کریں",

    // Mechanics
    mechanicsTitle: "میکینکس اور لیبر کھاتہ",
    mechanicsSubtitle: "استاد اور شاگردوں کا کام، دکان کی کمیشن اور حساب کتاب۔",
    addNewMechanic: "نیا میکینک شامل کریں",
    mechanicName: "میکینک کا نام",
    phone: "فون نمبر",
    specialty: "مہارت / شعبہ",
    defaultCut: "دکان کا ڈیفالٹ حصہ %",
    payableBalance: "میکینک کا واجب الادا بیلنس",
    recordPayout: "حساب چکتہ کریں (ادائیگی)",
    payoutAmount: "ادا کی گئی رقم",
    payoutNotes: "ادائیگی کی تفصیل",
    ledgerHistory: "میکینک کا لیجر و ہسٹری",
    earning: "کمائی (ارننگ)",
    payout: "ادائیگی (پے آؤٹ)",

    // Customers
    customersTitle: "گاہکوں کا ریکارڈ و کھاتہ",
    customersSubtitle: "تمام پرانے اور نئے گاہکوں کی خریداری اور موٹر سائیکل کی تفصیلات۔",
    addNewCustomer: "نیا گاہک درج کریں",
    totalSpent: "کل خریداری (لائف ٹائم)",
    visitCount: "چکر (وزٹس)",
    purchaseHistory: "سابقہ خریداری کا ریکارڈ",
    customerAddress: "گاہک کا پتہ",

    // Bills
    billsTitle: "پرانے بلز اور انوائسز",
    billsSubtitle: "تاریخ وار بلز دیکھیں، دوبارہ پرنٹ نکالیں یا غلطی کی صورت میں کینسل کریں۔",
    billNumber: "بل نمبر",
    cancelBillWarning: "بل کینسل کرنے پر تمام سامان خود بخود اسٹاک میں واپس جمع ہو جائے گا!",
    cancelBillConfirm: "کیا آپ واقعی یہ بل منسوخ کرنا چاہتے ہیں؟",
    stockRestored: "بل منسوخ ہو گیا اور تمام سامان اسٹاک میں واپس بحال ہو گیا!",
    cancelled: "منسوخ شدہ",

    // Suppliers
    suppliersTitle: "سپلائر ادھار اور کھاتہ",
    suppliersSubtitle: "کراچی ہول سیل مارکیٹ سے خریدا گیا ادھار اور اقساط کا باقاعدہ حساب۔",
    addSupplierPurchase: "نیا ادھار مال درج کریں",
    purchasedItems: "خریدا گیا سامان",
    dueDate: "واپسی کی آخری تاریخ",
    recordInstallment: "قسط / ادھار ادا کریں",
    paymentHistoryRecord: "ادائیگیوں کا ریکارڈ",
    overdueWarning: "15 دن سے زائد پرانا ادھار زیر التواء ہے!",

    // Reports
    reportsTitle: "منافع اور سیلز رپورٹس",
    reportsSubtitle: "روزانہ، ماہانہ اور سالانہ فروخت، خالص منافع اور زیادہ بکنے والے پرزے دیکھیں۔",
    dailyReport: "روزانہ رپورٹ",
    monthlyReport: "ماہانہ رپورٹ",
    yearlyReport: "سالانہ رپورٹ",
    grossProfit: "تخمینہ خالص منافع",
    topSellingParts: "سب سے زیادہ فروخت ہونے والے پرزے",
    exportCsv: "ایکسل / CSV فائل ڈاؤن لوڈ کریں",
    quantitySold: "فروخت شدہ تعداد",
    totalRevenue: "کل آمدن",

    // Language switch
    switchLangPrompt: "زبان تبدیل کریں",
    urduProper: "اردو (Proper)",
    romanUrdu: "Roman Urdu",
  },
};
