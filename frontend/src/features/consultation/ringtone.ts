// Real-time Audio Synthesizer for Aarogya Drishti Tele-Consultation
// Uses Web Audio API (zero external audio file dependencies, 100% reliable)

class RingtoneManager {
  private audioCtx: AudioContext | null = null;
  private isRinging: boolean = false;
  private timerId: any = null;
  private activeNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Starts realistic incoming phone ringtone (Dual Tone 440Hz + 480Hz).
   * Standard telephony cadence: 2 seconds ON, 3 seconds OFF loop.
   */
  startIncomingRingtone(): () => void {
    this.stopAll();
    this.isRinging = true;

    const playBurst = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Standard telephony dual frequencies
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // 440 Hz

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now); // 480 Hz

        // Envelope: 2s on with smooth fade in & out
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.18, now + 0.08);
        gainNode.gain.setValueAtTime(0.18, now + 1.9);
        gainNode.gain.linearRampToValueAtTime(0, now + 2.0);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.05);
        osc2.stop(now + 2.05);

        this.activeNodes = { osc1, osc2, gain: gainNode };
      } catch (err) {
        console.warn('Audio ringtone playback blocked or unavailable:', err);
      }

      // 2s ring + 3s silence = 5s total cadence
      if (this.isRinging) {
        this.timerId = setTimeout(playBurst, 5000);
      }
    };

    playBurst();
    return () => this.stopAll();
  }

  /**
   * Starts soft outgoing calling tone (cadence for PHC staff while waiting).
   */
  startOutgoingCallingTone(): () => void {
    this.stopAll();
    this.isRinging = true;

    const playBeep = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 0.95);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.05);
      } catch (e) {}

      if (this.isRinging) {
        this.timerId = setTimeout(playBeep, 3500);
      }
    };

    playBeep();
    return () => this.stopAll();
  }

  playConnectedChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
  }

  playEndChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.35);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {}
  }

  stopAll(): void {
    this.isRinging = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.activeNodes) {
      try {
        this.activeNodes.gain.gain.setValueAtTime(0, 0);
        this.activeNodes.osc1.stop();
        this.activeNodes.osc2.stop();
      } catch (e) {}
      this.activeNodes = null;
    }
  }
}

export const ringtone = new RingtoneManager();
