"use client";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  userName: string;
  message?: string;
}

type ChatSystemMessages = "error" | "user_count" | "history";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [usersCount, setUsersCount] = useState(1);
  const wsRef = useRef<WebSocket | null>(null);

  const [clientData, setClientData] = useState<{
    roomName: string;
    isConnect: boolean;
    userName: string;
  }>({
    roomName: "default",
    userName: "",
    isConnect: false,
  });

  useEffect(() => {
    if (!clientData?.isConnect) return;

    const ws = new WebSocket(
      `wss://${process.env.NEXT_PUBLIC_WSS_URL}/${clientData.roomName}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      const initMessage: ChatMessage = { userName: clientData.userName };
      // sending user information to the server on websocket connect
      ws.send(JSON.stringify(initMessage));
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      // TODO parse message event
      const message: ChatMessage = JSON.parse(event.data);
      if (message.userName === "system") {
        if (!message.message) return;

        const [key, value] = message.message?.split(":");
        switch (key as ChatSystemMessages) {
          case "user_count":
            setUsersCount(Number(value));
            break;

          case "history":
            // TODO validate?
            const historyMessages = JSON.parse(message.message.slice(8)).map(
              (msgStr: string) => JSON.parse(msgStr)
            ) as ChatMessage[];

            setMessages(historyMessages);
            break;

          case "error":
            const errorMessage: ChatMessage = {
              userName: "system",
              message: value,
            };

            setMessages((prevMessages) => [...prevMessages, errorMessage]);
            break;
        }
      } else {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clientData.isConnect]);

  const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      userName: clientData.userName,
      message: newMessage,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      setNewMessage("");
    }
  };

  function handleNewRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientData((prev) => ({ ...prev, isConnect: true }));
  }

  if (!clientData.isConnect)
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <form
          onSubmit={handleNewRoom}
          className="border-t border-gray-100 p-6 bg-white rounded-b-xl"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col text-black">
              <label htmlFor="userName" className="text-sm">
                Enter Your Name:
              </label>
              <input
                type="text"
                id="userName"
                value={clientData.userName}
                onChange={(e) =>
                  setClientData((prev) => ({
                    ...prev,
                    userName: e.target.value,
                  }))
                }
                className="flex-1  rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your name..."
              />
            </div>
            <div className="flex flex-col text-black">
              <label htmlFor="roomId" className="text-sm">
                Enter Room Name:
              </label>
              <input
                type="text"
                id="roomId"
                value={clientData.roomName}
                onChange={(e) =>
                  setClientData((prev) => ({
                    ...prev,
                    roomName: e.target.value,
                  }))
                }
                className="flex-1  rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter room name..."
              />
            </div>
            <button
              type="submit"
              className={
                "px-6 py-3 rounded-lg font-medium transition-all bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow cursor-pointer"
              }
            >
              Connect
            </button>
          </div>
        </form>
      </main>
    );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-lg flex flex-col h-[80vh] border border-gray-200">
        <div
          className={`px-6 py-3 text-sm font-medium rounded-t-xl flex justify-between ${
            connectionStatus === "connected"
              ? "bg-green-50 text-green-700 border-b border-green-100"
              : connectionStatus === "disconnected"
              ? "bg-red-50 text-red-700 border-b border-red-100"
              : "bg-yellow-50 text-yellow-700 border-b border-yellow-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "disconnected"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            ></div>
            Status: {connectionStatus}
          </div>

          {connectionStatus === "connected" && (
            <div className="w-24">Connected: {usersCount}</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <p className="text-gray-800 font-medium">
                <span
                  className={`font-extrabold ${
                    message.userName === clientData.userName
                      ? "text-cyan-800"
                      : message.userName !== "system"
                      ? "text-rose-800"
                      : "text-black"
                  }`}
                >
                  {message.userName}:
                </span>{" "}
                {message.message}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={sendMessage}
          className="border-t border-gray-100 p-6 bg-white rounded-b-xl"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 text-black rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              disabled={
                connectionStatus !== "connected" || newMessage.length < 1
              }
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                connectionStatus === "connected"
                  ? "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
