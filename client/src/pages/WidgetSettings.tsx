import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Save, 
  Copy, 
  Check, 
  Sparkles, 
  MessageCircle, 
  Send, 
  Palette,
  Settings2,
  Code2,
  Wand2,
  Eye,
  Monitor,
  Maximize2,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpLeft
} from "lucide-react";

interface WidgetSettings {
  id: string;
  businessAccountId: string;
  chatColor: string;
  chatColorEnd: string;
  widgetHeaderText: string;
  welcomeMessageType: string;
  welcomeMessage: string;
  buttonStyle: string;
  buttonAnimation: string;
  personality: string;
  widgetWidth: string;
  widgetHeight: string;
  widgetPosition: string;
  bubbleSize: string;
  sizePreset: string;
  autoOpenChat: string;
  createdAt: string;
  updatedAt: string;
}

export default function WidgetSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chatColor, setChatColor] = useState("#9333ea");
  const [chatColorEnd, setChatColorEnd] = useState("#3b82f6");
  const [widgetHeaderText, setWidgetHeaderText] = useState("Hi Chroney");
  const [welcomeMessageType, setWelcomeMessageType] = useState("custom");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! How can I help you today?");
  const [buttonStyle, setButtonStyle] = useState("circular");
  const [buttonAnimation, setButtonAnimation] = useState("bounce");
  const [personality, setPersonality] = useState("friendly");
  const [widgetWidth, setWidgetWidth] = useState("400");
  const [widgetHeight, setWidgetHeight] = useState("600");
  const [widgetPosition, setWidgetPosition] = useState("bottom-right");
  const [bubbleSize, setBubbleSize] = useState("60");
  const [sizePreset, setSizePreset] = useState("medium");
  const [autoOpenChat, setAutoOpenChat] = useState("false");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const { data: settings, isLoading } = useQuery<WidgetSettings>({
    queryKey: ["/api/widget-settings"],
  });

  useEffect(() => {
    if (settings) {
      setChatColor(settings.chatColor);
      setChatColorEnd(settings.chatColorEnd || "#3b82f6");
      setWidgetHeaderText(settings.widgetHeaderText || "Hi Chroney");
      setWelcomeMessageType(settings.welcomeMessageType || "custom");
      setWelcomeMessage(settings.welcomeMessage);
      setButtonStyle(settings.buttonStyle || "circular");
      setButtonAnimation(settings.buttonAnimation || "bounce");
      setPersonality(settings.personality || "friendly");
      setWidgetWidth(settings.widgetWidth || "400");
      setWidgetHeight(settings.widgetHeight || "600");
      setWidgetPosition(settings.widgetPosition || "bottom-right");
      setBubbleSize(settings.bubbleSize || "60");
      setSizePreset(settings.sizePreset || "medium");
      setAutoOpenChat(settings.autoOpenChat || "false");
    }
  }, [settings]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!settings) return;
    
    const hasChanges = 
      chatColor !== settings.chatColor ||
      chatColorEnd !== settings.chatColorEnd ||
      widgetHeaderText !== settings.widgetHeaderText ||
      welcomeMessageType !== settings.welcomeMessageType ||
      welcomeMessage !== settings.welcomeMessage ||
      buttonStyle !== settings.buttonStyle ||
      buttonAnimation !== settings.buttonAnimation ||
      personality !== settings.personality ||
      widgetWidth !== settings.widgetWidth ||
      widgetHeight !== settings.widgetHeight ||
      widgetPosition !== settings.widgetPosition ||
      bubbleSize !== settings.bubbleSize ||
      sizePreset !== settings.sizePreset ||
      autoOpenChat !== settings.autoOpenChat;

    if (!hasChanges) {
      setSaveStatus("idle");
      return;
    }
    
    const timeoutId = setTimeout(() => {
      setSaveStatus("saving");
      updateMutation.mutate({ 
        chatColor, 
        chatColorEnd, 
        widgetHeaderText, 
        welcomeMessageType, 
        welcomeMessage, 
        buttonStyle, 
        buttonAnimation, 
        personality,
        widgetWidth,
        widgetHeight,
        widgetPosition,
        bubbleSize,
        sizePreset,
        autoOpenChat
      });
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [settings, chatColor, chatColorEnd, widgetHeaderText, welcomeMessageType, welcomeMessage, buttonStyle, buttonAnimation, personality, widgetWidth, widgetHeight, widgetPosition, bubbleSize, sizePreset, autoOpenChat]);

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      chatColor: string; 
      chatColorEnd: string; 
      widgetHeaderText: string; 
      welcomeMessageType: string; 
      welcomeMessage: string; 
      buttonStyle: string; 
      buttonAnimation: string; 
      personality: string;
      widgetWidth: string;
      widgetHeight: string;
      widgetPosition: string;
      bubbleSize: string;
      sizePreset: string;
      autoOpenChat: string;
    }) => {
      const response = await fetch("/api/widget-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/widget-settings"]
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error: Error) => {
      setSaveStatus("idle");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const widgetDomain = 'https://portal.aichroney.com';
  const configObject = {
    businessAccountId: settings?.businessAccountId || 'YOUR_BUSINESS_ID'
  };
  
  const safeJsonConfig = JSON.stringify(configObject);
  const safeWidgetUrl = JSON.stringify(widgetDomain + '/widget.js');
  
  const embedCode = `<!-- AI Chroney Widget -->
<script>
  (function() {
    var config = ${safeJsonConfig};
    var script = document.createElement('script');
    script.src = ${safeWidgetUrl};
    script.onload = function() {
      if (window.HiChroneyWidget) {
        window.HiChroneyWidget.init(config);
      }
    };
    document.body.appendChild(script);
  })();
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading widget settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30">
      <div className="container mx-auto p-4 md:p-6 max-w-[1600px]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <Wand2 className="w-8 h-8 text-purple-600" />
                Widget Studio
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Design and customize your AI chatbot widget in real-time
              </p>
            </div>
            
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Saved</span>
                </>
              )}
              {saveStatus === "idle" && (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">All changes saved</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Settings */}
          <div className="space-y-6">
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-50 to-white backdrop-blur-sm shadow-md h-auto p-1 rounded-xl">
                <TabsTrigger value="appearance" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200 data-[state=active]:to-blue-100 data-[state=active]:text-purple-900 data-[state=active]:font-semibold">
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Style</span>
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200 data-[state=active]:to-blue-100 data-[state=active]:text-purple-900 data-[state=active]:font-semibold">
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Behavior</span>
                </TabsTrigger>
                <TabsTrigger value="embed" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200 data-[state=active]:to-blue-100 data-[state=active]:text-purple-900 data-[state=active]:font-semibold">
                  <Code2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Embed</span>
                </TabsTrigger>
              </TabsList>

              {/* Style Tab */}
              <TabsContent value="appearance" className="space-y-4 mt-4">
                <Card className="shadow-md border-gray-200/60 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <CardTitle className="text-lg">Colors & Branding</CardTitle>
                    <CardDescription>Customize colors to match your brand</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6">
                    {/* Header Text */}
                    <div className="space-y-2">
                      <Label htmlFor="widgetHeaderText" className="text-sm font-semibold text-gray-700">
                        Widget Header
                      </Label>
                      <Input
                        id="widgetHeaderText"
                        type="text"
                        value={widgetHeaderText}
                        onChange={(e) => setWidgetHeaderText(e.target.value)}
                        placeholder="Hi Chroney"
                        maxLength={30}
                        className="text-base"
                      />
                      <p className="text-xs text-gray-500">
                        {widgetHeaderText.length}/30 characters
                      </p>
                    </div>

                    {/* Gradient Colors */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Brand Gradient</Label>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Start Color */}
                        <div className="space-y-2">
                          <Label htmlFor="chatColor" className="text-xs text-gray-600">
                            Start Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              id="chatColor"
                              value={chatColor}
                              onChange={(e) => setChatColor(e.target.value)}
                              className="h-11 w-16 rounded-lg border-2 border-gray-200 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={chatColor}
                              onChange={(e) => setChatColor(e.target.value)}
                              placeholder="#9333ea"
                              className="flex-1 text-sm font-mono"
                            />
                          </div>
                        </div>

                        {/* End Color */}
                        <div className="space-y-2">
                          <Label htmlFor="chatColorEnd" className="text-xs text-gray-600">
                            End Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              id="chatColorEnd"
                              value={chatColorEnd}
                              onChange={(e) => setChatColorEnd(e.target.value)}
                              className="h-11 w-16 rounded-lg border-2 border-gray-200 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={chatColorEnd}
                              onChange={(e) => setChatColorEnd(e.target.value)}
                              placeholder="#3b82f6"
                              className="flex-1 text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Gradient Preview */}
                      <div 
                        className="h-16 rounded-xl shadow-lg relative overflow-hidden group"
                        style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white font-medium text-sm bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                            Your Brand Gradient
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-gray-200/60 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <CardTitle className="text-lg">Button Style</CardTitle>
                    <CardDescription>Choose your chat button appearance</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { id: "circular", label: "Circle", icon: "rounded-full" },
                        { id: "rounded", label: "Rounded", icon: "rounded-2xl" },
                        { id: "pill", label: "Pill", icon: "rounded-full px-4" },
                        { id: "minimal", label: "Square", icon: "rounded-xl" },
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setButtonStyle(style.id)}
                          className={`p-4 border-2 rounded-xl transition-all hover:scale-105 ${
                            buttonStyle === style.id 
                              ? "border-purple-600 bg-purple-50 shadow-lg" 
                              : "border-gray-200 hover:border-purple-300 bg-white"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div 
                              className={`w-12 h-12 ${style.icon} flex items-center justify-center text-white shadow-md`}
                              style={{ background: `linear-gradient(to right, ${chatColor}, ${chatColorEnd})` }}
                            >
                              <MessageCircle className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{style.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 pt-5 border-t space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Animation</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "bounce", label: "Bounce", animate: true },
                          { id: "none", label: "Static", animate: false },
                        ].map((anim) => (
                          <button
                            key={anim.id}
                            onClick={() => setButtonAnimation(anim.id)}
                            className={`p-4 border-2 rounded-xl transition-all hover:scale-105 ${
                              buttonAnimation === anim.id 
                                ? "border-purple-600 bg-purple-50 shadow-lg" 
                                : "border-gray-200 hover:border-purple-300 bg-white"
                            }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <div 
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                                  anim.animate ? "animate-bounce" : ""
                                }`}
                                style={{ background: `linear-gradient(to right, ${chatColor}, ${chatColorEnd})` }}
                              >
                                <MessageCircle className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">{anim.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Widget Size & Position Card */}
                <Card className="shadow-md border-gray-200/60 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Maximize2 className="w-5 h-5" />
                      Widget Size & Position
                    </CardTitle>
                    <CardDescription>Control widget dimensions and placement on your website</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Size Presets */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Size Preset</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: "small", label: "Small", width: "350", height: "500" },
                          { id: "medium", label: "Medium", width: "400", height: "600" },
                          { id: "large", label: "Large", width: "450", height: "700" },
                          { id: "custom", label: "Custom", width: widgetWidth, height: widgetHeight },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setSizePreset(preset.id);
                              if (preset.id !== "custom") {
                                setWidgetWidth(preset.width);
                                setWidgetHeight(preset.height);
                              }
                            }}
                            className={`p-3 border-2 rounded-xl transition-all hover:scale-105 ${
                              sizePreset === preset.id 
                                ? "border-purple-600 bg-purple-50 shadow-lg" 
                                : "border-gray-200 hover:border-purple-300 bg-white"
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-gray-700">{preset.label}</span>
                              {preset.id !== "custom" && (
                                <span className="text-[10px] text-gray-500">{preset.width}×{preset.height}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Width Control */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700">Width</Label>
                        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{widgetWidth}px</span>
                      </div>
                      <Slider
                        value={[parseInt(widgetWidth)]}
                        onValueChange={(value) => {
                          setWidgetWidth(value[0].toString());
                          setSizePreset("custom");
                        }}
                        min={300}
                        max={600}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    {/* Height Control */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700">Height</Label>
                        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{widgetHeight}px</span>
                      </div>
                      <Slider
                        value={[parseInt(widgetHeight)]}
                        onValueChange={(value) => {
                          setWidgetHeight(value[0].toString());
                          setSizePreset("custom");
                        }}
                        min={400}
                        max={800}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    {/* Bubble Size Control */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700">Chat Bubble Size</Label>
                        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{bubbleSize}px</span>
                      </div>
                      <Slider
                        value={[parseInt(bubbleSize)]}
                        onValueChange={(value) => setBubbleSize(value[0].toString())}
                        min={40}
                        max={80}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Position Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Widget Position</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "bottom-right", label: "Bottom Right", icon: ArrowDownRight },
                          { id: "bottom-left", label: "Bottom Left", icon: ArrowDownLeft },
                          { id: "top-right", label: "Top Right", icon: ArrowUpRight },
                          { id: "top-left", label: "Top Left", icon: ArrowUpLeft },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => setWidgetPosition(pos.id)}
                            className={`p-4 border-2 rounded-xl transition-all hover:scale-105 ${
                              widgetPosition === pos.id 
                                ? "border-purple-600 bg-purple-50 shadow-lg" 
                                : "border-gray-200 hover:border-purple-300 bg-white"
                            }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <pos.icon className="w-6 h-6 text-purple-600" />
                              <span className="text-xs font-semibold text-gray-700">{pos.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Behavior Tab */}
              <TabsContent value="behavior" className="space-y-4 mt-4">
                <Card className="shadow-md border-gray-200/60 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <CardTitle className="text-lg">Welcome Message</CardTitle>
                    <CardDescription>First impression matters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <RadioGroup value={welcomeMessageType} onValueChange={setWelcomeMessageType}>
                      <div className={`flex items-start space-x-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        welcomeMessageType === "custom" 
                          ? "border-purple-500 bg-purple-50/50 shadow-md" 
                          : "border-gray-200 hover:border-purple-300 bg-white"
                      }`} onClick={() => setWelcomeMessageType("custom")}>
                        <RadioGroupItem value="custom" id="custom" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="custom" className="font-semibold cursor-pointer text-base">
                            Custom Message
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            Write your own personalized greeting
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-start space-x-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        welcomeMessageType === "ai_generated" 
                          ? "border-purple-500 bg-purple-50/50 shadow-md" 
                          : "border-gray-200 hover:border-purple-300 bg-white"
                      }`} onClick={() => setWelcomeMessageType("ai_generated")}>
                        <RadioGroupItem value="ai_generated" id="ai_generated" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="ai_generated" className="font-semibold cursor-pointer flex items-center gap-2 text-base">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            AI-Generated
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            Dynamic messages based on your business
                          </p>
                        </div>
                      </div>
                    </RadioGroup>

                    {welcomeMessageType === "custom" && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="welcomeMessage" className="text-sm font-semibold text-gray-700">
                          Your Message
                        </Label>
                        <Textarea
                          id="welcomeMessage"
                          value={welcomeMessage}
                          onChange={(e) => setWelcomeMessage(e.target.value)}
                          placeholder="Hi! How can I help you today?"
                          maxLength={100}
                          className="min-h-[100px] resize-none"
                        />
                        <p className="text-xs text-gray-500">
                          {welcomeMessage.length}/100 characters
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-md border-gray-200/60 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <CardTitle className="text-lg">AI Personality</CardTitle>
                    <CardDescription>How should Chroney interact?</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <RadioGroup value={personality} onValueChange={setPersonality} className="space-y-3">
                      {[
                        { id: "friendly", label: "Friendly", desc: "Warm and approachable, like a helpful friend", emoji: "😊" },
                        { id: "professional", label: "Professional", desc: "Business-focused and formal", emoji: "💼" },
                        { id: "funny", label: "Funny", desc: "Light-hearted with humor", emoji: "😄" },
                        { id: "polite", label: "Polite", desc: "Respectful and courteous", emoji: "🙏" },
                        { id: "casual", label: "Casual", desc: "Relaxed and easy-going", emoji: "😎" },
                      ].map((p) => (
                        <div 
                          key={p.id}
                          className={`flex items-start space-x-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                            personality === p.id 
                              ? "border-purple-500 bg-purple-50/50 shadow-md" 
                              : "border-gray-200 hover:border-purple-300 bg-white"
                          }`}
                          onClick={() => setPersonality(p.id)}
                        >
                          <RadioGroupItem value={p.id} id={p.id} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={p.id} className="font-semibold cursor-pointer text-base flex items-center gap-2">
                              <span>{p.emoji}</span>
                              {p.label}
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">{p.desc}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-gray-200/60 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <CardTitle className="text-lg">Chat Behavior</CardTitle>
                    <CardDescription>Control how the chat widget appears</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="auto-open-chat" className="text-base font-semibold cursor-pointer">
                          Auto-Open Chat
                        </Label>
                        <p className="text-sm text-gray-600">
                          Automatically open the chat window when the page loads
                        </p>
                      </div>
                      <Switch
                        id="auto-open-chat"
                        checked={autoOpenChat === "true"}
                        onCheckedChange={(checked) => setAutoOpenChat(checked ? "true" : "false")}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Embed Tab */}
              <TabsContent value="embed" className="space-y-4 mt-4">
                <Card className="shadow-md border-gray-200/60 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <CardTitle className="text-lg">Website Integration</CardTitle>
                    <CardDescription>Add the widget to your website</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Code2 className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">How to Install</h4>
                          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                            <li>Copy the embed code below</li>
                            <li>Paste it before the closing &lt;/body&gt; tag in your HTML</li>
                            <li>The widget will appear automatically on your site</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Embed Code</Label>
                      <div className="relative">
                        <Textarea
                          value={embedCode}
                          readOnly
                          className="font-mono text-xs min-h-[220px] bg-gray-50 border-2 pr-4 resize-none"
                        />
                        <Button
                          onClick={handleCopy}
                          size="sm"
                          className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Code
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Live Preview (Sticky) */}
          <div className="lg:sticky lg:top-6 h-fit">
            <Card className="shadow-xl border-gray-200/60 bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-purple-600" />
                      Live Preview
                    </CardTitle>
                    <CardDescription className="mt-1">See your changes instantly</CardDescription>
                  </div>
                  <Monitor className="w-5 h-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Website mockup background */}
                <div className="bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 rounded-2xl p-8 min-h-[600px] relative border-2 border-gray-200/50 shadow-inner">
                  {/* Mockup website elements */}
                  <div className="space-y-3 mb-8 opacity-40">
                    <div className="h-8 bg-gray-300 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                    <div className="h-32 bg-gray-300 rounded-xl w-full mt-4"></div>
                  </div>

                  {/* Chat Widget Preview */}
                  <div className="absolute bottom-8 right-8 space-y-4">
                    {/* Floating Chat Button */}
                    <div className="flex justify-end mb-4">
                      {buttonStyle === "circular" && (
                        <button 
                          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer ${
                            buttonAnimation === "bounce" ? "animate-bounce" : ""
                          }`}
                          style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                        >
                          <MessageCircle className="w-8 h-8" />
                        </button>
                      )}
                      {buttonStyle === "rounded" && (
                        <button 
                          className={`w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer ${
                            buttonAnimation === "bounce" ? "animate-bounce" : ""
                          }`}
                          style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                        >
                          <MessageCircle className="w-8 h-8" />
                        </button>
                      )}
                      {buttonStyle === "pill" && (
                        <button 
                          className={`px-6 py-4 rounded-full shadow-2xl flex items-center gap-2 text-white transition-all hover:scale-110 cursor-pointer font-medium ${
                            buttonAnimation === "bounce" ? "animate-bounce" : ""
                          }`}
                          style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                        >
                          <MessageCircle className="w-6 h-6" />
                          <span>Chat</span>
                        </button>
                      )}
                      {buttonStyle === "minimal" && (
                        <button 
                          className={`w-14 h-14 rounded-xl shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer ${
                            buttonAnimation === "bounce" ? "animate-bounce" : ""
                          }`}
                          style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                        >
                          <MessageCircle className="w-7 h-7" />
                        </button>
                      )}
                    </div>

                    {/* Chat Window Preview */}
                    <div className="bg-white rounded-2xl shadow-2xl w-[340px] border border-gray-200 overflow-hidden">
                      {/* Chat header */}
                      <div 
                        className="px-5 py-4 text-white"
                        style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                      >
                        <h3 className="font-bold text-lg">{widgetHeaderText}</h3>
                        <p className="text-sm flex items-center gap-2 opacity-90">
                          <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                          Online
                        </p>
                      </div>

                      {/* Chat messages */}
                      <div className="p-4 space-y-3 bg-gray-50 min-h-[320px]">
                        {/* AI Welcome Message */}
                        <div className="flex gap-3 items-start">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-md"
                            style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                          >
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                              <p className="text-sm text-gray-800 leading-relaxed">
                                {welcomeMessageType === "ai_generated" 
                                  ? "Hello! 👋 I'm Chroney, your AI assistant. I can help you explore products, answer questions, and capture leads. How can I assist you?"
                                  : welcomeMessage || "Hi! How can I help you today?"}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block ml-1">Just now</span>
                          </div>
                        </div>

                        {/* Sample user message */}
                        <div className="flex gap-3 items-start justify-end">
                          <div className="text-right">
                            <div 
                              className="rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm text-white inline-block"
                              style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                            >
                              <p className="text-sm">Tell me more!</p>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block mr-1">Just now</span>
                          </div>
                        </div>
                      </div>

                      {/* Chat input */}
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-3">
                          <input 
                            type="text" 
                            placeholder="Type a message..." 
                            className="bg-transparent text-sm flex-1 outline-none text-gray-600"
                            disabled
                          />
                          <button 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 shadow-md"
                            style={{ background: `linear-gradient(135deg, ${chatColor}, ${chatColorEnd})` }}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
