import { useState, useEffect } from "react";
import { EspDevice } from "../types/types";
import { fetchDevices } from "../api/api";
import { useWebSocket } from "../hooks/useWebSocket";
import { DeviceControls } from "./DeviceControls";

export default function SmartHomeDashboard() {
  const [devices, setDevices] = useState<EspDevice[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const {
    isConnected,
    reconnectAttempts,
    MAX_RECONNECT_ATTEMPTS,
    deleteDevice,
  } = useWebSocket(setDevices);

  useEffect(() => {
    fetchDevices()
      .then((data) => setDevices(data))
      .catch(() => setErrorMessage("Failed to fetch devices"));
  }, []);

  const handleDeleteClick = (deviceId: string) => {
    setDeviceToDelete(deviceId);
  };

  const confirmDelete = () => {
    if (deviceToDelete) {
      deleteDevice(deviceToDelete);
      setDeviceToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeviceToDelete(null);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Smart Home Dashboard</h1>
        <div className="status-indicator">
          <span
            className={`dot ${isConnected ? "connected" : "disconnected"}`}
          ></span>
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
              <DeviceControls
                device={device}
                setDevices={setDevices}
                setErrorMessage={setErrorMessage}
              />
              <button
                className="delete-button"
                onClick={() => handleDeleteClick(device.deviceId)}
              >
                Delete Device
              </button>
            </div>
          ))
        ) : (
          <div className="no-devices">
            <p>No devices detected</p>
            <button onClick={() => fetchDevices().then(setDevices)}>
              Refresh
            </button>
          </div>
        )}
      </section>

      {deviceToDelete && (
        <div className="modal-overlay">
          <div className="delete-confirm-modal">
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete device {devices.find(d => d.deviceId === deviceToDelete)?.name || deviceToDelete}?</p>
            <div className="modal-buttons">
              <button className="confirm-button" onClick={confirmDelete}>
                Confirm
              </button>
              <button className="cancel-button" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
          cursor: pointer;
        }

        .device-card:hover h3 {
          color: #00ff9d;
          text-shadow: 0 0 15px rgba(0, 255, 157, 0.8);
        }

        .name-edit-input {
          font-size: 26px;
          font-weight: 600;
          color: #e0e7ff;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(100, 150, 255, 0.5);
          border-radius: 8px;
          padding: 5px 10px;
          width: 260px;
          font-family: 'Orbitron', sans-serif;
          outline: none;
          transition: all 0.3s ease;
        }

        .name-edit-input:focus {
          border-color: #00ff9d;
          box-shadow: 0 0 10px rgba(0, 255, 157, 0.5);
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
          gap: 20px;
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

        .delete-button {
          padding: 16px 40px;
          background: linear-gradient(45deg, #ff3366, #ff6f91);
          border: none;
          border-radius: 15px;
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.4s ease;
          box-shadow: 0 4px 15px rgba(255, 51, 102, 0.5);
          position: relative;
          z-index: 2;
          overflow: hidden;
        }

        .delete-button::after {
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

        .delete-button:hover::after {
          opacity: 1;
        }

        .delete-button:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 20px rgba(255, 51, 102, 0.8);
          background: linear-gradient(45deg, #ff1a4d, #ff4d77);
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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(20, 25, 45, 0.9);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .delete-confirm-modal {
          background: rgba(25, 30, 55, 0.95);
          padding: 40px;
          border-radius: 25px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 
                     inset 0 0 15px rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 51, 102, 0.3);
          width: 90%;
          max-width: 500px;
          text-align: center;
          position: relative;
          overflow: hidden;
          animation: slideUp 0.4s ease;
        }

        .delete-confirm-modal::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 51, 102, 0.1) 0%, transparent 70%);
          animation: rotateGlow 15s infinite linear;
          pointer-events: none;
        }

        .delete-confirm-modal h2 {
          font-size: 28px;
          font-weight: 700;
          color: #ff3366;
          margin-bottom: 25px;
          text-shadow: 0 0 15px rgba(255, 51, 102, 0.5);
        }

        .delete-confirm-modal p {
          font-size: 18px;
          color: #e0e7ff;
          margin-bottom: 35px;
          line-height: 1.5;
        }

        .modal-buttons {
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .confirm-button {
          padding: 14px 35px;
          background: linear-gradient(45deg, #ff3366, #ff6f91);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.4s ease;
          box-shadow: 0 8px 20px rgba(255, 51, 102, 0.5);
          position: relative;
          overflow: hidden;
        }

        .confirm-button:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 25px rgba(255, 51, 102, 0.8);
          background: linear-gradient(45deg, #ff1a4d, #ff4d77);
        }

        .cancel-button {
          padding: 14px 35px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(100, 150, 255, 0.3);
          border-radius: 12px;
          color: #e0e7ff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.4s ease;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .cancel-button:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4);
          border-color: rgba(100, 150, 255, 0.5);
        }

        .confirm-button::after,
        .cancel-button::after {
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

        .confirm-button:hover::after,
        .cancel-button:hover::after {
          opacity: 1;
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

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
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
