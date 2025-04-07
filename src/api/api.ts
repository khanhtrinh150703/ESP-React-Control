import axios from "axios";

export const fetchDevices = async (): Promise<any> => {
  const response = await axios.get("http://localhost:8080/api/mqtt/espDevices");
  return response.data;
};

export const publishMQTTMessage = async (message: string, topic: string): Promise<any> => {
  const response = await axios.post(
    "http://localhost:8080/api/mqtt/publish",
    null,
    { params: { message, topic } }
  );
  return response.data;
};