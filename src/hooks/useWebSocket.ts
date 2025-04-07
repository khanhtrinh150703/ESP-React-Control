import { useEffect, useRef, useState } from "react";
import { EspDevice } from "../types/types";

export const useWebSocket = (setDevices: React.Dispatch<React.SetStateAction<EspDevice[]>>) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;

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
    connectWebSocket();
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  return { isConnected, reconnectAttempts, errorMessage, MAX_RECONNECT_ATTEMPTS };
};