import type { Message } from "../types";

interface ChatMessagesProps {
  messages: Message[];
  isSending: boolean;
}

export default function ChatMessages({
  messages,
  isSending,
}: ChatMessagesProps) {
  return (
    <div className="scroll-touch flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl p-3 text-sm ${
              message.sender === "user"
                ? "rounded-tr-sm bg-blue-600 text-white"
                : "rounded-tl-sm border border-gray-200 bg-white text-gray-800 shadow-sm"
            }`}
          >
            {message.text}
          </div>
        </div>
      ))}
      {isSending ? (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-3 text-sm text-gray-500 shadow-sm">
            Thinking...
          </div>
        </div>
      ) : null}
    </div>
  );
}
