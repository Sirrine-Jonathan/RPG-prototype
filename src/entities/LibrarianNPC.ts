import { PersistentNPC } from './PersistentNPC';

export class LibrarianNPC extends PersistentNPC {
  private static instance: LibrarianNPC | null = null;

  public static getInstance(scene: Phaser.Scene, config: any): LibrarianNPC {
    if (!LibrarianNPC.instance) {
      LibrarianNPC.instance = new LibrarianNPC(scene, config);
    }
    return LibrarianNPC.instance;
  }

  private constructor(scene: Phaser.Scene, config: any) {
    super(scene, { ...config, id: 'Librarian Sarah' });
  }
}
