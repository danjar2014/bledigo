'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, writeTokens } from '@/lib/api';
import { useAuth } from '@/store/auth';

/**
 * Connexion Google, facon Airbnb : email ou Google, rien d autre.
 *
 * Le bouton est rendu par Google lui-meme (Google Identity Services) plutot
 * que dessine a la main : sa charte impose l apparence officielle, et un bouton
 * maison expose au rejet lors de la validation.
 *
 * Si l identifiant client n est pas configure, le composant ne s affiche pas.
 * Mieux vaut aucun bouton qu un bouton qui echoue : l email reste disponible.
 */

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleButton({ onError }: { onError?: (m: string) => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const conteneur = useRef<HTMLDivElement>(null);
  const [pret, setPret] = useState(false);
  const router = useRouter();
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    if (!clientId) return;

    const initialiser = () => {
      if (!window.google?.accounts?.id || !conteneur.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (reponse: any) => {
          try {
            const donnees = await api.googleLogin(reponse.credential);
            writeTokens({ accessToken: donnees.accessToken, refreshToken: donnees.refreshToken });
            await hydrate();
            router.push('/');
          } catch (e) {
            onError?.((e as Error).message || 'Connexion Google impossible');
          }
        },
      });

      window.google.accounts.id.renderButton(conteneur.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
        locale: 'fr',
      });
      setPret(true);
    };

    if (window.google?.accounts?.id) {
      initialiser();
      return;
    }

    // Le script n est charge qu ici : inutile de le servir aux visiteurs qui ne
    // passent jamais par la connexion.
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initialiser;
    document.head.appendChild(script);
  }, [clientId, onError, hydrate, router]);

  if (!clientId) return null;

  return (
    <div className="mb-4">
      <div ref={conteneur} className="flex justify-center" />
      {!pret && <div className="h-10 rounded-bledi-sm bg-cloud animate-pulse" />}

      <div className="flex items-center gap-3 my-4">
        <span className="flex-1 h-px bg-cloud" />
        <span className="text-xs text-slate">ou</span>
        <span className="flex-1 h-px bg-cloud" />
      </div>
    </div>
  );
}
