export interface EspDevice {
    deviceId: string;
    name: string;
    lightOn: boolean;
    rgbMode?: boolean;
    commandTopic: string;
  }