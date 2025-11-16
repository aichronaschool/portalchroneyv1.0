import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Send, Loader2, Sparkles, Lock } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: any[];
}

interface PublicChatData {
  businessAccount: {
    id: string;
    name: string;
    website: string;
    description: string;
  };
  websiteAnalysis: {
    analyzedContent: any;
  } | null;
  widgetSettings: {
    chatColor: string;
    chatColorEnd: string;
    widgetHeaderText: string;
    currency: string;
  } | null;
  hasPassword: boolean;
}

export default function PublicChat() {
  const [, params] = useRoute("/public-chat/:token");
  const token = params?.token;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Password verification states
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  const { data, isLoading: dataLoading, error } = useQuery<PublicChatData>({
    queryKey: [`/api/public-chat/${token}`],
    queryFn: async () => {
      return await apiRequest("GET", `/api/public-chat/${token}`);
    },
    enabled: !!token,
  });

  const chatColor = data?.widgetSettings?.chatColor || "#9333ea";
  const chatColorEnd = data?.widgetSettings?.chatColorEnd || "#3b82f6";
  const currency = data?.widgetSettings?.currency || "USD";

  const currencySymbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", INR: "₹", AUD: "A$",
    CAD: "C$", CHF: "CHF", SEK: "kr", NZD: "NZ$", SGD: "S$", HKD: "HK$",
    NOK: "kr", MXN: "$", BRL: "R$", ZAR: "R", KRW: "₩", TRY: "₺",
    RUB: "₽", IDR: "Rp", THB: "฿", MYR: "RM"
  };
  const currencySymbol = currencySymbols[currency] || "$";

  // Check if password is already verified in session storage
  useEffect(() => {
    if (token) {
      const verified = sessionStorage.getItem(`public-chat-verified-${token}`);
      if (verified === 'true') {
        setIsPasswordVerified(true);
      }
    }
  }, [token]);

  useEffect(() => {
    if (data && (!data.hasPassword || isPasswordVerified)) {
      loadIntroMessage();
    }
  }, [data, isPasswordVerified]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const verifyPassword = async () => {
    if (!passwordInput.trim() || !token) return;

    try {
      setIsVerifyingPassword(true);
      setPasswordError("");

      const response = await fetch(`/api/public-chat/${token}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const result = await response.json();

      if (!response.ok || !result.verified) {
        setPasswordError("Incorrect password. Please try again.");
        return;
      }

      // Store verification status in session storage
      sessionStorage.setItem(`public-chat-verified-${token}`, 'true');
      setIsPasswordVerified(true);
      setPasswordInput("");
    } catch (error) {
      setPasswordError("Failed to verify password. Please try again.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handlePasswordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      verifyPassword();
    }
  };

  const loadIntroMessage = async () => {
    try {
      const response = await fetch(`/api/public-chat/${token}/intro`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const introData = await response.json();
      
      if (introData.intro) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: introData.intro,
          timestamp: new Date()
        }]);
      } else {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: `Hey there! Welcome to ${data?.businessAccount.name}—happy to help you find exactly what you're looking for. 😊`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to load intro:', error);
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hey there! Welcome to ${data?.businessAccount.name}—happy to help you find exactly what you're looking for. 😊`,
        timestamp: new Date()
      }]);
    }
  };

  const getTypingMessage = (query: string): string => {
    return '.....';
  };

  const animateTyping = (fullText: string, messageId: string, products?: any[]) => {
    const words = fullText.split(' ');
    let currentIndex = 0;

    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: '', products: products || msg.products }
        : msg
    ));

    const typingInterval = setInterval(() => {
      if (currentIndex < words.length) {
        const currentText = words.slice(0, currentIndex + 1).join(' ');
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: currentText, products: products || msg.products }
              : msg
          )
        );
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 80);
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading || !token) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const typingMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: getTypingMessage(userMessage.content),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch(`/api/public-chat/${token}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: userMessage.content })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const responseData = await response.json();
      
      if (responseData.products && responseData.products.length > 0) {
        animateTyping(responseData.message, aiMessageId, responseData.products);
      } else {
        animateTyping(responseData.message, aiMessageId);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: "Sorry, I'm having trouble connecting right now. Please try again." }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <div className="text-center w-full max-w-md mx-auto">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-base">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader>
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Chat Link Not Available</CardTitle>
            <CardDescription className="text-center">
              This chat link doesn't exist, has been disabled, or has expired
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show password entry screen if password is required and not verified
  if (data.hasPassword && !isPasswordVerified) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 p-4">
        <Card className="max-w-md w-full mx-auto shadow-2xl">
          <CardHeader className="space-y-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md"
              style={{
                background: `linear-gradient(135deg, ${chatColor} 0%, ${chatColorEnd} 100%)`
              }}
            >
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl mb-2">{data.businessAccount.name}</CardTitle>
              <CardDescription className="text-base">
                This chat is password protected. Please enter the password to continue.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={handlePasswordKeyPress}
                disabled={isVerifyingPassword}
                className="text-base"
              />
              {passwordError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {passwordError}
                </p>
              )}
            </div>
            <Button
              onClick={verifyPassword}
              disabled={isVerifyingPassword || !passwordInput.trim()}
              className="w-full text-white"
              size="lg"
              style={{
                background: `linear-gradient(135deg, ${chatColor} 0%, ${chatColorEnd} 100%)`
              }}
            >
              {isVerifyingPassword ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Continue to Chat"
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 p-4">
      {/* Centered Chat Container */}
      <div className="w-full max-w-4xl h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="flex-shrink-0 border-b shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${chatColor} 0%, ${chatColorEnd} 100%)`
          }}
        >
          <div className="px-6 py-4 flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-md">
              <Sparkles className="w-5 h-5" style={{ color: chatColor }} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white drop-shadow-md">
                {data.businessAccount.name}
              </h1>
              {data.businessAccount.description && (
                <p className="text-sm text-white/90">
                  {data.businessAccount.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/50 to-white">
          <div className="px-6 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'assistant' ? (
                  <div className="flex gap-3 items-start max-w-[85%]">
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${chatColor} 0%, ${chatColorEnd} 100%)`
                      }}
                    >
                      <Sparkles className={`w-4 h-4 text-white ${msg.content === '.....' ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="flex-1 space-y-3">
                      <Card className="bg-white shadow-md border-slate-200">
                        <div className="p-4">
                          {msg.content === '.....' ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          ) : (
                            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      </Card>
                      {msg.products && msg.products.length > 0 && (
                        <ProductCard
                          products={msg.products}
                          currencySymbol={currencySymbol}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div 
                      className="max-w-[85%] px-4 py-3 rounded-2xl shadow-md text-white"
                      style={{
                        background: `linear-gradient(135deg, ${chatColor} 0%, ${chatColorEnd} 100%)`
                      }}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t bg-white shadow-lg">
          <div className="px-6 py-4">
            <div className="flex gap-3">
              <Input
                placeholder="Ask me anything..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 text-base border-slate-300 focus:border-purple-500"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !message.trim()}
                size="lg"
                className="text-white shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${chatColor} 0%, ${chatColorEnd} 100%)`
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
