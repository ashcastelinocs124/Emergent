import { clarifications, residents } from './content';
import type { ResidentId } from './model';

export const residentLives: Record<ResidentId, { life: string; voice: string; workday: string; returnLine: string }> = {
  mara: {
    life: 'Owns Voss Auto. A motor has been apart on her bench all afternoon; she is trying to finish it before closing.',
    voice: 'Direct, warm only after trust is earned, and more interested in fixing things than sounding impressive.',
    workday: 'Long one. That motor on my bench keeps finding new ways to complain.',
    returnLine: 'Still that same motor. It is stubborn, but I am getting somewhere.',
  },
  eli: {
    life: 'Works courier rounds. The blocked main road has made his deliveries late, so he has learned the side streets.',
    voice: 'Quick, sociable, and candid about which stories he heard secondhand.',
    workday: 'Busy. The road closure turned a short run into a whole afternoon of deliveries.',
    returnLine: 'Still catching up on deliveries. At least the side streets are moving.',
  },
  sora: {
    life: 'Runs the open salvage yard. She spends her shift sorting scrap and keeping the gate clear for people who need parts.',
    voice: 'Watchful, practical, and sparing with words until she knows why someone is asking.',
    workday: 'Dusty. I have been sorting the yard since morning and I still have a pile to get through.',
    returnLine: 'Still sorting the yard. The useful pieces are always buried at the bottom.',
  },
  dev: {
    life: 'Maintains the transit depot. He checks signals and equipment even when traffic is thin.',
    voice: 'Patient, exact about engineering, and slightly tired of equipment that fails at inconvenient times.',
    workday: 'Long shift. The signals are behaving, but the depot still needs a second pair of hands.',
    returnLine: 'Still on shift. The signals have stayed steady so far.',
  },
};

const openers: Record<ResidentId, Record<string, string>> = {
  mara: { work: 'Mara looks up from a motor, wiping her hands on a rag.', walk: 'Mara slows at the workshop door and turns toward you.', watch: 'Mara watches the street, then notices your helmet.', rest: 'Mara straightens from the curb and gives you her attention.' },
  eli: { work: 'Eli checks the address on a delivery slip before looking up.', walk: 'Eli stops his courier round when you call out.', watch: 'Eli follows the traffic for a moment, then faces you.', rest: 'Eli moves his bag aside and looks up from the bench.' },
  sora: { work: 'Sora sets a piece of scrap down and studies your face.', walk: 'Sora pauses between the scrap rows and turns to you.', watch: 'Sora keeps one eye on the yard gate as you approach.', rest: 'Sora rises slowly, brushing dust from her sleeves.' },
  dev: { work: 'Dev finishes a signal check before giving you his attention.', walk: 'Dev stops at the platform edge and turns toward you.', watch: 'Dev looks away from the traffic display to listen.', rest: 'Dev pockets a tool and looks up from the depot steps.' },
};

export function getResidentOpener(id: ResidentId, activity: string, metBefore: boolean): string {
  if (metBefore) return `${residents[id].name} recognizes you when you come back.`;
  return openers[id][activity] ?? `${residents[id].name} turns toward you.`;
}

export function getCasualReply(id: ResidentId, utterance: string, priorTurns: number): string {
  const words = utterance.toLowerCase();
  const life = residentLives[id];
  if (/\b(how are you|how is your day|how was your day|how has your day|how's your day|doing today)\b/.test(words)) return priorTurns > 0 ? life.returnLine : life.workday;
  if (/\b(your name|who are you)\b/.test(words)) return `I am ${residents[id].name}. I work here as the ${residents[id].role.toLowerCase()}.`;
  if (/^(hello|hi|hey|good morning|good evening)[.!? ]*$/.test(words.trim())) return priorTurns > 0 ? `You are back. What is on your mind?` : `Hello. You look new to this district. What is on your mind?`;
  return clarifications[id];
}
