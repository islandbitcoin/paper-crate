#!/usr/bin/env node

/**
 * Nostr Creator Economy - Deployment Verification Script
 * Verifies that the site was successfully deployed to Nostr via nsite
 */

import { WebSocket } from "ws";
import { getPublicKey, nip19 } from "nostr-tools";

// Configuration
const RELAYS = ["wss://relay.nostr.band", "wss://relay.damus.io", "wss://nos.lol", "wss://relay.snort.social", "wss://nostr.wine", "wss://purplepag.es"];

const SEARCH_TAGS = ["creator-economy", "nostr", "bitcoin", "lightning"];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

// Get public key from environment or prompt
function getPublicKeyFromEnv() {
  const privateKey = process.env.NOSTR_PRIVATE_KEY;
  if (!privateKey) {
    logWarning("NOSTR_PRIVATE_KEY not found in environment");
    return null;
  }

  try {
    // Remove nsec prefix if present
    const cleanKey = privateKey.startsWith("nsec1") ? nip19.decode(privateKey).data : privateKey;

    const pubkey = getPublicKey(cleanKey);
    const npub = nip19.npubEncode(pubkey);

    return { pubkey, npub };
  } catch (error) {
    logError(`Invalid private key format: ${error.message}`);
    return null;
  }
}

// Test relay connectivity
async function testRelay(relayUrl) {
  return new Promise((resolve) => {
    const ws = new WebSocket(relayUrl);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ url: relayUrl, connected: false, error: "Timeout" });
    }, 5000);

    ws.on("open", () => {
      clearTimeout(timeout);
      ws.close();
      resolve({ url: relayUrl, connected: true });
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ url: relayUrl, connected: false, error: error.message });
    });
  });
}

// Search for events on a relay
async function searchEvents(relayUrl, filters) {
  return new Promise((resolve) => {
    const ws = new WebSocket(relayUrl);
    const events = [];
    const timeout = setTimeout(() => {
      ws.close();
      resolve(events);
    }, 10000);

    ws.on("open", () => {
      // Send subscription request
      const subId = Math.random().toString(36).substring(7);
      ws.send(JSON.stringify(["REQ", subId, ...filters]));
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message[0] === "EVENT") {
          events.push(message[2]);
        } else if (message[0] === "EOSE") {
          clearTimeout(timeout);
          ws.close();
          resolve(events);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    });

    ws.on("error", () => {
      clearTimeout(timeout);
      resolve(events);
    });
  });
}

// Main verification function
async function verifyDeployment() {
  log("\n🔍 Verifying Nostr Creator Economy Deployment\n", "cyan");

  // Step 1: Check public key
  const keyInfo = getPublicKeyFromEnv();
  if (keyInfo) {
    logSuccess(`Found public key: ${keyInfo.npub}`);
  } else {
    logWarning("Could not determine public key - will search by tags only");
  }

  // Step 2: Test relay connectivity
  logInfo("\nTesting relay connectivity...");
  const relayTests = await Promise.all(RELAYS.map(testRelay));

  let connectedRelays = 0;
  relayTests.forEach((result) => {
    if (result.connected) {
      logSuccess(`Connected to ${result.url}`);
      connectedRelays++;
    } else {
      logError(`Failed to connect to ${result.url}: ${result.error}`);
    }
  });

  if (connectedRelays === 0) {
    logError("No relays are accessible - cannot verify deployment");
    process.exit(1);
  }

  logInfo(`\n${connectedRelays}/${RELAYS.length} relays are accessible\n`);

  // Step 3: Search for site events
  logInfo("Searching for site events...");

  const searchFilters = [
    // Search by tags
    {
      kinds: [30023], // Long-form content (nsite events)
      "#t": SEARCH_TAGS,
      limit: 10,
    },
  ];

  // Add author filter if we have the public key
  if (keyInfo) {
    searchFilters.push({
      kinds: [30023],
      authors: [keyInfo.pubkey],
      limit: 10,
    });
  }

  let totalEvents = 0;
  const eventsByRelay = {};

  for (const relay of RELAYS) {
    const relayTest = relayTests.find((r) => r.url === relay);
    if (!relayTest.connected) continue;

    logInfo(`Searching ${relay}...`);
    const events = await searchEvents(relay, searchFilters);
    eventsByRelay[relay] = events;
    totalEvents += events.length;

    if (events.length > 0) {
      logSuccess(`Found ${events.length} events on ${relay}`);

      // Show event details
      events.forEach((event) => {
        const tags = event.tags.filter((tag) => tag[0] === "t").map((tag) => tag[1]);
        const title = event.tags.find((tag) => tag[0] === "title")?.[1] || "Untitled";
        log(`  📄 ${title} (tags: ${tags.join(", ")})`, "cyan");
      });
    } else {
      logWarning(`No events found on ${relay}`);
    }
  }

  // Step 4: Summary
  log("\n📊 Deployment Verification Summary\n", "cyan");

  if (totalEvents > 0) {
    logSuccess(`Found ${totalEvents} total events across ${connectedRelays} relays`);
    logSuccess("Your site appears to be successfully deployed to Nostr!");

    log("\n🌐 Access your site:", "blue");
    if (keyInfo) {
      log(`  • njump.me: https://njump.me/${keyInfo.npub}`, "cyan");
    }
    log(`  • Search tags: ${SEARCH_TAGS.join(", ")}`, "cyan");
    log("  • Use any Nostr client that supports long-form content (NIP-23)", "cyan");
  } else {
    logWarning("No site events found on any relay");
    log("\nPossible reasons:", "yellow");
    log("  • Site not yet deployed", "yellow");
    log("  • Events still propagating across relays", "yellow");
    log("  • Different tags or author used", "yellow");
    log("  • Relays not storing the events", "yellow");

    log("\nTroubleshooting:", "blue");
    log("  • Try deploying again: npm run deploy:nsite", "cyan");
    log("  • Check nsite configuration in nsite.config.js", "cyan");
    log("  • Wait a few minutes for event propagation", "cyan");
    log("  • Verify your private key is correct", "cyan");
  }

  // Step 5: Relay health summary
  log("\n🏥 Relay Health:", "blue");
  relayTests.forEach((result) => {
    const status = result.connected ? "🟢 Online" : "🔴 Offline";
    const events = eventsByRelay[result.url]?.length || 0;
    log(`  ${status} ${result.url} (${events} events)`, "cyan");
  });

  log("\n✨ Verification complete!\n", "green");
}

// Run verification
verifyDeployment().catch((error) => {
  logError(`Verification failed: ${error.message}`);
  process.exit(1);
});
