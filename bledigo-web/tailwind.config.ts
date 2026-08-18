import type { Config } from 'tailwindcss';

/**
 * Palette « couleurs tunisiennes ».
 *
 * Le drapeau donne le rouge et le blanc ; le sable et l encre donnent le reste.
 * Les JETONS changent de valeur, pas de nom : `bledi-blue` ne designe plus un
 * bleu mais l encre sombre. Renommer aurait oblige a toucher 179 appels dans
 * 53 fichiers pour un resultat visuel identique, avec autant d occasions de
 * casser une page au passage.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // `src/lib` manquait, et cela se voyait : CERTIFICATIONS y stocke les noms
    // de classes des badges (`badge-gold`...). Tailwind ne les voyait nulle
    // part, purgeait les regles correspondantes, et les badges de
    // certification s affichaient en texte nu depuis toujours.
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/store/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  /**
   * Les quatre badges se construisent aussi par interpolation ailleurs
   * (`badge-${niveau}`), forme qu aucun scan de texte ne peut resoudre. On les
   * inscrit donc explicitement plutot que de dependre d une occurrence
   * litterale qu un refactor ferait disparaitre en silence.
   */
  safelist: ['badge-bronze', 'badge-silver', 'badge-gold', 'badge-diamond'],
  theme: {
    extend: {
      colors: {
        /** Encre chaude. Ex-bleu marine : le nom du jeton est conserve. */
        'bledi-blue': '#1C1410',
        /** Rouge du drapeau. Accent principal : CTA, emphase, pastilles. */
        'bledi-red': '#C8102E',
        /**
         * Or sable. Reserve au MERITE — certifications et etoiles de note.
         * Ne pas l utiliser comme accent : c est le role du rouge, et melanger
         * les deux fait perdre au dore sa valeur de distinction.
         */
        'bledi-gold': '#D4A574',
        'mediterranean': '#00A9CE',
        'olive': '#7A8450',
        /** Sable chaud, fond general. */
        'cream': '#F6F1E7',
        'charcoal': '#1C1410',
        'slate': '#8A7D6F',
        'cloud': '#EDE5D8',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'Georgia', 'serif'],
        body: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        accent: ['Bricolage Grotesque', 'Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'bledi': '16px',
        'bledi-sm': '12px',
      },
      boxShadow: {
        // Ombres reaccordees sur l encre chaude : une ombre bleutee sur un fond
        // sable donne un gris verdatre.
        'bledi': '0 4px 24px rgba(28, 20, 16, 0.08)',
        'bledi-hover': '0 8px 32px rgba(28, 20, 16, 0.14)',
      },
    },
  },
  plugins: [],
};

export default config;
