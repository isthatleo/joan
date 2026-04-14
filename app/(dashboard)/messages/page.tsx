"use client";
import { useState } from "react";

export default function MessagesPage() {
  const [activeConversation, setActiveConversation] = useState(null);

  const conversations = [
    { id: 1, name: "Dr. Smith", lastMessage: "Results are ready", unread: 2 },
    { id: 2, name: "Nurse Johnson", lastMessage: "Patient admitted", unread: 0 },
    { id: 3, name: "Lab Tech", lastMessage: "Test pending...", unread: 1 },
  ];

  return (
    <div className="grid grid-cols-3 gap-6 h-screen">
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold p-4 border-b">Inbox</h2>
        <div className="overflow-y-auto h-96">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                activeConversation === conv.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="font-semibold">{conv.name}</p>
                {conv.unread > 0 && (
                  <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs">
                    {conv.unread}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{conv.lastMessage}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-2 bg-white rounded-lg shadow flex flex-col">
        {activeConversation ? (
          <>
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Conversation</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-gray-100 p-3 rounded max-w-xs">
                <p className="text-sm">Hi, patient is ready for checkup</p>
              </div>
              <div className="bg-blue-600 text-white p-3 rounded max-w-xs ml-auto">
                <p className="text-sm">Thanks, on my way</p>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border rounded-lg px-4 py-2"
              />
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">Send</button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
