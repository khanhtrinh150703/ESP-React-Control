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
    } catch (error) {
      setErrorMessage("Failed to fetch devices");
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
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") return;

        const { deviceId, lightOn, rgbMode, commandTopic } = data;
        setDevices((prevDevices) => {
          const deviceExists = prevDevices.some((d) => d.deviceId === deviceId);
          if (deviceExists) {
            return prevDevices.map((device) =>
              device.deviceId === deviceId ? { ...device, lightOn, rgbMode } : device
            );
          }
          return [...prevDevices, { 
            deviceId, 
            name: data.name || `ESP_${deviceId}`, 
            lightOn, 
            rgbMode, 
            commandTopic 
          }];
        });
      } catch (error) {
        setErrorMessage("Error processing WebSocket message");
      }
    };

    websocket.onerror = () => {
      setIsConnected(false);
      setErrorMessage("WebSocket connection failed");
    };

    websocket.onclose = () => {
      setIsConnected(false);
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
    const newState = device.lightOn ? "off" : "on";
    try {
      await axios.post("http://localhost:8080/api/mqtt/publish", null, {
        params: { message: newState, topic: device.commandTopic },
      });
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.deviceId === device.deviceId ? { ...d, lightOn: !d.lightOn } : d
        )
      );
    } catch (error) {
      setErrorMessage("Failed to toggle light");
    }
  };

  const handleToggleRGB = async (device: EspDevice) => {
    const newRGBState = device.rgbMode ? "offRGB" : "onRGB";
    try {
      await axios.post("http://localhost:8080/api/mqtt/publish", null, {
        params: { message: newRGBState, topic: device.commandTopic },
      });
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.deviceId === device.deviceId ? { ...d, rgbMode: !d.rgbMode } : d
        )
      );
    } catch (error) {
      setErrorMessage("Failed to toggle RGB");
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>MQTT Control Panel</h1>
        <div className="status-indicator">
          <span className={`dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>{isConnected ? "Online" : "Offline"}</span>
        </div>
      </header>

      {errorMessage && (
        <div className="error-alert">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>×</button>
        </div>
      )}

      <section className="devices-grid">
        {devices.length > 0 ? (
          devices.map((device) => (
            <div key={device.deviceId} className="device-card">
              <h3>{device.name}</h3>
              <p className="device-id">ID: {device.deviceId}</p>
              <div className="control-section">
                <img
                  src={device.lightOn ? "/images/light_on.png" : "/images/light_off.png"}
                  alt={`Light ${device.name}`}
                  className="light-icon"
                  onClick={() => handleToggleLight(device)}
                />
                <button
                  className={`rgb-button ${device.rgbMode ? 'off' : 'on'}`}
                  onClick={() => handleToggleRGB(device)}
                >
                  RGB {device.rgbMode ? "Off" : "On"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-devices">No devices detected</div>
        )}
      </section>

      <style>{`
        .dashboard-container {
          min-height: 100vh;
          padding: 40px 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          font-family: 'Arial', sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto 30px;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h1 {
          margin: 0;
          color: #2c3e50;
          font-size: 28px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }

        .dot.connected { background-color: #27ae60; }
        .dot.disconnected { background-color: #e74c3c; }

        .error-alert {
          max-width: 1200px;
          margin: 0 auto 20px;
          padding: 15px;
          background: #ffebee;
          color: #c0392b;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-alert button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #c0392b;
        }

        .devices-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .device-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .device-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .device-card h3 {
          margin: 0 0 10px;
          color: #34495e;
          font-size: 20px;
        }

        .device-id {
          color: #7f8c8d;
          font-size: 14px;
          margin-bottom: 15px;
        }

        .control-section {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }

        .light-icon {
          width: 80px;
          height: 80px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .light-icon:hover {
          opacity: 0.8;
        }

        .rgb-button {
          padding: 8px 20px;
          border: none;
          border-radius: 5px;
          color: white;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
          width: 120px;
        }

        .rgb-button.on {
          background-color: #3498db;
        }

        .rgb-button.off {
          background-color: #e74c3c;
        }

        .rgb-button:hover {
          filter: brightness(110%);
        }

        .no-devices {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
          font-size: 18px;
          background: white;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}