import React, { useState } from "react";

const API_URL = "http://localhost:3000/chat";

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Add a blank assistant message to show streamed text
    let assistantContent = "";
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    let tempMessages = [...newMessages, { role: "assistant", content: "" }];

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value);
          // The backend sends each chunk as: data: {...}\n\n
          const lines = chunk.split("\n")
            .filter(line => line.trim().startsWith("data:"))
            .map(line => line.replace(/^data:\s*/, ""));
          for (const line of lines) {
            if (!line) continue;
            const data = JSON.parse(line);
            if (data.token) {
              assistantContent += data.token;
              tempMessages[tempMessages.length - 1] = { role: "assistant", content: assistantContent };
              setMessages([...tempMessages]);
            } else if (data.done) {
              setLoading(false);
            } else if (data.error) {
              tempMessages[tempMessages.length - 1] = { role: "assistant", content: `[Error: ${data.error}]` };
              setMessages([...tempMessages]);
              setLoading(false);
            }
          }
        }
        done = readerDone;
      }
      setLoading(false);
    } catch (err) {
      let temp = [...messages, { role: "assistant", content: `[Error: ${err.message}]` }];
      setMessages(temp);
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
      <div style={{ minHeight: 200, maxHeight: 400, overflowY: "auto", marginBottom: 16 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === "user" ? "right" : "left", margin: "8px 0" }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 16,
                background: msg.role === "user" ? "#d1e7dd" : "#f8f9fa",
                color: "#222",
                maxWidth: 400,
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: "left", color: "#aaa" }}>
            <em>Assistant is typing...</em>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
    </div>
  );
}