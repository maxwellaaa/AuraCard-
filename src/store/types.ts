export type TemplateId = "A" | "B" | "C" | "D" | "E" | "G" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "Q" | "R";

export type TemplateConfig = {
  id: TemplateId;
  name: string;
  defaultBackground: string;
  defaultText: string;
  defaultAccent: string;
  defaultRadius: number;
  defaultPadding: number;
  alignment: "left" | "center";
  border: boolean;
  shadow: boolean;
  backgroundMode: "solid" | "gradient" | "notepad" | "stickyBlue" | "wishPaper" | "mistLilac" | "stackBlue" | "darkGrid" | "neonDark" | "ticketNote" | "lilacHang" | "mintMood" | "warmPink" | "glassmorphism";
};

export type AspectId = "3:4" | "1:1" | "5:7" | "9:16";
export type AspectPreset = {
  id: AspectId;
  label: string;
  w: number;
  h: number;
};

export type ExportResolutionId = "x2" | "hd" | "hq" | "2k" | "4k";
export type ExportResolutionPreset = {
  id: ExportResolutionId;
  label: string;
  hint: string;
  /** 相对画布倍数；与 targetWidth 二选一 */
  pixelRatio?: number;
  /** 按当前比例换算导出宽度（px），适合小红书/IG 等竖图 */
  targetWidth?: number;
};

export type BgTab = "solid" | "gradient" | "image";

export type ChatRole = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type AiProviderId = "openrouter" | "openai" | "deepseek" | "qwen" | "custom";
export type AiModelKind = "text" | "vision" | "image";
export type AiModelOption = { value: string; label: string; kind: AiModelKind };
export type AiProviderOption = {
  id: AiProviderId;
  name: string;
  description: string;
  baseUrl: string;
  apiKeyPlaceholder: string;
  models: AiModelOption[];
};

export type CardTextStyle = {
  fontSizePx?: number;
  titleAlign?: "left" | "center" | "right" | "justify";
  contentAlign?: "left" | "center" | "right";
  textColor?: string;
};

export type CardSection = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  /** 单卡文字样式；缺省时回退到全局设置 */
  style?: CardTextStyle;
};
