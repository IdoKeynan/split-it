const translations = {
  he: {
    dir: 'rtl',
    currency: '₪',
    fontFamily: "'Heebo', 'Inter', sans-serif",
    // Lobby
    subtitle: 'חלוקת חשבון חכמה בין חברים',
    createRoom: 'צור חדר חדש',
    joinRoom: 'הצטרף לחדר קיים',
    back: 'חזרה',
    createRoomTitle: 'צור חדר חדש',
    joinRoomTitle: 'הצטרף לחדר',
    codePlaceholder: 'קוד חדר (6 תווים)',
    namePlaceholder: 'השם שלך',
    loading: 'רגע...',
    letsGo: '!יאללה, נתחיל',
    join: 'הצטרף',
    errorCreate: 'שגיאה ביצירת חדר, נסו שוב',
    errorCodeNotFound: 'קוד חדר לא נמצא',
    errorJoin: 'שגיאה בהצטרפות לחדר',
    langLabel: 'שפה',
    // Header
    headerSubtitle: 'חלוקת חשבון חכמה',
    shareCode: 'שתף קוד',
    codeCopied: 'הקוד הועתק!',
    // Bill screen
    loadingRoom: 'טוען את החדר...',
    roomCode: 'קוד חדר',
    items: 'פריטים',
    participants: 'משתתפים',
    me: '(אני)',
    noDishes: 'אין עדיין מנות',
    noDishesHint: 'הוסיפו מנות כדי להתחיל לחלק',
    // Item card
    person: 'אדם',
    people: 'אנשים',
    myShare: 'החלק שלי:',
    claimed: '✓ בפנים',
    claimIt: 'צרף אותי',
    // Tip
    tip: 'טיפ',
    tipAmount: 'סכום',
    // Add dish
    addDish: 'הוסף מנה',
    newDish: 'מנה חדשה',
    dishName: 'שם המנה',
    price: 'מחיר',
    add: 'הוסף',
    // Total
    totalDishes: 'סה"כ מנות',
    tipLabel: 'טיפ',
    toPay: 'לתשלום',
    // Share
    shareText: 'הצטרפו לחלוקת חשבון!',
    // OCR
    scanReceipt: 'סרוק חשבון',
    scanning: 'סורק...',
    scanError: 'שגיאה בסריקה, נסו שוב',
    scanEmpty: 'לא נמצאו מנות בתמונה',
    scanPreviewTitle: 'מנות שנמצאו',
    scanAddAll: 'הוסף הכל',
    scanCancel: 'ביטול',
    scanRemoveItem: 'הסר',
  },
  en: {
    dir: 'ltr',
    currency: '₪',
    fontFamily: "'Inter', 'Heebo', sans-serif",
    // Lobby
    subtitle: 'Smart bill splitting with friends',
    createRoom: 'Create New Room',
    joinRoom: 'Join Existing Room',
    back: 'Back',
    createRoomTitle: 'Create New Room',
    joinRoomTitle: 'Join Room',
    codePlaceholder: 'Room code (6 chars)',
    namePlaceholder: 'Your name',
    loading: 'Wait...',
    letsGo: "Let's go!",
    join: 'Join',
    errorCreate: 'Error creating room, try again',
    errorCodeNotFound: 'Room code not found',
    errorJoin: 'Error joining room',
    langLabel: 'Language',
    // Header
    headerSubtitle: 'Smart bill splitting',
    shareCode: 'Share',
    codeCopied: 'Link copied!',
    // Bill screen
    loadingRoom: 'Loading room...',
    roomCode: 'Room Code',
    items: 'Items',
    participants: 'Participants',
    me: '(me)',
    noDishes: 'No dishes yet',
    noDishesHint: 'Add dishes to start splitting',
    // Item card
    person: 'person',
    people: 'people',
    myShare: 'My share:',
    claimed: '✓ I\'m in!',
    claimIt: 'Count me in',
    // Tip
    tip: 'Tip',
    tipAmount: 'Amount',
    // Add dish
    addDish: 'Add Dish',
    newDish: 'New Dish',
    dishName: 'Dish name',
    price: 'Price',
    add: 'Add',
    // Total
    totalDishes: 'Dishes subtotal',
    tipLabel: 'Tip',
    toPay: 'To Pay',
    // Share
    shareText: 'Join our bill split!',
    // OCR
    scanReceipt: 'Scan Receipt',
    scanning: 'Scanning...',
    scanError: 'Scan failed, try again',
    scanEmpty: 'No dishes found in image',
    scanPreviewTitle: 'Dishes Found',
    scanAddAll: 'Add All',
    scanCancel: 'Cancel',
    scanRemoveItem: 'Remove',
  },
}

export function t(lang, key) {
  return translations[lang]?.[key] || translations.he[key] || key
}

export function getLangConfig(lang) {
  return { dir: translations[lang]?.dir || 'rtl', currency: translations[lang]?.currency || '₪', fontFamily: translations[lang]?.fontFamily }
}
