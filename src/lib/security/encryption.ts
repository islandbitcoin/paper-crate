/**
 * Encryption utilities for sensitive data protection
 */
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { securityMonitor, type SecurityEventType } from './monitoring';

/**
 * Encrypt sensitive content using NIP-44 encryption
 * This is used for private messages and sensitive campaign data
 */
interface NIP44Signer {
  nip44?: {
    encrypt: (pubkey: string, content: string) => Promise<string>;
    decrypt: (pubkey: string, encrypted: string) => Promise<string>;
  };
}

export async function encryptContent(
  signer: NIP44Signer,
  recipientPubkey: string,
  content: string
): Promise<string | null> {
  try {
    if (!signer.nip44) {
      throw new Error('NIP-44 encryption not supported by signer');
    }

    const encrypted = await signer.nip44.encrypt(recipientPubkey, content);
    
    securityMonitor.logEvent({
      type: 'data_encrypted' as SecurityEventType,
      userId: recipientPubkey,
      details: { 
        contentLength: content.length,
        method: 'nip44'
      },
      severity: 'low',
    });

    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    securityMonitor.logEvent({
      type: 'encryption_failed' as SecurityEventType,
      userId: recipientPubkey,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'nip44'
      },
      severity: 'high',
    });
    return null;
  }
}

/**
 * Decrypt content using NIP-44 decryption
 */
export async function decryptContent(
  signer: NIP44Signer,
  senderPubkey: string,
  encryptedContent: string
): Promise<string | null> {
  try {
    if (!signer.nip44) {
      throw new Error('NIP-44 decryption not supported by signer');
    }

    const decrypted = await signer.nip44.decrypt(senderPubkey, encryptedContent);
    
    securityMonitor.logEvent({
      type: 'data_decrypted' as SecurityEventType,
      userId: senderPubkey,
      details: { 
        method: 'nip44'
      },
      severity: 'low',
    });

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    securityMonitor.logEvent({
      type: 'decryption_failed' as SecurityEventType,
      userId: senderPubkey,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'nip44'
      },
      severity: 'medium',
    });
    return null;
  }
}

/**
 * Hook for encrypting campaign data
 */
export function useEncryption() {
  const { user } = useCurrentUser();

  const encryptForSelf = async (content: string): Promise<string | null> => {
    if (!user?.signer || !user?.pubkey) {
      console.error('No user or signer available');
      return null;
    }

    return encryptContent(user.signer as NIP44Signer, user.pubkey, content);
  };

  const decryptFromSelf = async (encryptedContent: string): Promise<string | null> => {
    if (!user?.signer || !user?.pubkey) {
      console.error('No user or signer available');
      return null;
    }

    return decryptContent(user.signer as NIP44Signer, user.pubkey, encryptedContent);
  };

  const encryptFor = async (recipientPubkey: string, content: string): Promise<string | null> => {
    if (!user?.signer) {
      console.error('No signer available');
      return null;
    }

    return encryptContent(user.signer as NIP44Signer, recipientPubkey, content);
  };

  const decryptFrom = async (senderPubkey: string, encryptedContent: string): Promise<string | null> => {
    if (!user?.signer) {
      console.error('No signer available');
      return null;
    }

    return decryptContent(user.signer as NIP44Signer, senderPubkey, encryptedContent);
  };

  return {
    encryptForSelf,
    decryptFromSelf,
    encryptFor,
    decryptFrom,
    isAvailable: !!user?.signer?.nip44,
  };
}

/**
 * Encrypt sensitive fields in an object
 */
export async function encryptObjectFields(
  signer: NIP44Signer,
  recipientPubkey: string,
  obj: Record<string, unknown>,
  fieldsToEncrypt: string[]
): Promise<Record<string, unknown>> {
  const encrypted = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (field in encrypted && encrypted[field]) {
      const encryptedValue = await encryptContent(
        signer,
        recipientPubkey,
        JSON.stringify(encrypted[field])
      );
      
      if (encryptedValue) {
        encrypted[field] = encryptedValue;
        encrypted[`${field}_encrypted`] = true;
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in an object
 */
export async function decryptObjectFields(
  signer: NIP44Signer,
  senderPubkey: string,
  obj: Record<string, unknown>,
  fieldsToDecrypt: string[]
): Promise<Record<string, unknown>> {
  const decrypted = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (decrypted[`${field}_encrypted`] && decrypted[field]) {
      const decryptedValue = await decryptContent(
        signer,
        senderPubkey,
        decrypted[field] as string
      );
      
      if (decryptedValue) {
        try {
          decrypted[field] = JSON.parse(decryptedValue);
          delete decrypted[`${field}_encrypted`];
        } catch {
          // If JSON parse fails, use as string
          decrypted[field] = decryptedValue;
          delete decrypted[`${field}_encrypted`];
        }
      }
    }
  }

  return decrypted;
}