import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import PropertyTypeTiles from '@/components/PropertyTypeTiles';
import FeaturedListings from '@/components/FeaturedListings';
import PopularCities from '@/components/PopularCities';
import EscapeIdeas from '@/components/EscapeIdeas';
import TrustIndicators from '@/components/TrustIndicators';
import HowItWorks from '@/components/HowItWorks';
import BecomeHost from '@/components/BecomeHost';
import BecomeProvider from '@/components/BecomeProvider';
import ReverseSearchCTA from '@/components/ReverseSearchCTA';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <div className="container mx-auto px-4 -mt-10 relative z-20">
        <SearchBar />
      </div>
      <TrustIndicators />
      <PropertyTypeTiles />
      <FeaturedListings />
      <PopularCities />
      <ReverseSearchCTA />
      <EscapeIdeas />
      <HowItWorks />
      <BecomeHost />
      <BecomeProvider />
    </main>
  );
}
