/**
 * Catalogue des marques et modeles du parc tunisien.
 *
 * POURQUOI EMBARQUE PLUTOT QU APPELE A DISTANCE.
 *
 * L API publique la plus souvent citee, NHTSA vPIC, est gratuite et sans cle
 * mais couvre le marche AMERICAIN. Interrogee sur Renault, elle rend cinq
 * modeles — LeCar, Fuego, Alliance, Encore, 18i — tous vendus aux Etats-Unis
 * dans les annees 80, et aucun de ceux qui roulent aujourd hui en Tunisie. Elle
 * ne donne par ailleurs ni carburant, ni puissance fiscale, ni annee : ses
 * seuls champs sont Make_ID, Make_Name, Model_ID, Model_Name. Verifie, pas
 * suppose.
 *
 * Une liste embarquee a trois avantages qu aucune API n offrirait ici : elle
 * correspond au parc reel, elle repond instantanement depuis une instance
 * gratuite, et elle ne tombe pas. Le cout est qu il faut l enrichir a la main —
 * c est le bon compromis pour une liste qui bouge d un modele par an.
 *
 * Le champ reste LIBRE cote formulaire : le catalogue suggere, il n interdit
 * pas. Une agence qui loue un modele absent doit pouvoir le saisir plutot que
 * d attendre une mise a jour du code.
 */

export type MarqueVehicule = {
  marque: string;
  modeles: string[];
};

export const CATALOGUE_VEHICULES: MarqueVehicule[] = [
  { marque: 'Renault', modeles: ['Clio', 'Symbol', 'Megane', 'Captur', 'Kangoo', 'Express', 'Duster'] },
  { marque: 'Dacia', modeles: ['Sandero', 'Logan', 'Duster', 'Dokker', 'Lodgy'] },
  { marque: 'Peugeot', modeles: ['208', '301', '2008', '3008', 'Partner', '508', '108'] },
  { marque: 'Citroen', modeles: ['C3', 'C-Elysee', 'C4', 'Berlingo', 'C5 Aircross'] },
  { marque: 'Volkswagen', modeles: ['Polo', 'Golf', 'Passat', 'Tiguan', 'T-Roc', 'Caddy'] },
  { marque: 'Seat', modeles: ['Ibiza', 'Leon', 'Arona', 'Ateca'] },
  { marque: 'Skoda', modeles: ['Fabia', 'Octavia', 'Kamiq', 'Karoq'] },
  { marque: 'Hyundai', modeles: ['i10', 'i20', 'i30', 'Accent', 'Tucson', 'Creta', 'Elantra'] },
  { marque: 'Kia', modeles: ['Picanto', 'Rio', 'Cerato', 'Sportage', 'Stonic', 'Seltos'] },
  { marque: 'Toyota', modeles: ['Yaris', 'Corolla', 'Hilux', 'RAV4', 'Land Cruiser', 'Auris'] },
  { marque: 'Nissan', modeles: ['Micra', 'Juke', 'Qashqai', 'Navara', 'Sunny'] },
  { marque: 'Fiat', modeles: ['500', 'Tipo', 'Panda', 'Doblo', 'Punto'] },
  { marque: 'Ford', modeles: ['Fiesta', 'Focus', 'Kuga', 'Ranger', 'Transit'] },
  { marque: 'Opel', modeles: ['Corsa', 'Astra', 'Crossland', 'Grandland'] },
  { marque: 'Suzuki', modeles: ['Swift', 'Baleno', 'Vitara', 'Jimny', 'Celerio'] },
  { marque: 'Mitsubishi', modeles: ['Space Star', 'ASX', 'L200', 'Outlander'] },
  { marque: 'Chery', modeles: ['Tiggo 2', 'Tiggo 4', 'Tiggo 7', 'Arrizo 5'] },
  { marque: 'MG', modeles: ['MG3', 'MG5', 'ZS', 'HS'] },
  { marque: 'Isuzu', modeles: ['D-Max', 'MU-X'] },
  { marque: 'Mahindra', modeles: ['Scorpio', 'XUV300', 'Pik Up'] },
  { marque: 'Mercedes-Benz', modeles: ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC', 'Vito'] },
  { marque: 'BMW', modeles: ['Serie 1', 'Serie 3', 'Serie 5', 'X1', 'X3'] },
  { marque: 'Audi', modeles: ['A1', 'A3', 'A4', 'Q2', 'Q3', 'Q5'] },
  { marque: 'Volvo', modeles: ['XC40', 'XC60', 'S60'] },
  { marque: 'Jeep', modeles: ['Renegade', 'Compass', 'Wrangler'] },
];

/** Carburants declarables. Le GPL est courant en Tunisie et manquait. */
export const CARBURANTS = [
  { code: 'essence', label: 'Essence' },
  { code: 'diesel', label: 'Diesel' },
  { code: 'hybride', label: 'Hybride' },
  { code: 'electrique', label: 'Electrique' },
  { code: 'gpl', label: 'GPL' },
];
