export type ClientMessage = {
   type: string; // e.g. "audio", "control"
   payload?: any;
};
