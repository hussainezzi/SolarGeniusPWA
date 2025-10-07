export interface SystemRequirements {
  desiredKw: string;
  batteryKwh: string;
  panelType: 'monocrystalline' | 'polycrystalline' | 'thin-film';
  inverterType: 'string' | 'micro' | 'hybrid';
  additionalNotes: string;
}

export interface BillOfMaterialItem {
  item: string;
  quantity: number;
  description: string;
  vendor: string;
}

export interface SitePhoto {
  file: File;
  base64: string;
  name: string;
}

export type StepKey = 'analysis' | 'renderings' | 'billOfMaterials' | 'orderSheet';

export type LoadingStates = Record<StepKey, boolean>;
export type ErrorStates = Record<StepKey, string | null>;
