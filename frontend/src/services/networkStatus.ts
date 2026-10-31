// Network connectivity tracker for Aarogya Drishti
// Distinguishes online (AI active) vs offline (local clinical works active)

type NetworkListener = (isOnline: boolean) => void;

class NetworkStatusService {
  private online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<NetworkListener> = new Set();
  private pingInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Periodically probe server health when navigator claims to be online
      this.pingInterval = setInterval(() => {
        if (navigator.onLine) {
          this.checkServerPing();
        } else {
          this.setOnline(false);
        }
      }, 15000);
    }
  }

  private handleOnline = () => {
    this.checkServerPing();
  };

  private handleOffline = () => {
    this.setOnline(false);
  };

  private async checkServerPing() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/health', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);
      this.setOnline(res.ok);
    } catch {
      // If server or network unreachable, mark offline
      this.setOnline(false);
    }
  }

  private setOnline(status: boolean) {
    if (this.online !== status) {
      this.online = status;
      this.listeners.forEach((listener) => {
        try {
          listener(this.online);
        } catch (e) {
          console.error('Error in network listener:', e);
        }
      });
    }
  }

  public isOnline(): boolean {
    return this.online;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediate callback with current state
    listener(this.online);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async forceCheck(): Promise<boolean> {
    await this.checkServerPing();
    return this.online;
  }
}

export const networkStatus = new NetworkStatusService();
