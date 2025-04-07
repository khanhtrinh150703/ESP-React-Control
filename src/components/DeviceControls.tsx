import { EspDevice } from "../types/types";
import { publishMQTTMessage } from "../api/api";

interface DeviceControlsProps {
  device: EspDevice;
  setDevices: React.Dispatch<React.SetStateAction<EspDevice[]>>;
  setErrorMessage: (message: string | null) => void;
}

export const DeviceControls = ({ device, setDevices, setErrorMessage }: DeviceControlsProps) => {
  const handleToggleLight = async () => {
    const newState = device.lightOn ? "off" : "on";
    const optimisticUpdate = !device.lightOn;

    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === device.deviceId
          ? { ...d, lightOn: optimisticUpdate, rgbMode: d.lightOn ? d.rgbMode : false }
          : d
      )
    );

    try {
      await publishMQTTMessage(newState, device.commandTopic);
      if (!device.lightOn && device.rgbMode) {
        await publishMQTTMessage("offRGB", device.commandTopic);
      }
    } catch (error) {
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === device.deviceId ? { ...d, lightOn: device.lightOn } : d
        )
      );
      setErrorMessage("Failed to toggle light");
    }
  };

  const handleToggleRGB = async () => {
    const newRGBState = device.rgbMode ? "offRGB" : "onRGB";
    const optimisticRGB = !device.rgbMode;

    // Add a small delay for smoother transition
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === device.deviceId
          ? { ...d, rgbMode: optimisticRGB, lightOn: d.rgbMode ? d.lightOn : false }
          : d
      )
    );

    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for transition
      await publishMQTTMessage(newRGBState, device.commandTopic);
      
      if (!device.rgbMode && device.lightOn) {
        await publishMQTTMessage("off", device.commandTopic);
      }
    } catch (error) {
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === device.deviceId ? { ...d, rgbMode: device.rgbMode } : d
        )
      );
      setErrorMessage("Failed to toggle RGB mode");
    }
  };

  return (
    <div className="control-section">
      <button
        type="button"
        className={`light-toggle ${device.lightOn ? "on" : "off"}`}
        onClick={handleToggleLight}
      >
        <img
          src={device.lightOn ? "/images/light_on.png" : "/images/light_off.png"}
          alt={`Light ${device.name}`}
          className="light-icon"
        />
        Light {device.lightOn ? "On" : "Off"}
      </button>
      <button
        type="button"
        className={`rgb-toggle ${device.rgbMode ? "active" : ""}`}
        onClick={handleToggleRGB}
      >
        <span className="rgb-indicator">{device.rgbMode ? "🌈 On" : "⚫ Off"}</span>
        <span className="rgb-label">RGB Mode</span>
      </button>
    </div>
  );
};