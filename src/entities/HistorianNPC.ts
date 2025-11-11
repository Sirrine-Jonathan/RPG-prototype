import { PersistentNPC } from './PersistentNPC';

export class HistorianNPC extends PersistentNPC {
  private static instance: HistorianNPC | null = null;

  public static getInstance(scene: any, config: any): HistorianNPC {
    if (!HistorianNPC.instance) {
      HistorianNPC.instance = new HistorianNPC(scene, config);
    }
    return HistorianNPC.instance;
  }

  private constructor(scene: any, config: any) {
    super(scene, { ...config, id: 'Historian Vera' });
  }
}
