import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'BlediGo - Reservez en confiance',
  description:
    'La location de logements en Tunisie, en direct avec le proprietaire. Annonces verifiees, aucune commission.',
  keywords:
    'location vacances Tunisie, villa Djerba, appartement Sidi Bou Said, location courte duree',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-body">
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
