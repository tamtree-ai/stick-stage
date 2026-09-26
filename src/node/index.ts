/**
 * `stickstage/node`: Node-side orchestration. Workspace (asset resolution), adapters (ffmpeg,
 * WAV probe, Rhubarb, whisper.cpp), the prepare step, project compile/check helpers and the
 * Remotion render backend. No side effects on import.
 */
export * from "./workspace";
export * from "./adapters";
export * from "./audio";
export * from "./prep";
export * from "./project";
export * from "./render";
