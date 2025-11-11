import { PersistentNPC } from './PersistentNPC';

export class ScholarNPC extends PersistentNPC {
  private static instance: ScholarNPC | null = null;

  public static getInstance(scene: any, config: any): ScholarNPC {
    if (!ScholarNPC.instance) {
      ScholarNPC.instance = new ScholarNPC(scene, config);
    }
    return ScholarNPC.instance;
  }

  private constructor(scene: any, config: any) {
    super(scene, { ...config, id: 'Scholar Marcus' });
  }
}
