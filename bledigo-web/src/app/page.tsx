import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import FeaturedListings from '@/components/FeaturedListings';
import TrustIndicators from '@/components/TrustIndicators';
import HowItWorks from '@/components/HowItWorks';
import ReverseSearchCTA from '@/components/ReverseSearchCTA';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <div className="container mx-auto px-4 -mt-10 relative z-20">
        <SearchBar />
      </div>
      <TrustIndicators />
      <FeaturedListings />
      <HowItWorks />
      <ReverseSearchCTA />
    </main>
  );
}
