/**
 * Internationalisation legere : pas de dependance externe, dictionnaires en dur.
 * L arabe declenche le mode RTL (voir le provider I18nProvider).
 */

export const LOCALES = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_META: Record<Locale, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  fr: { label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  en: { label: 'English', flag: '🇬🇧', dir: 'ltr' },
  ar: { label: 'العربية', flag: '🇹🇳', dir: 'rtl' },
};

export const DEFAULT_LOCALE: Locale = 'fr';

type Dict = Record<string, string>;

const fr: Dict = {
  'nav.search': 'Rechercher',
  'nav.map': 'Carte',
  'nav.needs': 'Publier un besoin',
  'nav.requests': 'Demandes de ma zone',
  'mode.traveler': 'Voyageur',
  'mode.owner': 'Hote',
  'mode.switch': 'Changer de mode',
  'nav.login': 'Connexion',
  'nav.register': 'Inscription',
  'nav.logout': 'Deconnexion',
  'nav.bookings': 'Mes reservations',
  'nav.owner': 'Espace proprietaire',
  'nav.agency': 'Espace agence',
  'nav.credits': 'Credits',
  'nav.admin': 'Back-office',
  'nav.language': 'Langue',
  'nav.currency': 'Devise',
  'nav.theme': 'Theme',

  'home.hero.title': 'Louez en Tunisie, en toute confiance',
  'home.hero.subtitle': 'Appartements, villas, maisons d hotes — verifies par nos agents',
  'home.types.title': 'Decouvrez nos types de logements',
  'home.cities.title': 'Destinations populaires',
  'home.cities.subtitle': 'Les villes ou nos voyageurs reservent le plus',
  'home.ideas.title': 'Des idees pour vos prochaines escapades',
  'home.host.title': 'Devenez hote',
  'home.host.body':
    'Vous avez un logement a louer en Tunisie ? Rejoignez BlediGo et louez sereinement : paiement securise, voyageurs verifies, assistance en cas de litige.',
  'home.host.cta': 'Commencer maintenant',
  'home.host.note': 'Inscription gratuite · Certification offerte la premiere annee',
  'home.why.title': 'Pourquoi BlediGo ?',

  'city.properties': 'logements',
  'city.from': 'a partir de',
  'city.see': 'Voir',
  'city.seeAll': 'Voir tous les logements',
  'city.empty': 'Aucun logement disponible dans cette ville pour le moment.',

  'map.title': 'Recherche sur la carte',
  'map.draw': 'Dessiner une zone',
  'map.drawing': 'Cliquez sur la carte pour tracer, double-clic pour fermer',
  'map.clear': 'Effacer la zone',
  'map.results': 'logements dans cette zone',
  'map.searchHere': 'Rechercher dans cette zone',

  'common.night': 'nuit',
  'common.guests': 'voyageurs',
  'common.bedrooms': 'chambres',
  'common.bathrooms': 'salles de bain',
  'common.loading': 'Chargement...',
  'common.showMore': 'Afficher plus',
  'common.showLess': 'Afficher moins',
};

const en: Dict = {
  'nav.search': 'Search',
  'nav.map': 'Map',
  'nav.needs': 'Post a request',
  'nav.requests': 'Requests in my area',
  'mode.traveler': 'Traveller',
  'mode.owner': 'Host',
  'mode.switch': 'Switch mode',
  'nav.login': 'Log in',
  'nav.register': 'Sign up',
  'nav.logout': 'Log out',
  'nav.bookings': 'My bookings',
  'nav.owner': 'Host area',
  'nav.agency': 'Agency area',
  'nav.credits': 'Credits',
  'nav.admin': 'Back office',
  'nav.language': 'Language',
  'nav.currency': 'Currency',
  'nav.theme': 'Theme',

  'home.hero.title': 'Rent in Tunisia, with confidence',
  'home.hero.subtitle': 'Apartments, villas and guest houses — verified by our agents',
  'home.types.title': 'Browse by property type',
  'home.cities.title': 'Popular destinations',
  'home.cities.subtitle': 'Where our travellers book the most',
  'home.ideas.title': 'Ideas for your next getaway',
  'home.host.title': 'Become a host',
  'home.host.body':
    'Do you have a place to rent in Tunisia? Join BlediGo and rent with peace of mind: secure payment, verified travellers, dispute support.',
  'home.host.cta': 'Get started',
  'home.host.note': 'Free to join · Certification free for the first year',
  'home.why.title': 'Why BlediGo?',

  'city.properties': 'properties',
  'city.from': 'from',
  'city.see': 'View',
  'city.seeAll': 'View all properties',
  'city.empty': 'No properties available in this city yet.',

  'map.title': 'Map search',
  'map.draw': 'Draw an area',
  'map.drawing': 'Click on the map to draw, double-click to close',
  'map.clear': 'Clear area',
  'map.results': 'properties in this area',
  'map.searchHere': 'Search this area',

  'common.night': 'night',
  'common.guests': 'guests',
  'common.bedrooms': 'bedrooms',
  'common.bathrooms': 'bathrooms',
  'common.loading': 'Loading...',
  'common.showMore': 'Show more',
  'common.showLess': 'Show less',
};

const ar: Dict = {
  'nav.search': 'بحث',
  'nav.map': 'الخريطة',
  'nav.needs': 'انشر طلبك',
  'nav.requests': 'طلبات منطقتي',
  'mode.traveler': 'مسافر',
  'mode.owner': 'مضيف',
  'mode.switch': 'تغيير الوضع',
  'nav.login': 'تسجيل الدخول',
  'nav.register': 'إنشاء حساب',
  'nav.logout': 'تسجيل الخروج',
  'nav.bookings': 'حجوزاتي',
  'nav.owner': 'فضاء المالك',
  'nav.agency': 'فضاء الوكالة',
  'nav.credits': 'الأرصدة',
  'nav.admin': 'لوحة الإدارة',
  'nav.language': 'اللغة',
  'nav.currency': 'العملة',
  'nav.theme': 'المظهر',

  'home.hero.title': 'استأجر في تونس بكل ثقة',
  'home.hero.subtitle': 'شقق وفيلات ودور ضيافة — تم التحقق منها من طرف وكلائنا',
  'home.types.title': 'تصفح حسب نوع السكن',
  'home.cities.title': 'وجهات مشهورة',
  'home.cities.subtitle': 'المدن الأكثر حجزًا لدى مسافرينا',
  'home.ideas.title': 'أفكار لرحلتك القادمة',
  'home.host.title': 'كن مضيفًا',
  'home.host.body':
    'هل لديك سكن للكراء في تونس؟ انضم إلى BlediGo واكتر بكل اطمئنان: دفع آمن، مسافرون موثوقون، ومساندة عند النزاع.',
  'home.host.cta': 'ابدأ الآن',
  'home.host.note': 'التسجيل مجاني · الشهادة مجانية السنة الأولى',
  'home.why.title': 'لماذا BlediGo؟',

  'city.properties': 'سكن',
  'city.from': 'ابتداءً من',
  'city.see': 'عرض',
  'city.seeAll': 'عرض كل المساكن',
  'city.empty': 'لا يوجد سكن متاح في هذه المدينة حاليًا.',

  'map.title': 'البحث على الخريطة',
  'map.draw': 'ارسم منطقة',
  'map.drawing': 'انقر على الخريطة للرسم، ونقرتان للإغلاق',
  'map.clear': 'مسح المنطقة',
  'map.results': 'سكن في هذه المنطقة',
  'map.searchHere': 'ابحث في هذه المنطقة',

  'common.night': 'ليلة',
  'common.guests': 'مسافرين',
  'common.bedrooms': 'غرف',
  'common.bathrooms': 'حمامات',
  'common.loading': 'جارٍ التحميل...',
  'common.showMore': 'عرض المزيد',
  'common.showLess': 'عرض أقل',
};

export const DICTIONARIES: Record<Locale, Dict> = { fr, en, ar };

/** Traduit une cle ; retombe sur le francais puis sur la cle elle-meme. */
export function translate(locale: Locale, key: string): string {
  return DICTIONARIES[locale]?.[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
}
