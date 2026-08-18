/**
 * Croissant et etoile, le mark de BlediGo.
 *
 * Un composant plutot qu un fichier SVG importe : il doit changer de couleur
 * selon le fond — rouge sur blanc dans l en-tete, blanc en filigrane sur le
 * rouge plein — et `currentColor` le fait sans dupliquer le trace.
 *
 * Le dessin reprend la construction du drapeau tunisien : un disque, un second
 * disque decale qui creuse le croissant, et une etoile a cinq branches logee
 * dans l ouverture. Aucun texte, il accompagne toujours le mot BlediGo.
 */
export default function CroissantEtoile({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      {/* Le croissant se dessine en masquant un disque par un autre : plus
          fidele qu un arc, et le contour reste net a toute taille. */}
      <defs>
        <mask id="creux-croissant">
          <rect width="48" height="48" fill="black" />
          <circle cx="24" cy="24" r="17" fill="white" />
          <circle cx="30" cy="24" r="13.5" fill="black" />
        </mask>
      </defs>
      <circle cx="24" cy="24" r="17" fill="currentColor" mask="url(#creux-croissant)" />
      <path
        d="M31.6 17.6l1.9 4.1 4.5.6-3.3 3.1.8 4.4-4-2.2-4 2.2.8-4.4-3.3-3.1 4.5-.6z"
        fill="currentColor"
      />
    </svg>
  );
}
