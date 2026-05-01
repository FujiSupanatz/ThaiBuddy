"use client";

import { type FormEvent, type SVGProps, useState } from "react";

type ViewMode = "map" | "vision";
type ChatTab = "general" | "nearby" | "planner";
type VisionTab = "currency" | "signage";
type CurrencyCode = "USD" | "EUR" | "JPY";

type Message = {
  id: number;
  sender: "bot" | "user";
  text: string;
};

const IconCamera = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const IconMessage = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
  </svg>
);

const IconMapPin = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconClose = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const IconSend = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="22" x2="11" y1="2" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconScan = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </svg>
);

export default function LandingPage() {
  const [view, setView] = useState<ViewMode>("map");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<ChatTab>("general");
  const [visionTab, setVisionTab] = useState<VisionTab>("currency");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "bot", text: "Sawasdee! How can I help you in Thailand today?" },
  ]);
  const [inputText, setInputText] = useState("");
  const [thbAmount, setThbAmount] = useState("");
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>("USD");
  const [isScanning, setIsScanning] = useState(true);

  const exchangeRates: Record<CurrencyCode, number> = {
    USD: 0.027,
    EUR: 0.025,
    JPY: 4.15,
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputText.trim()) {
      return;
    }

    const newMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: inputText,
    };

    setMessages((current) => [...current, newMessage]);
    setInputText("");

    window.setTimeout(() => {
      let botReply = "";

      if (chatTab === "general") {
        botReply = "I can help you with basic Thai phrases or culture tips. What do you need?";
      }
      if (chatTab === "nearby") {
        botReply =
          "Looking around your current location... Found a highly-rated Pad Thai restaurant 200 meters ahead!";
      }
      if (chatTab === "planner") {
        botReply =
          "Since you are at the Grand Palace, the next best stop is Wat Pho (Temple of the Reclining Buddha). Should I map the route?";
      }

      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, sender: "bot", text: botReply },
      ]);
    }, 1000);
  };

  const handleTabChange = (tab: ChatTab) => {
    setChatTab(tab);
    setMessages([]);

    window.setTimeout(() => {
      let intro = "";

      if (tab === "general") {
        intro = "Sawasdee! Ask me anything about Thailand.";
      }
      if (tab === "nearby") {
        intro = "📍 Using your GPS... What are you looking for? (Food, Toilet, ATM)";
      }
      if (tab === "planner") {
        intro = "🗺️ Let's plan your next move. Where are you heading to?";
      }

      setMessages([{ id: Date.now(), sender: "bot", text: intro }]);
    }, 300);
  };

  return (
    <div className="relative mx-auto h-screen w-full max-w-md overflow-hidden border-x border-gray-200 bg-gray-100 font-sans shadow-2xl">
      <div className="pointer-events-none absolute inset-0 z-0">
        <iframe
          title="Map"
          width="100%"
          height="100%"
          frameBorder="0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=100.4851,13.7431,100.5051,13.7631&layer=mapnik&marker=13.7531,100.4951"
          style={{ filter: "brightness(0.95)" }}
        />
      </div>

      <div className="absolute top-0 z-10 w-full bg-gradient-to-b from-black/60 to-transparent p-4 pt-6">
        <div className="flex items-center justify-between text-white">
          <h1 className="text-xl font-bold tracking-wide">ThaiBuddy 🇹🇭</h1>
          <div className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-sm backdrop-blur-sm">
            EN ▾
          </div>
        </div>
      </div>

      {view === "map" && (
        <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-4 transition-all duration-300">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg hover:bg-gray-50 active:scale-95">
            <IconMapPin />
          </button>

          <button
            onClick={() => {
              setView("vision");
              setChatOpen(false);
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/40 transition-transform hover:scale-105 active:scale-95"
          >
            <IconCamera />
          </button>
        </div>
      )}

      {view === "map" && !chatOpen && (
        <div
          onClick={() => setChatOpen(true)}
          className="absolute bottom-6 left-4 right-20 z-20 flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-4 shadow-xl transition-all hover:bg-gray-50 active:scale-95"
        >
          <div className="rounded-full bg-green-100 p-2 text-green-600">
            <IconMessage />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Travel Assistant</p>
            <p className="text-xs text-gray-500">Ask, Find Nearby, or Plan</p>
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-0 z-30 flex h-[80vh] w-full flex-col rounded-t-3xl bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${
          chatOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="relative flex flex-shrink-0 items-center justify-between border-b p-4">
          <div
            className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 cursor-pointer rounded-full bg-gray-300"
            onClick={() => setChatOpen(false)}
          />
          <h2 className="mt-2 text-lg font-bold text-gray-800">AI Companion</h2>
          <button
            onClick={() => setChatOpen(false)}
            className="mt-2 p-1 text-gray-400 hover:text-gray-600"
          >
            <IconClose />
          </button>
        </div>

        <div className="no-scrollbar flex flex-shrink-0 gap-2 overflow-x-auto bg-gray-50 p-2">
          {(["general", "nearby", "planner"] as ChatTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                chatTab === tab
                  ? "bg-blue-600 text-white shadow-md"
                  : "border border-gray-200 bg-white text-gray-600"
              }`}
            >
              {tab === "general" && "💬 General"}
              {tab === "nearby" && "📍 Nearby"}
              {tab === "planner" && "🗺️ Plan Next"}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
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
        </div>

        <div className="flex-shrink-0 border-t bg-white p-4">
          <form onSubmit={handleSendMessage} className="relative flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 rounded-full bg-gray-100 py-3 pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <IconSend />
            </button>
          </form>
        </div>
      </div>

      <div
        className={`absolute inset-0 z-40 flex flex-col bg-black transition-opacity duration-300 ${
          view === "vision" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="z-50 flex items-center justify-between bg-gradient-to-b from-black to-transparent p-4 pt-6 text-white">
          <button
            onClick={() => setView("map")}
            className="rounded-full bg-white/20 p-2 backdrop-blur-md"
          >
            <IconClose />
          </button>
          <div className="font-semibold tracking-wide">AI Vision Lens</div>
          <div className="w-10" />
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gray-800 opacity-60">
            <img
              src="https://images.unsplash.com/photo-1588693959247-c0350d220807?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Camera background"
              className="h-full w-full object-cover blur-sm opacity-30"
            />
          </div>

          <div className="relative z-10 h-64 w-64 overflow-hidden rounded-3xl border-2 border-white/50 shadow-[0_0_0_4000px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 flex items-center justify-center">
              {isScanning ? (
                <div className="absolute top-0 h-1 w-full animate-[scan_2s_ease-in-out_infinite] bg-green-400 shadow-[0_0_10px_#4ade80]" />
              ) : null}
              <IconScan className="h-16 w-16 text-white/30" />
            </div>
          </div>

          <p className="absolute bottom-10 z-10 rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md">
            {visionTab === "currency" ? "Point at Thai Banknotes" : "Point at Thai Signage"}
          </p>
        </div>

        <div className="z-50 rounded-t-3xl bg-gray-900 px-4 pb-8 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="relative mb-6 flex rounded-full bg-gray-800 p-1">
            <button
              onClick={() => setVisionTab("currency")}
              className={`z-10 flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
                visionTab === "currency" ? "text-white" : "text-gray-400"
              }`}
            >
              💵 Currency
            </button>
            <button
              onClick={() => setVisionTab("signage")}
              className={`z-10 flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
                visionTab === "signage" ? "text-white" : "text-gray-400"
              }`}
            >
              🪧 Translate Sign
            </button>
            <div
              className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-indigo-600 transition-all duration-300 ease-out ${
                visionTab === "currency" ? "left-1" : "left-[calc(50%+2px)]"
              }`}
            />
          </div>

          {visionTab === "currency" && (
            <div className="animate-in slide-in-from-bottom-4 fade-in space-y-4 duration-300">
              <div className="mb-2 text-center text-xs text-gray-400">
                Or enter THB manually if scan fails
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ฿
                  </span>
                  <input
                    type="number"
                    placeholder="Enter Baht"
                    value={thbAmount}
                    onChange={(event) => {
                      setThbAmount(event.target.value);
                      setIsScanning(event.target.value === "");
                    }}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pl-10 pr-4 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={targetCurrency}
                  onChange={(event) => setTargetCurrency(event.target.value as CurrencyCode)}
                  className="min-w-[80px] appearance-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-center text-white outline-none focus:border-indigo-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>

              {thbAmount && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-4 text-white">
                  <div>
                    <p className="text-xs text-indigo-300">Approximate Value</p>
                    <p className="text-2xl font-bold">
                      {(Number(thbAmount) * exchangeRates[targetCurrency]).toFixed(2)}{" "}
                      {targetCurrency}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    1 THB = {exchangeRates[targetCurrency]} {targetCurrency}
                  </div>
                </div>
              )}
            </div>
          )}

          {visionTab === "signage" && (
            <div className="animate-in slide-in-from-bottom-4 fade-in py-4 text-center duration-300">
              <div className="mb-3 inline-block rounded-full bg-white/10 p-4">
                <IconScan className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="font-medium text-white">Auto-Detecting Thai Text...</p>
              <p className="mt-1 text-sm text-gray-400">
                Hold camera steady over street signs or menus.
              </p>
              <button className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-700">
                Simulate Translation Overlay
              </button>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
