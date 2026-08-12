// Enums BlediGo - repris de schema.postgres.prisma.
// SQLite ne supporte pas les enums natifs : on les expose ici pour garder le typage TS.

export enum UserRole {
  traveler = 'traveler',
  owner = 'owner',
  agency = 'agency',
  admin = 'admin',
  agent = 'agent',
  support = 'support',
}

export enum UserStatus {
  active = 'active',
  watched = 'watched',
  limited = 'limited',
  suspended = 'suspended',
  banned = 'banned',
}

export enum PropertyType {
  apartment = 'apartment',
  villa = 'villa',
  house = 'house',
  studio = 'studio',
  riad = 'riad',
  bungalow = 'bungalow',
  penthouse = 'penthouse',
  chalet = 'chalet',
}

export enum ListingStatus {
  draft = 'draft',
  pending = 'pending',
  active = 'active',
  inactive = 'inactive',
  suspended = 'suspended',
  under_review = 'under_review',
}

export enum CertificationLevel {
  none = 'none',
  bronze = 'bronze',
  silver = 'silver',
  gold = 'gold',
  diamond = 'diamond',
}

export enum BookingStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  checked_in = 'checked_in',
  validated = 'validated',
  completed = 'completed',
  cancelled = 'cancelled',
  disputed = 'disputed',
}

export enum PaymentStatus {
  pending = 'pending',
  held = 'held',
  captured = 'captured',
  refunded = 'refunded',
  partial_refund = 'partial_refund',
  failed = 'failed',
}

export enum ValidationStatus {
  pending = 'pending',
  validated = 'validated',
  auto_validated = 'auto_validated',
  disputed = 'disputed',
  /**
   * Le voyageur a refuse le logement a l arrivee : la reservation est annulee
   * et rien n est preleve. A distinguer du litige, qui laisse le paiement
   * bloque le temps de l instruction.
   */
  refused = 'refused',
}

export enum DisputeType {
  non_conform = 'non_conform',
  dirty = 'dirty',
  missing_amenities = 'missing_amenities',
  false_location = 'false_location',
  damage = 'damage',
  payment = 'payment',
  other = 'other',
}

export enum DisputeStatus {
  pending = 'pending',
  analysis = 'analysis',
  missing_docs = 'missing_docs',
  amicable = 'amicable',
  bledigo_decision = 'bledigo_decision',
  refunded = 'refunded',
  rejected = 'rejected',
}

export enum EvidenceType {
  photo = 'photo',
  video = 'video',
  document = 'document',
  screenshot = 'screenshot',
  message = 'message',
  invoice = 'invoice',
}

export enum ReviewType {
  traveler_to_listing = 'traveler_to_listing',
  traveler_to_owner = 'traveler_to_owner',
  owner_to_traveler = 'owner_to_traveler',
}

export enum MessageType {
  text = 'text',
  photo = 'photo',
  video = 'video',
  document = 'document',
  voice = 'voice',
}

export enum SubscriptionType {
  owner_pro = 'owner_pro',
  owner_premium = 'owner_premium',
  agency = 'agency',
}

export enum SubscriptionStatus {
  active = 'active',
  cancelled = 'cancelled',
  expired = 'expired',
}

export enum InsuranceType {
  cancellation = 'cancellation',
  damage = 'damage',
  theft = 'theft',
  assistance = 'assistance',
  liability = 'liability',
}

export enum InsuranceProvider {
  internal = 'internal',
  axa = 'axa',
  allianz = 'allianz',
  groupama = 'groupama',
}

export enum InsuranceStatus {
  active = 'active',
  claimed = 'claimed',
  settled = 'settled',
  expired = 'expired',
}

export enum SanctionType {
  watch = 'watch',
  limit = 'limit',
  suspend = 'suspend',
  ban = 'ban',
}

export enum ReverseSearchStatus {
  active = 'active',
  fulfilled = 'fulfilled',
  expired = 'expired',
  cancelled = 'cancelled',
}

export enum ReverseOfferStatus {
  /** En attente du voyageur : c est a lui d accepter, refuser ou contre-proposer. */
  pending = 'pending',
  /** Le voyageur a contre-propose : la main est au proprietaire. */
  countered = 'countered',
  accepted = 'accepted',
  rejected = 'rejected',
  expired = 'expired',
}

export enum Currency {
  EUR = 'EUR',
  TND = 'TND',
  USD = 'USD',
}
