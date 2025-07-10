import { useSeoMeta } from '@unhead/react';
import { Dashboard } from './Dashboard';

const Index = () => {
  useSeoMeta({
    title: 'Paper Crate - Connect Businesses with Creators',
    description: 'A decentralized platform connecting businesses with content creators for authentic social media campaigns. Powered by Bitcoin micropayments and the Nostr protocol.',
  });

  return <Dashboard />;
};

export default Index;
