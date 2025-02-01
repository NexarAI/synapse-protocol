import { Keypair } from '@solana/web3.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as bs58 from 'bs58';
import * as prompt from 'prompt';

const KEYS_DIR = join(process.cwd(), 'keys');

interface KeyMetadata {
  name: string;
  role: 'node' | 'admin' | 'validator';
  createdAt: string;
  lastUsed?: string;
}

class KeyManager {
  constructor() {
    if (!existsSync(KEYS_DIR)) {
      mkdirSync(KEYS_DIR, { recursive: true });
    }
  }

  /**
   * Generate a new keypair with metadata
   */
  async generateKey(name: string, role: KeyMetadata['role']): Promise<void> {
    const keypair = Keypair.generate();
    const metadata: KeyMetadata = {
      name,
      role,
      createdAt: new Date().toISOString()
    };

    // Save private key securely
    const privateKeyFile = join(KEYS_DIR, `${name}.key`);
    writeFileSync(privateKeyFile, bs58.encode(keypair.secretKey));

    // Save public key and metadata
    const publicKeyFile = join(KEYS_DIR, `${name}.pub`);
    const metadataFile = join(KEYS_DIR, `${name}.json`);

    writeFileSync(publicKeyFile, keypair.publicKey.toBase58());
    writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

    console.log(`✅ Generated keypair for ${name}`);
    console.log(`📝 Public key: ${keypair.publicKey.toBase58()}`);
    console.log(`🔑 Private key saved to: ${privateKeyFile}`);
  }

  /**
   * Load a keypair by name
   */
  loadKeypair(name: string): Keypair {
    const privateKeyFile = join(KEYS_DIR, `${name}.key`);
    const metadataFile = join(KEYS_DIR, `${name}.json`);

    if (!existsSync(privateKeyFile) || !existsSync(metadataFile)) {
      throw new Error(`Keypair ${name} not found`);
    }

    // Update last used timestamp
    const metadata = JSON.parse(readFileSync(metadataFile, 'utf-8'));
    metadata.lastUsed = new Date().toISOString();
    writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

    // Load and return keypair
    const privateKey = bs58.decode(readFileSync(privateKeyFile, 'utf-8'));
    return Keypair.fromSecretKey(privateKey);
  }

  /**
   * List all available keypairs
   */
  listKeys(): KeyMetadata[] {
    const keys: KeyMetadata[] = [];
    
    for (const file of readdirSync(KEYS_DIR)) {
      if (file.endsWith('.json')) {
        const metadata = JSON.parse(
          readFileSync(join(KEYS_DIR, file), 'utf-8')
        );
        keys.push(metadata);
      }
    }

    return keys;
  }

  /**
   * Delete a keypair
   */
  deleteKey(name: string): void {
    const files = [
      join(KEYS_DIR, `${name}.key`),
      join(KEYS_DIR, `${name}.pub`),
      join(KEYS_DIR, `${name}.json`)
    ];

    for (const file of files) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }

    console.log(`🗑️ Deleted keypair ${name}`);
  }

  /**
   * Export a keypair (requires confirmation)
   */
  async exportKey(name: string): Promise<void> {
    prompt.start();

    const { confirm } = await prompt.get({
      properties: {
        confirm: {
          description: 'Are you sure you want to export this keypair? (yes/no)',
          required: true,
          pattern: /^(yes|no)$/
        }
      }
    });

    if (confirm !== 'yes') {
      console.log('❌ Export cancelled');
      return;
    }

    const keypair = this.loadKeypair(name);
    const exportData = {
      publicKey: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
      metadata: JSON.parse(
        readFileSync(join(KEYS_DIR, `${name}.json`), 'utf-8')
      )
    };

    const exportFile = join(process.cwd(), `${name}-export.json`);
    writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`📤 Exported keypair to ${exportFile}`);
  }

  /**
   * Import a keypair
   */
  importKey(filePath: string): void {
    const importData = JSON.parse(readFileSync(filePath, 'utf-8'));
    const { publicKey, privateKey, metadata } = importData;

    // Verify keypair
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    if (keypair.publicKey.toBase58() !== publicKey) {
      throw new Error('Invalid keypair');
    }

    // Save keypair files
    const name = metadata.name;
    writeFileSync(join(KEYS_DIR, `${name}.key`), privateKey);
    writeFileSync(join(KEYS_DIR, `${name}.pub`), publicKey);
    writeFileSync(join(KEYS_DIR, `${name}.json`), JSON.stringify(metadata, null, 2));

    console.log(`📥 Imported keypair ${name}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const keyManager = new KeyManager();

  try {
    switch (command) {
      case 'generate':
        const [name, role] = args.slice(1);
        if (!name || !role) {
          throw new Error('Usage: generate <name> <role>');
        }
        await keyManager.generateKey(name, role as KeyMetadata['role']);
        break;

      case 'list':
        const keys = keyManager.listKeys();
        console.table(keys);
        break;

      case 'delete':
        const keyToDelete = args[1];
        if (!keyToDelete) {
          throw new Error('Usage: delete <name>');
        }
        keyManager.deleteKey(keyToDelete);
        break;

      case 'export':
        const keyToExport = args[1];
        if (!keyToExport) {
          throw new Error('Usage: export <name>');
        }
        await keyManager.exportKey(keyToExport);
        break;

      case 'import':
        const filePath = args[1];
        if (!filePath) {
          throw new Error('Usage: import <file-path>');
        }
        keyManager.importKey(filePath);
        break;

      default:
        console.log(`
Available commands:
  generate <name> <role>  Generate a new keypair
  list                    List all keypairs
  delete <name>          Delete a keypair
  export <name>          Export a keypair
  import <file-path>     Import a keypair
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 