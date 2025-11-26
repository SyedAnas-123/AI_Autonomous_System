import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Brain,
  Sparkles,
  Trash2,
  Download,
  FileText,
  Zap,
  Loader2,
  Activity,
  Terminal,
  Image as ImageIcon,
  MessageSquare,
  Cpu,
  Mic
} from "lucide-react";

// ----------------------------------------------------------------------
// 🔮 AXORA ORB COMPONENT (Full Size & Radiant)
// ----------------------------------------------------------------------
const AxoraOrb = () => {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center pointer-events-none select-none scale-100 transition-transform duration-1000">
      {/* 1. Massive Outer Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-[100px] opacity-40 animate-pulse duration-[4s]"></div>
      
      {/* 2. Inner Plasma Sphere */}
      <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden shadow-[0_0_90px_rgba(255,255,255,0.3)] z-10">
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,#06b6d4_90deg,#d946ef_180deg,#f59e0b_270deg,transparent_360deg)] animate-[spin_3s_linear_infinite] opacity-70 mix-blend-plus-lighter"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg,transparent_0deg,#8b5cf6_90deg,#ec4899_180deg,#06b6d4_270deg,transparent_360deg)] animate-[spin_5s_linear_infinite_reverse] opacity-60 mix-blend-plus-lighter"></div>
        
        {/* Core */}
        <div className="absolute inset-2 bg-white rounded-full blur-md animate-pulse duration-[2s] shadow-[0_0_40px_rgba(255,255,255,0.8)] opacity-80"></div>
        <div className="absolute inset-[15%] bg-gradient-to-tr from-white via-cyan-100 to-white rounded-full blur-sm opacity-70"></div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// ⚡ MAIN APP COMPONENT
// ----------------------------------------------------------------------
const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTasks, setCurrentTasks] = useState([]);
  const [mode, setMode] = useState("text"); // "text" | "image"
  const [expandedReasoningIndex, setExpandedReasoningIndex] = useState(null);
  const messagesEndRef = useRef(null);

  // ----------------------------------------------------------------------
  // ⚙️ BACKEND CONFIGURATION
  // ----------------------------------------------------------------------
  // const HF_BACKEND_URL = "http://localhost:3001/api/hf"; change due to deployment
  //for deployment we use :
  // ✅ Backend base URL (local + production both)
  const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";


   // for deployment  text route 
  const HF_BACKEND_URL = `${BACKEND_BASE_URL}/api/hf`;
  //FOR DEPLOYMENT IMAGE ROUTE :
  const HF_IMAGE_URL = `${BACKEND_BASE_URL}/api/hf-image`;



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ----------------------------------------------------------------------
  // 🔍 Helper: LLM output parser
  // ----------------------------------------------------------------------
  const parseLLMOutput = (raw) => {
    if (!raw || typeof raw !== "string") return { visible: "", reasoning: "" };
    let reasoning = "";
    let visible = raw;
    const thinkStart = raw.indexOf("<think>");
    const thinkEnd = raw.indexOf("</think>");

    if (thinkStart !== -1 && thinkEnd !== -1 && thinkEnd > thinkStart) {
      reasoning = raw.slice(thinkStart + "<think>".length, thinkEnd).trim();
      visible = (raw.slice(0, thinkStart) + raw.slice(thinkEnd + "</think>".length)).trim();
    }
    visible = visible.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "");
    return { visible, reasoning };
  };

  // ----------------------------------------------------------------------
  // 🧠 API HANDLER
  // ----------------------------------------------------------------------
  const callHuggingFaceAPI = async (model, inputs, action) => {
    try {
      const response = await fetch(HF_BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, inputs }),
      });
      if (!response.ok) throw new Error(`Backend Error ${response.status}`);
      const result = await response.json();
      
      let rawText = "Task completed.";
      if (Array.isArray(result)) {
        rawText = result[0]?.generated_text || result[0]?.summary_text || JSON.stringify(result);
      } else if (typeof result === "object" && result !== null) {
        rawText = result.generated_text || result.summary_text || JSON.stringify(result);
      }
      const { visible, reasoning } = parseLLMOutput(rawText);
      return { success: true, text: visible, reasoning };
    } catch (error) {
      return {
        success: false,
        text: `Simulation Mode (Backend Unreachable): I received your request to "${action}". Since the backend is offline, I am simulating this response to show the UI.`,
        isError: true,
      };
    }
  };

  const callImageAPI = async (prompt) => {
    try {
      const response = await fetch(HF_IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error("Backend Error");
      const data = await response.json();
      return { success: true, imageUrl: data.image };
    } catch (err) {
      return { 
        success: true, 
        imageUrl: `https://via.placeholder.com/1024x1024/0f172a/06b6d4?text=Axora+Image+Simulation` 
      };
    }
  };

  const downloadImage = (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "axora-generated.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ----------------------------------------------------------------------
  // 🤖 AGENT LOGIC
  // ----------------------------------------------------------------------
  const agentCapabilities = {
    generate: async (prompt) => callHuggingFaceAPI("smollm3", prompt, "generate"),
    summarize: async (text) => callHuggingFaceAPI("smollm3", text, "summarize"),
    answer: async (q) => callHuggingFaceAPI("smollm3", q, "answer"),
    analyze: async (text) => callHuggingFaceAPI("smollm3", text, "analyze"),
    write: async (topic) => callHuggingFaceAPI("smollm3", topic, "write"),
  };

  const analyzeIntent = (userInput) => {
    const lower = userInput.toLowerCase();
    const actions = [];
    if (lower.includes("summarize")) actions.push({ action: "summarize", icon: FileText, color: "text-blue-400" });
    else if (lower.includes("analyze")) actions.push({ action: "analyze", icon: Brain, color: "text-emerald-400" });
    else if (lower.includes("write") || lower.includes("create")) actions.push({ action: "write", icon: Sparkles, color: "text-pink-400" });
    else if (lower.includes("answer") || lower.includes("what")) actions.push({ action: "answer", icon: Zap, color: "text-amber-400" });
    else actions.push({ action: "generate", icon: Terminal, color: "text-indigo-400" });
    return actions;
  };

  const executeTask = async (task, userInput) => {
    const cleanText = userInput.replace(new RegExp(task.action, "gi"), "").trim();
    let resObj = { success: false, text: "Error" };
    await new Promise(r => setTimeout(r, 1500));

    switch(task.action) {
        case "summarize": resObj = await agentCapabilities.summarize(cleanText); break;
        case "analyze": resObj = await agentCapabilities.analyze(cleanText); break;
        case "write": resObj = await agentCapabilities.write(cleanText); break;
        case "answer": resObj = await agentCapabilities.answer(cleanText); break;
        default: resObj = await agentCapabilities.generate(cleanText);
    }
    return { action: task.action, result: resObj.text, reasoning: resObj.reasoning, offline: resObj.isError };
  };

  const processUserInput = async (userInput) => {
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: userInput }]);

    const tasks = analyzeIntent(userInput).map(t => ({...t, id: Date.now(), status: "running"}));
    setCurrentTasks(tasks);

    const results = [];
    for (const task of tasks) {
        results.push(await executeTask(task, userInput));
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        content: results[0].result,
        tasks: tasks,
        isOffline: results[0].offline,
        reasoning: results[0].reasoning,
      },
    ]);
    setIsProcessing(false);
    setTimeout(() => setCurrentTasks([]), 3000);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const userInput = input;
    setInput("");

    if (mode === "image") {
      setMessages((prev) => [...prev, { role: "user", content: userInput }]);
      setIsProcessing(true);
      const imgRes = await callImageAPI(userInput);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: imgRes.success ? "🎨 Here is your generated image:" : imgRes.text,
          imageUrl: imgRes.imageUrl,
          isOffline: !imgRes.success
        },
      ]);
      setIsProcessing(false);
    } else {
      await processUserInput(userInput);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* 🌌 AMBIENT BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]"></div>
        <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8s]"></div>
        <div className="absolute -bottom-32 left-[30%] w-[700px] h-[700px] bg-pink-600/10 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-150 contrast-150"></div>
      </div>

      {/* ------------------ TRANSPARENT HEADER ------------------ */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur opacity-40 group-hover:opacity-80 transition-opacity duration-500"></div>
            <div className="relative bg-black/40 border border-white/10 p-2 rounded-lg backdrop-blur-md">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
              Axora <span className="text-cyan-500">.ai</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => setMessages([])}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-all duration-300 backdrop-blur-sm"
                title="Clear Memory"
            >
                <Trash2 className="w-4 h-4" />
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-600 to-purple-600 p-[1px] shadow-lg">
                <div className="h-full w-full rounded-full bg-black/80 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-xs font-bold text-white">JD</span>
                </div>
            </div>
        </div>
      </div>

      {/* ------------------ MAIN CONTENT AREA ------------------ */}
      <div className="relative z-10 flex-1 h-full overflow-y-auto px-4 md:px-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent pt-12 pb-32">
        <div className={`max-w-4xl mx-auto ${messages.length === 0 ? 'h-full flex flex-col justify-center' : 'space-y-6'}`}>
          
          {/* EMPTY STATE */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center animate-fadeIn pb-10">
              {/* ORB (Reduced bottom margin to bring text closer) */}
              <div className="mb-0 scale-100 transition-transform duration-700 hover:scale-105">
                <AxoraOrb />
              </div>

              {/* WELCOME TEXT (Reduced bottom margin to bring cards closer) */}
              <div className="text-center mb-4 space-y-2">
                <h2 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-zinc-400 tracking-tight drop-shadow-2xl">
                  Good Evening, Creator.
                </h2>
                <p className="text-zinc-300 text-sm md:text-lg font-light tracking-wide drop-shadow-md">
                  I am Axora. How can I assist your workflow today?
                </p>
              </div>

              {/* FEATURE CARDS - Transparent & Glassy */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-5xl px-2">
                {[
                  { title: "Summarize", desc: "Condense long articles", icon: FileText, color: "text-blue-400", border: "group-hover:border-blue-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]" },
                  { title: "Analyze", desc: "Extract insights & data", icon: Brain, color: "text-emerald-400", border: "group-hover:border-emerald-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]" },
                  { title: "Create", desc: "Stories, code & poems", icon: Sparkles, color: "text-pink-400", border: "group-hover:border-pink-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]" },
                  { title: "Answer", desc: "Complex Q&A logic", icon: Zap, color: "text-amber-400", border: "group-hover:border-amber-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(item.desc)}
                    className={`group relative text-left p-4 rounded-xl bg-black/20 border border-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 overflow-hidden ${item.border} ${item.glow}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className={`mb-2 p-2 w-fit rounded-lg bg-white/5 ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-semibold mb-1 text-sm tracking-wide drop-shadow-sm">{item.title}</h3>
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slideUp`}>
              <div className={`relative max-w-[85%] md:max-w-2xl group`}>
                {msg.role === "user" ? (
                  <div className="bg-[#1a1a1a]/80 backdrop-blur-md text-white px-6 py-4 rounded-[2rem] rounded-tr-sm border border-white/10 shadow-lg">
                    <p className="leading-relaxed whitespace-pre-wrap text-[15px]">{msg.content}</p>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Cpu className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 px-6 py-5 rounded-[2rem] rounded-tl-sm shadow-xl text-zinc-300 w-full">
                      {msg.tasks && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {msg.tasks.map((task, i) => {
                             const Icon = task.icon;
                             return (
                               <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-white/5 rounded-full text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                                 <Icon className="w-3 h-3" />
                                 {task.action}
                               </div>
                             );
                          })}
                        </div>
                      )}
                      <div className="prose prose-invert prose-sm max-w-none leading-7 text-zinc-300">
                        {msg.content}
                      </div>
                      {msg.imageUrl && (
                         <div className="mt-4 group/img relative rounded-2xl overflow-hidden border border-white/10 bg-black/50">
                            <img src={msg.imageUrl} alt="Generated" className="w-full object-cover max-h-96" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <button onClick={() => downloadImage(msg.imageUrl)} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform">
                                    <Download className="w-4 h-4" /> Save Image
                                </button>
                            </div>
                         </div>
                      )}
                      {msg.reasoning && (
                        <div className="mt-4 pt-3 border-t border-white/5">
                          <button onClick={() => setExpandedReasoningIndex(expandedReasoningIndex === idx ? null : idx)} className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-cyan-400 transition-colors">
                            <Activity className="w-3 h-3" />
                            {expandedReasoningIndex === idx ? "Hide Thought Process" : "View Thought Process"}
                          </button>
                          {expandedReasoningIndex === idx && (
                            <div className="mt-2 p-3 bg-black/40 rounded-lg border border-white/5 text-xs font-mono text-zinc-400 overflow-x-auto">
                              {msg.reasoning}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ------------------ FLOATING INPUT BAR (NO STRIP) ------------------ */}
      <div className="absolute bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          {/* Glass Capsule */}
          <div className="relative bg-black/40 border border-white/10 rounded-full p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-300 focus-within:bg-black/60 focus-within:border-cyan-500/30 focus-within:shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)]">
            <div className="flex items-center">
              
              {/* Mode Toggle (Compact) */}
              <div className="flex items-center bg-white/5 rounded-full p-1 mr-2">
                 <button onClick={() => setMode("text")} className={`p-2 rounded-full transition-all duration-300 ${mode === "text" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`} title="Text Mode">
                   <MessageSquare className="w-4 h-4" />
                 </button>
                 <button onClick={() => setMode("image")} className={`p-2 rounded-full transition-all duration-300 ${mode === "image" ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`} title="Image Mode">
                   <ImageIcon className="w-4 h-4" />
                 </button>
              </div>

              {/* Input Field */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
                placeholder={mode === "image" ? "Describe image..." : "Ask Axora..."}
                className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 px-2 py-2 focus:outline-none text-sm"
              />

              {/* Actions */}
              <div className="flex items-center gap-2 pr-1">
                  {currentTasks.length > 0 && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                  {(isProcessing && mode === "image") && <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />}
                  
                  <button className="p-2 rounded-full text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-colors">
                      <Mic className="w-4 h-4" />
                  </button>
                  
                  <button onClick={handleSend} disabled={!input.trim() || isProcessing} className={`p-2 rounded-full transition-all duration-300 ${input.trim() ? "bg-white text-black hover:scale-105" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"}`}>
                      <Send className="w-4 h-4" />
                  </button>
              </div>
            </div>
          </div>
          
          <p className="text-center text-[10px] text-zinc-500 mt-2 font-medium drop-shadow-md">
            Axora can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;


// STEP 2 :
//   cd server
// Step 3: Install backend dependencies (only once)
//   install express cors node-fetch dotenv
// 
// Step 4: Add "type": "module" in server/package.json

// (If package.json does not exist, create it with npm init -y)

// Inside server/package.json:

// {
//   "type": "module"
// }
//  step 5 : node server.js
