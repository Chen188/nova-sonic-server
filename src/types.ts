export interface InferenceConfig {
  readonly maxTokens: number;
  readonly topP: number;
  readonly temperature: number;
}


export type EndpointingSensitivity = "HIGH" | "MEDIUM" | "LOW";

export interface TurnDetectionConfiguration {
  readonly endpointingSensitivity: EndpointingSensitivity;
}

export type ContentType = "AUDIO" | "TEXT" | "TOOL";
export type AudioType = "SPEECH";
export type AudioMediaType = "audio/lpcm"
export type TextMediaType = "text/plain" | "application/json";

// Generation stage for text output (used in additionalModelFields)
export type GenerationStage = "SPECULATIVE" | "FINAL";

// Stop reasons for contentEnd events
export type StopReason = "PARTIAL_TURN" | "END_TURN" | "INTERRUPTED";

export interface AudioConfiguration {
  readonly audioType: AudioType;
  readonly mediaType: AudioMediaType;
  readonly sampleRateHertz: number;
  readonly sampleSizeBits: number;
  readonly channelCount: number;
  readonly encoding: string;
  readonly voiceId?: string;
}

export interface TextConfiguration {
  readonly mediaType: TextMediaType;
}

export interface ToolConfiguration {
  readonly toolUseId: string;
  readonly type: "TEXT";
  readonly textInputConfiguration: {
    readonly mediaType: "text/plain";
  };
}

export interface ContentEndEvent {
  readonly type?: ContentType;
  readonly stopReason?: StopReason;
}
