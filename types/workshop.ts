export interface WorkshopSourceNotice {
  name: string;
  sha256: string;
  license: string;
  attribution?: string;
  version?: string;
  url?: string;
  licenseUrl?: string;
  transformations?: string;
}

export interface WorkshopImportMetadata {
  version: number;
  generator: string;
  itemIndex: number;
  itemSha256: string;
  bundleSha256: string;
  method: string;
  scope: string;
  sources: WorkshopSourceNotice[];
  replayContextAvailable: boolean;
  replayBundleJson: string;
}
