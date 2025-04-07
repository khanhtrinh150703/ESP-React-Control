import { useState, useEffect, useRef } from "react";
import axios from "axios";

interface EspDevice {
  deviceId: string;
  name: string;
  lightOn: boolean;
  rgbMode?: boolean;
  commandTopic: string;
}

export default function MqttDashboard() {
  const [devices, setDevices] = useState<EspDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const fetchDevices = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/mqtt/espDevices");
      setDevices(response.data);
      console.log("Fetched devices:", response.data);
    } catch (error) {
      setErrorMessage("Failed to fetch devices");
      console.error("Fetch devices error:", error);
    }
  };

  const connectWebSocket = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setErrorMessage("Maximum reconnection attempts reached");
      return;
    }

    const websocket = new WebSocket("ws://localhost:8080/mqtt");
    wsRef.current = websocket;

    websocket.onopen = () => {
      setIsConnected(true);
      setReconnectAttempts(0);
      setErrorMessage(null);
      fetchDevices();
      console.log("WebSocket connected");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") return;

        const { deviceId, lightOn, rgbmode, commandTopic } = data;
        setDevices((prevDevices) => {
          const deviceExists = prevDevices.some((d) => d.deviceId === deviceId);
          if (deviceExists) {
            return prevDevices.map((device) =>
              device.deviceId === deviceId
                ? { ...device, lightOn, rgbMode: rgbmode }
                : device
            );
          }
          return [
            ...prevDevices,
            {
              deviceId,
              name: data.name || `ESP_${deviceId}`,
              lightOn,
              rgbMode: rgbmode,
              commandTopic,
            },
          ];
        });
      } catch (error) {
        setErrorMessage("Error processing WebSocket message");
        console.error("WebSocket message error:", error);
      }
    };

    websocket.onerror = () => {
      setIsConnected(false);
      setErrorMessage("WebSocket connection failed");
      console.error("WebSocket error");
    };

    websocket.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket closed, attempting reconnect...");
      setTimeout(() => {
        if (!isConnected && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setReconnectAttempts((prev) => prev + 1);
          connectWebSocket();
        }
      }, 5000);
    };
  };

  useEffect(() => {
    fetchDevices();
    connectWebSocket();
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleToggleLight = async (device: EspDevice) => {
    console.log("Light toggle clicked for device:", device.deviceId);
    const newState = device.lightOn ? "off" : "on";

    setDevices((prevDevices) =>
      prevDevices.map((d) =>
        d.deviceId === device.deviceId
          ? {
              ...d,
              lightOn: !d.lightOn,
              rgbMode: d.lightOn ? d.rgbMode : false,
            }
          : d
      )
    );

    try {
      const response = await axios.post(
        "http://localhost:8080/api/mqtt/publish",
        null,
        {
          params: { message: newState, topic: device.commandTopic },
        }
      );
      console.log("Toggle response:", response.data);

      if (!device.lightOn && device.rgbMode) {
        await axios.post("http://localhost:8080/api/mqtt/publish", null, {
          params: { message: "offRGB", topic: device.commandTopic },
        });
      }
    } catch (error) {
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.deviceId === device.deviceId ? { ...d, lightOn: device.lightOn } : d
        )
      );
      setErrorMessage("Failed to toggle light");
      console.error("Toggle light error:", error);
    }
  };

  const handleToggleRGB = async (device: EspDevice) => {
    const newRGBState = device.rgbMode ? "offRGB" : "onRGB";

    setDevices((prevDevices) =>
      prevDevices.map((d) =>
        d.deviceId === device.deviceId
          ? {
              ...d,
              rgbMode: !d.rgbMode,
              lightOn: d.rgbMode ? d.lightOn : false,
            }
          : d
      )
    );

    try {
      await axios.post("http://localhost:8080/api/mqtt/publish", null, {
        params: { message: newRGBState, topic: device.commandTopic },
      });

      if (!device.rgbMode && device.lightOn) {
        await axios.post("http://localhost:8080/api/mqtt/publish", null, {
          params: { message: "off", topic: device.commandTopic },
        });
      }
      console.log(`Toggling RGB for ${device.deviceId}: ${newRGBState}`);
    } catch (error) {
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.deviceId === device.deviceId ? { ...d, rgbMode: device.rgbMode } : d
        )
      );
      setErrorMessage("Failed to toggle RGB mode");
      console.error("Toggle RGB error:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>MQTT Smart Dashboard</h1>
        <div className="status-indicator">
          <span className={`dot ${isConnected ? "connected" : "disconnected"}`}></span>
          <span>{isConnected ? "Online" : "Offline"}</span>
          {!isConnected && reconnectAttempts > 0 && (
            <span className="attempts">
              (Attempt {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})
            </span>
          )}
        </div>
      </header>

      {errorMessage && (
        <div className="error-alert">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}

      <section className="devices-grid">
        {devices.length > 0 ? (
          devices.map((device) => (
            <div key={device.deviceId} className="device-card">
              <div className="device-header">
                <h3 title={device.name}>{device.name}</h3>
                <span
                  className="device-status"
                  title={device.lightOn ? "Light On" : "Light Off"}
                >
                  {device.lightOn ? "🟢" : "⚪"}
                </span>
              </div>
              <p className="device-id">ID: {device.deviceId}</p>
              <div className="control-section">
                <button
                  type="button"
                  className={`light-toggle ${device.lightOn ? "on" : "off"}`}
                  onClick={() => handleToggleLight(device)}
                >
                  <img
                    src={
                      device.lightOn
                        ? "/images/light_on.png"
                        : "/images/light_off.png"
                    }
                    alt={`Light ${device.name}`}
                    className="light-icon"
                  />
                  Light {device.lightOn ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  className={`rgb-toggle ${device.rgbMode ? "active" : ""}`}
                  onClick={() => handleToggleRGB(device)}
                >
                  <span className="rgb-indicator">
                    {device.rgbMode ? "🌈 On" : "⚫ Off"}
                  </span>
                  <span className="rgb-label">RGB Mode</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-devices">
            <p>No devices detected</p>
            <button onClick={fetchDevices}>Refresh</button>
          </div>
        )}
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .dashboard-container {
          min-height: 100vh;
          padding: 60px 25px;
          background: linear-gradient(135deg, #0d0e1f 0%, #1e2749 100%);
          font-family: 'Orbitron', sans-serif;
          color: #e0e7ff;
          position: relative;
          overflow: hidden;
        }

        .dashboard-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(30, 39, 73, 0.3) 0%, transparent 70%);
          animation: orbitGlow 20s infinite linear;
          pointer-events: none;
          z-index: 0;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1400px;
          margin: 0 auto 60px;
          padding: 30px 40px;
          background: rgba(20, 25, 45, 0.85);
          border-radius: 25px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(80, 100, 255, 0.2);
          backdrop-filter: blur(12px);
          z-index: 1;
          position: relative;
          overflow: hidden;
        }

        .dashboard-header::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shine 4s infinite;
        }

        h1 {
          font-size: 40px;
          font-weight: 700;
          background: linear-gradient(45deg, #7b68ee, #00ddeb, #ff6f91);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: 2px;
          text-shadow: 0 0 15px rgba(123, 104, 238, 0.7);
          animation: glowText 3s infinite alternate;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 16px;
          font-weight: 500;
          color: #a5b4fc;
        }

        .dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
          transition: all 0.5s ease;
          position: relative;
        }

        .dot.connected {
          background: #00ff9d;
          animation: pulse 1.5s infinite;
        }

        .dot.disconnected {
          background: #ff3366;
          animation: pulseRed 1.5s infinite;
        }

        .attempts {
          font-size: 14px;
          color: #818cf8;
          font-style: italic;
          text-shadow: 0 0 5px rgba(129, 140, 248, 0.5);
        }

        .error-alert {
          max-width: 1400px;
          margin: 0 auto 50px;
          padding: 25px 40px;
          background: rgba(255, 77, 77, 0.9);
          color: #fff;
          border-radius: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          animation: slideIn 0.6s ease, glowError 2s infinite;
          backdrop-filter: blur(8px);
          z-index: 1;
          border: 1px solid rgba(255, 128, 128, 0.3);
        }

        .error-alert button {
          background: #ff1a1a;
          border: none;
          padding: 12px 30px;
          border-radius: 10px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.4s ease;
          box-shadow: 0 0 15px rgba(255, 26, 26, 0.6);
        }

        .error-alert button:hover {
          background: #cc0000;
          transform: scale(1.05) rotate(2deg);
          box-shadow: 0 0 25px rgba(255, 26, 26, 0.8);
        }

        .devices-grid {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 50px;
          z-index: 1;
        }

        .device-card {
          background: rgba(25, 30, 55, 0.9);
          padding: 40px;
          border-radius: 25px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(100, 150, 255, 0.2);
          transition: all 0.5s ease;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(15px);
          z-index: 1;
        }

        .device-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(100, 150, 255, 0.1) 0%, transparent 70%);
          animation: rotateGlow 15s infinite linear;
          pointer-events: none;
        }

        .device-card:hover {
          transform: translateY(-15px) scale(1.03);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(100, 150, 255, 0.3);
          border: 1px solid rgba(100, 150, 255, 0.5);
        }

        .device-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .device-card h3 {
          font-size: 26px;
          font-weight: 600;
          color: #e0e7ff;
          max-width: 260px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all 0.4s ease;
        }

        .device-card:hover h3 {
          color: #00ff9d;
          text-shadow: 0 0 15px rgba(0, 255, 157, 0.8);
        }

        .device-status {
          font-size: 24px;
          transition: transform 0.5s ease;
        }

        .device-card:hover .device-status {
          transform: scale(1.4) rotate(10deg);
        }

        .device-id {
          font-size: 16px;
          color: #a5b4fc;
          margin-bottom: 35px;
          letter-spacing: 1px;
          font-weight: 400;
          text-shadow: 0 0 5px rgba(165, 180, 252, 0.4);
        }

        .control-section {
          display: flex;
          flex-direction: column;
          gap: 30px;
          align-items: center;
        }

        .light-toggle {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px 35px;
          border: none;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.05);
          color: #e0e7ff;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.5s ease;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 2;
          overflow: hidden;
        }

        .light-toggle::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .light-toggle:hover::after {
          opacity: 1;
        }

        .light-toggle:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4);
          background: rgba(255, 255, 255, 0.15);
        }

        .light-toggle.on {
          background: #00ff9d;
          color: #1a2749;
          box-shadow: 0 0 30px rgba(0, 255, 157, 0.9);
          animation: glowButton 2s infinite;
        }

        .light-toggle.off {
          background: rgba(255, 255, 255, 0.05);
          color: #e0e7ff;
        }

        .light-icon {
          width: 40px;
          height: 40px;
          pointer-events: none;
          transition: transform 0.3s ease;
        }

        .light-toggle:hover .light-icon {
          transform: scale(1.1);
        }

        .rgb-toggle {
          position: relative;
          padding: 16px 40px;
          border: none;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.05);
          color: #e0e7ff;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.5s ease;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          z-index: 2;
          overflow: hidden;
        }

        .rgb-toggle::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .rgb-toggle:hover::after {
          opacity: 1;
        }

        .rgb-toggle.active {
          background: linear-gradient(45deg, #ff6f91, #00ddeb, #7b68ee);
          color: #fff;
          box-shadow: 0 0 35px rgba(123, 104, 238, 0.9);
          animation: rgbPulse 2s infinite;
        }

        .rgb-toggle:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4);
          background: rgba(255, 255, 255, 0.15);
        }

        .rgb-indicator {
          margin-right: 12px;
          font-size: 20px;
          transition: all 0.4s ease;
        }

        .rgb-toggle.active .rgb-indicator {
          text-shadow: 0 0 15px rgba(255, 255, 255, 0.9);
        }

        .rgb-label {
          font-weight: 600;
        }

        .no-devices {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px;
          background: rgba(20, 25, 45, 0.9);
          border-radius: 25px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
          color: #a5b4fc;
          font-size: 24px;
          font-weight: 500;
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 1;
        }

        .no-devices button {
          margin-top: 30px;
          padding: 16px 35px;
          background: linear-gradient(45deg, #7b68ee, #00ddeb);
          color: white;
          border: none;
          border-radius: 15px;
          cursor: pointer;
          font-size: 18px;
          font-weight: 600;
          transition: all 0.5s ease;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .no-devices button:hover {
          transform: scale(1.1) rotate(3deg);
          box-shadow: 0 12px 25px rgba(123, 104, 238, 0.6);
          background: linear-gradient(45deg, #6b5bd6, #00c4d3);
        }

        @keyframes orbitGlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes shine {
          0% { left: -100%; }
          20% { left: 100%; }
          100% { left: 100%; }
        }

        @keyframes glowText {
          0% { text-shadow: 0 0 10px rgba(123, 104, 238, 0.5); }
          100% { text-shadow: 0 0 20px rgba(123, 104, 238, 0.9); }
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 10px #00ff9d; }
          50% { box-shadow: 0 0 20px #00ff9d; }
          100% { box-shadow: 0 0 10px #00ff9d; }
        }

        @keyframes pulseRed {
          0% { box-shadow: 0 0 10px #ff3366; }
          50% { box-shadow: 0 0 20px #ff3366; }
          100% { box-shadow: 0 0 10px #ff3366; }
        }

        @keyframes glowError {
          0% { box-shadow: 0 10px 30px rgba(255, 77, 77, 0.5); }
          50% { box-shadow: 0 10px 40px rgba(255, 77, 77, 0.8); }
          100% { box-shadow: 0 10px 30px rgba(255, 77, 77, 0.5); }
        }

        @keyframes rotateGlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes glowButton {
          0% { box-shadow: 0 0 20px rgba(0, 255, 157, 0.7); }
          50% { box-shadow: 0 0 35px rgba(0, 255, 157, 1); }
          100% { box-shadow: 0 0 20px rgba(0, 255, 157, 0.7); }
        }

        @keyframes rgbPulse {
          0% { box-shadow: 0 0 15px #ff6f91, 0 0 25px #00ddeb; }
          50% { box-shadow: 0 0 25px #7b68ee, 0 0 35px #ff6f91; }
          100% { box-shadow: 0 0 15px #00ddeb, 0 0 25px #7b68ee; }
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 30px;
            text-align: center;
            padding: 25px;
          }

          .devices-grid {
            grid-template-columns: 1fr;
          }

          .device-card {
            padding: 35px;
          }
        }
      `}</style>
    </div>
  );
}