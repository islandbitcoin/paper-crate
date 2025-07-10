export default {
  // Site metadata
  name: "Paper Crate",
  description:
    "A decentralized platform connecting businesses with content creators for authentic social media campaigns. Powered by Bitcoin micropayments and the Nostr protocol.",

  // Build configuration
  build: {
    // Source directory (where built files are)
    source: "./dist",
    // Output directory for nsite
    output: "./nsite-dist",
  },

  // Nostr configuration
  nostr: {
    // Relays to publish to
    relays: [
      "wss://relay.nostr.band",
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.snort.social",
      "wss://nostr.wine",
      "wss://nostr-pub.wellorder.net",
      "wss://nostr.oxtr.dev",
      "wss://purplepag.es",
      "wss://relay.primal.net",
    ],

    // Site metadata tags
    tags: [
      ["t", "creator-economy"],
      ["t", "nostr"],
      ["t", "bitcoin"],
      ["t", "lightning"],
      ["t", "micropayments"],
      ["t", "influencer-marketing"],
      ["t", "social-media"],
      ["subject", "Nostr Creator Economy Platform"],
      ["summary", "Connect businesses with creators for Bitcoin-powered social media campaigns"],
    ],
  },

  // Site configuration
  site: {
    // Custom domain (optional)
    // domain: "creator-economy.nostr",

    // Site icon/favicon
    icon: "/favicon.ico",

    // Additional meta tags
    meta: {
      "og:type": "website",
      "og:title": "Paper Crate - Connect Businesses with Creators",
      "og:description":
        "A decentralized platform connecting businesses with content creators for authentic social media campaigns. Powered by Bitcoin micropayments and the Nostr protocol.",
      "twitter:card": "summary_large_image",
      "twitter:title": "Paper Crate",
      "twitter:description": "Decentralized marketing on Nostr with Bitcoin payments",
    },
  },
};
