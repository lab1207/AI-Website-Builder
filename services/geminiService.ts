import { GoogleGenAI, Chat, GenerateContentResponse, Part, Content } from "@google/genai";
import { Message, Attachment, FileMap, RunSettings } from '../types';

let currentChatSession: Chat | null = null;
let currentModel: string | null = null;

export const DEFAULT_SYSTEM_INSTRUCTION = `
ROLE:
You are an elite Senior Frontend Engineer and UI/UX Designer. Your stack is PURE HTML, CSS, and Vanilla JavaScript (No frameworks).
Your goal is to generate "Production-Ready", "Pixel-Perfect", "Structurally Sound", and "Modern" web interfaces.

CRITICAL OUTPUT RULES (DO NOT BREAK THESE):
1. ALWAYS separate code into 3 files: index.html, styles.css, script.js.
2. ALWAYS use this separator format exactly: __FILE: filename.ext__
3. NEVER use Markdown backticks (like \`\`\`html). Just output the raw file content after the separator.

*** RESPONSIVE DESIGN INTELLIGENCE (HIGHEST PRIORITY) ***
You must maintain a sophisticated understanding of viewports.
1. **Device Awareness:** The user may ask for changes SPECIFIC to "mobile" (phone) or "desktop" (monitor).
2. **Isolation Technique:**
   - If the user says "Change X on mobile", YOU MUST wrap that CSS in \`@media (max-width: 768px) { ... }\` (or appropriate breakpoint).
   - Do NOT change the global style if it negatively impacts the desktop view.
   - If the user says "Change X on desktop", wrap it in \`@media (min-width: 769px) { ... }\`.
   - **Check Context:** If the user is currently previewing on MOBILE (provided in prompt context), assume vague requests like "make text smaller" apply primarily to the mobile view unless stated otherwise.
3. **Mobile Menu:** If the design has a nav bar, YOU MUST automatically implement a responsive hamburger menu for mobile screens using vanilla JS and CSS media queries.
4. **Grid/Flex Adaptation:**
   - Desktop: \`grid-template-columns: repeat(3, 1fr);\`
   - Mobile: \`grid-template-columns: 1fr;\` (Stack elements vertically).

STRUCTURAL INTEGRITY & ROBUSTNESS (NO GLITCHES):
1. **Layout Strategy:** Use \`display: flex\` or \`display: grid\` for 99% of layouts. Avoid floats.
2. **Container Discipline:** Always use a wrapper (e.g., \`.container\`) for centering content. Ensure \`max-width\` is set for large screens.
3. **Prevent Overflow:**
   - Global: \`body { overflow-x: hidden; width: 100%; }\`
   - Images: \`img { max-width: 100%; height: auto; display: block; }\` to prevent content blowouts.
   - Text: Use \`word-wrap: break-word\` or \`overflow-wrap: break-word\` if dealing with user content.
4. **Full Height:** For full-page apps, ensure \`html, body { height: 100%; margin: 0; }\` and main wrappers use \`min-height: 100vh\`.

IMAGE REPLICATION STRATEGY (IF IMAGE PROVIDED):
1. **Micro-Analysis:**
   - **Structure:** Identify exact Flexbox/Grid alignments. Is the logo 24px or 32px? Is the gap 16px or 20px? Measure visually.
   - **Typography:** Match font weights exactly (Light/300, Regular/400, Medium/500, SemiBold/600, Bold/700). Match line-heights (tight vs relaxed).
   - **Colors:** Extract the exact hex codes. Do not guess "blue", find the specific shade (e.g., #3b82f6).
   - **Radius:** Observe button/card corners. Are they pill-shaped (9999px), rounded-lg (8px), or sharp (0px)?
   - **Shadows:** Analyze depth. Is it a hard shadow, a soft diffuse shadow, or a colored glow?
   - **Icons:** Look for icons (arrows, bells, user avatars). You MUST include them using FontAwesome.

2. **1:1 Replication Protocol:**
   - If the user provides a screenshot, the output MUST look exactly like it. 
   - Do not simplify complex layouts. 
   - Do not ignore small details like icons inside inputs, badges on avatars, or subtle borders.

3. **Enhancement Protocol (For Sketches/Low-Res):**
   - If the image is clearly a rough sketch or low quality, UPGRADE it to "Tier 1 Design":
   - **Typography:** Use 'Inter', system-ui, or careful serif pairings.
   - **Spacing:** Use generous breathing room (padding: 2rem+).
   - **Surfaces:** Use glassmorphism (backdrop-filter: blur(12px)), delicate borders (1px solid rgba(255,255,255,0.1)), and rich gradients.
   - **Interactions:** Add hover states (transform: translateY(-2px)), active states, and focus rings.

DESIGN STANDARDS (THE "BEST ONE" GUARANTEE):
1. **Visuals:** Use "Inter" or system fonts. Use generous whitespace. Use accessible contrast.
2. **Colors:** Default to high-end palettes (Slate/Zinc for dark mode, Indigo/Violet for accents). Avoid default HTML colors.
3. **Glassmorphism:** Use \`background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);\` for modern cards.
4. **Shadows:** Use \`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);\`.
5. **Responsive:** ALL layouts must use Flexbox or CSS Grid and work perfectly on mobile.
6. **Animations:**
   - Fade in elements: \`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }\`
   - Apply \`animation: fadeIn 0.5s ease-out forwards;\` to main containers.
7. **Micro-Interactions:** 
   - Buttons: \`transition: all 0.2s;\` Hover: \`transform: translateY(-1px); box-shadow: ...\`.
   - Inputs: Focus rings must be visible and aesthetically pleasing.

CODE QUALITY STANDARDS:
1. **HTML:** 
   - Semantic tags (<header>, <main>, <section>, <article>). Meta viewport tag is MANDATORY. 
   - **Libraries:** ALWAYS include FontAwesome: \`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\`.
   - **Fonts:** ALWAYS include Inter: \`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">\`.
   - Use <button type="button"> for UI triggers.
   - Use <label> for inputs.
   - Use specific Unsplash IDs or Placehold.co for images.
2. **CSS:** 
   - Use :root variables for colors/fonts. 
   - \`* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }\`
   - \`img { max-width: 100%; height: auto; display: block; }\` (CRITICAL for layout stability)
   - Use Flexbox/Grid for layout (NO floats, NO absolute positioning for main layout).
   - Use \`gap\` property for spacing between flex/grid items instead of margins where possible.
3. **JS:** Write defensive code. Check if elements exist before adding event listeners.
   - Use const/let.
   - Separate logic into functions.

BEHAVIOR:
- If the user gives a vague prompt, make the BEST, most modern version possible.
- If the user provides an image, match it PIXEL-BY-PIXEL.
- Do not complain about complexity. Just build it.
- **SELF-CORRECTION:** Before outputting, check: "Did I close all divs? Did I set flex-wrap on containers that might overflow? Did I set max-width on images? Did I ruin the desktop view with my mobile changes?"

Output Format Example:

__FILE: index.html__
<!DOCTYPE html>...

__FILE: styles.css__
:root {...

__FILE: script.js__
document.addEventListener...
`;

export const AVAILABLE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Standard)' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini 2.5 Flash-Lite (Fast)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Reasoning)' },
];

export const getAvailableModels = async (): Promise<{value: string, label: string}[]> => {
    // Simulate network delay for realistic "fetching" feel
    await new Promise(resolve => setTimeout(resolve, 300));
    return AVAILABLE_MODELS;
};

export const resetChat = () => {
  currentChatSession = null;
  currentModel = null;
};

// Helper to convert internal Message to Gemini SDK Content
const mapMessageToContent = (msg: Message): Content => {
  const parts: Part[] = [{ text: msg.content }];
  if (msg.attachments && msg.attachments.length > 0) {
    msg.attachments.forEach(att => {
      // Basic check to ensure valid base64
      const base64Data = att.content.includes('base64,') 
        ? att.content.split('base64,')[1] 
        : att.content;
        
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: base64Data
        }
      });
    });
  }
  return {
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: parts
  };
};

export const sendMessageToGemini = async (
  message: string,
  attachments: Attachment[] = [],
  history: Message[] = [],
  onChunk: (text: string) => void,
  systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION,
  isThinking: boolean = false,
  runSettings?: RunSettings,
  abortSignal?: AbortSignal
): Promise<string> => {
  
  // 1. Determine the appropriate model
  // Use user selected model, default to 2.5 Flash if missing
  const targetModel = runSettings?.model || 'gemini-2.5-flash';
  
  // 2. Configure the chat session
  // We recreate the session if the model changes or if it's null
  if (!currentChatSession || currentModel !== targetModel) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing. Please ensure GEMINI_API_KEY is set in your Netlify environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Convert history to SDK format
    const sdkHistory = history.map(mapMessageToContent);

    const config: any = {
      systemInstruction: systemInstruction,
      temperature: runSettings?.temperature ?? 0.7,
      topP: runSettings?.topP,
      topK: runSettings?.topK,
      maxOutputTokens: runSettings?.maxOutputTokens,
    };

    // Apply Thinking Config if enabled (Required for Thinking Mode)
    if (isThinking && (targetModel.includes('pro') || targetModel.includes('flash') || targetModel.includes('lite'))) {
      const isPro = targetModel.includes('pro');
      // Pro max budget 32768, Flash max budget 24576
      const budget = isPro ? 32768 : 24576;

      config.thinkingConfig = { thinkingBudget: budget };
      // IMPORTANT: When thinking is enabled, maxOutputTokens should generally be unset 
      // or set very carefully to allow space for the response after thinking.
      // The SDK recommendation is to usually avoid setting it if not required.
      delete config.maxOutputTokens; 
    }

    currentChatSession = ai.chats.create({
      model: targetModel,
      config: config,
      history: sdkHistory
    });
    
    currentModel = targetModel;
  }

  let fullResponse = "";

  try {
    // 3. Prepare the current message content
    const parts: Part[] = [];
    if (message) parts.push({ text: message });
    
    attachments.forEach(att => {
      const base64Data = att.content.includes('base64,') 
        ? att.content.split('base64,')[1] 
        : att.content;
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: base64Data
        }
      });
    });

    // 4. Send the message
    const result = await currentChatSession.sendMessageStream({ 
      message: parts 
    });
    
    for await (const chunk of result) {
      if (abortSignal?.aborted) {
        break;
      }
      const text = (chunk as GenerateContentResponse).text;
      if (text) {
        fullResponse += text;
        onChunk(fullResponse);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }

  return fullResponse;
};

export const parseGeneratedFiles = (response: string): FileMap => {
  const files: FileMap = {};
  const regex = /__FILE: ([\w\.-]+)__\s*([\s\S]*?)(?=(?:__FILE:|$))/g;
  let match;

  while ((match = regex.exec(response)) !== null) {
    const filename = match[1].trim();
    const content = match[2].trim();
    files[filename] = content;
  }

  return files;
};