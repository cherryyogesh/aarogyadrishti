// Offline Storage and Sync Engine for Aarogya Drishti
// Enables Community Health Workers (ASHA) to register patients and log oral screenings offline.

import { Patient, Screening } from '../types';

export interface OfflinePatientPayload {
  full_name: string;
  age: number;
  gender: string;
  phone: string;
  preferred_language: string;
  address?: string;
  village_town?: string;
  habitation?: string;
  gram_panchayat?: string;
  mandal?: string;
  district?: string;
  phc_id: number;
  consent_granted?: boolean;
  consent_notes?: string;
}

export interface OfflineScreeningPayload {
  patient_id: number;
  phc_id: number;
  category?: string;
  oral_site?: string;
  lesion_type?: string;
  mouth_opening_mm?: number | null;
  pain_score?: number;
  bleeding?: boolean;
  burning_sensation?: boolean;
  symptoms: string;
  duration_days: number;
  severity: string;
  image_data_url?: string | null;
  image_name?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'CREATE_PATIENT' | 'CREATE_SCREENING';
  data: any;
  createdAt: string;
  attempts: number;
  error?: string;
}

const STORAGE_KEYS = {
  CACHED_PATIENTS: 'ad_cached_patients',
  OFFLINE_PATIENTS: 'ad_offline_patients',
  CACHED_SCREENINGS: 'ad_cached_screenings',
  OFFLINE_SCREENINGS: 'ad_offline_screenings',
  SYNC_QUEUE: 'ad_sync_queue',
  LAST_SYNC: 'ad_last_sync_time'
};

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

class OfflineStorageService {
  // --- Cached Patients ---
  public cachePatients(patients: Patient[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_PATIENTS, JSON.stringify(patients));
    } catch (e) {
      console.warn('Failed to cache patients to localStorage:', e);
    }
  }

  public getCachedPatients(): Patient[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CACHED_PATIENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // --- Offline Patients (created locally while offline) ---
  public getOfflinePatients(): Patient[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_PATIENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveOfflinePatient(payload: OfflinePatientPayload): Patient {
    const offlineId = -Math.floor(Date.now() + Math.random() * 1000);
    const newPatient: Patient = {
      id: offlineId,
      full_name: payload.full_name,
      age: payload.age,
      gender: payload.gender,
      phone: payload.phone,
      preferred_language: payload.preferred_language,
      habitation: payload.habitation || payload.village_town || '',
      gram_panchayat: payload.gram_panchayat || '',
      mandal: payload.mandal || 'Paderu',
      district: payload.district || 'Alluri Sitharama Raju',
      address: payload.address || '',
      phc_id: payload.phc_id,
      created_at: new Date().toISOString()
    };

    // Store in offline patients list
    const offlineList = this.getOfflinePatients();
    offlineList.unshift(newPatient);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_PATIENTS, JSON.stringify(offlineList));
    } catch (e) {
      console.error('Error saving offline patient:', e);
    }

    // Add to sync queue
    this.addToSyncQueue({
      id: `queue-pat-${Date.now()}`,
      type: 'CREATE_PATIENT',
      data: { ...payload, temp_id: offlineId },
      createdAt: new Date().toISOString(),
      attempts: 0
    });

    return newPatient;
  }

  // Merged Patients: Cache + Offline Pending
  public getAllPatients(searchQuery: string = ''): Patient[] {
    const cached = this.getCachedPatients();
    const offline = this.getOfflinePatients();
    // Offline patients on top
    const combined = [...offline, ...cached];

    if (!searchQuery.trim()) {
      return combined;
    }

    const q = searchQuery.toLowerCase().trim();
    return combined.filter(
      p =>
        p.full_name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.mandal && p.mandal.toLowerCase().includes(q)) ||
        (p.habitation && p.habitation.toLowerCase().includes(q))
    );
  }

  // --- Cached Screenings ---
  public cacheScreenings(screenings: Screening[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_SCREENINGS, JSON.stringify(screenings));
    } catch (e) {
      console.warn('Failed to cache screenings to localStorage:', e);
    }
  }

  public getCachedScreenings(): Screening[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CACHED_SCREENINGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // --- Offline Screenings (created locally while offline) ---
  public getOfflineScreenings(): Screening[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_SCREENINGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveOfflineScreening(payload: OfflineScreeningPayload, patientName: string = 'Patient'): Screening {
    const offlineId = -Math.floor(Date.now() + Math.random() * 1000);
    const shortRef = Date.now().toString().slice(-5);
    const reference_id = `SCR-OFFLINE-${shortRef}`;

    const newScreening: Screening = {
      id: offlineId,
      reference_id,
      patient_id: payload.patient_id,
      patient_name: patientName,
      phc_id: payload.phc_id,
      category: payload.category || 'mouth',
      oral_site: payload.oral_site || 'buccal_mucosa',
      lesion_type: payload.lesion_type || 'leukoplakia',
      symptoms: payload.symptoms,
      duration_days: payload.duration_days,
      mouth_opening_mm: payload.mouth_opening_mm || 35,
      pain_score: payload.pain_score || 0,
      bleeding: payload.bleeding || false,
      burning_sensation: payload.burning_sensation ?? true,
      severity: payload.severity || 'moderate',
      status: 'under_phc_review',
      created_at: new Date().toISOString(),
      images: payload.image_data_url
        ? [{
            id: offlineId,
            stored_path: payload.image_data_url,
            original_filename: payload.image_name || 'offline_photo.jpg',
            processing_results: null
          }]
        : []
    };

    const offlineList = this.getOfflineScreenings();
    offlineList.unshift(newScreening);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_SCREENINGS, JSON.stringify(offlineList));
    } catch (e) {
      console.error('Error saving offline screening:', e);
    }

    // Add to sync queue
    this.addToSyncQueue({
      id: `queue-scr-${Date.now()}`,
      type: 'CREATE_SCREENING',
      data: { ...payload, temp_id: offlineId, temp_patient_id: payload.patient_id },
      createdAt: new Date().toISOString(),
      attempts: 0
    });

    return newScreening;
  }

  // Merged Screenings: Cache + Offline Pending
  public getAllScreenings(): Screening[] {
    const cached = this.getCachedScreenings();
    const offline = this.getOfflineScreenings();
    return [...offline, ...cached];
  }

  // --- Sync Queue Management ---
  public getSyncQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveSyncQueue(queue: SyncQueueItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save sync queue:', e);
    }
  }

  public addToSyncQueue(item: SyncQueueItem): void {
    const queue = this.getSyncQueue();
    queue.push(item);
    this.saveSyncQueue(queue);
    this.notifyQueueChanged();
  }

  public getPendingCount(): number {
    return this.getSyncQueue().length;
  }

  public getLastSyncTime(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || 'Never';
  }

  public setLastSyncTime(timeStr: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timeStr);
  }

  private notifyQueueChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aarogya-sync-queue-updated', {
        detail: { count: this.getPendingCount() }
      }));
    }
  }

  // --- Online Sync Engine ---
  public async syncPendingQueue(apiInstance: any): Promise<{ synced: number; failed: number }> {
    const queue = this.getSyncQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: SyncQueueItem[] = [];
    const patientIdMap: Record<number, number> = {}; // maps temp offline patient IDs to real server IDs

    // 1. Process Patient Registrations first
    for (const item of queue) {
      if (item.type === 'CREATE_PATIENT') {
        try {
          const { temp_id, ...payload } = item.data;
          const serverPatient = await apiInstance.registerPatient(payload);
          if (temp_id) {
            patientIdMap[temp_id] = serverPatient.id;
            // Remove from offline patients list
            const offlinePatients = this.getOfflinePatients().filter(p => p.id !== temp_id);
            localStorage.setItem(STORAGE_KEYS.OFFLINE_PATIENTS, JSON.stringify(offlinePatients));
          }
          syncedCount++;
        } catch (err: any) {
          console.error('Failed to sync offline patient:', err);
          item.attempts++;
          item.error = err.message;
          remainingQueue.push(item);
          failedCount++;
        }
      }
    }

    // 2. Process Screenings
    for (const item of queue) {
      if (item.type === 'CREATE_SCREENING') {
        try {
          const { temp_id, temp_patient_id, image_data_url, image_name, ...payload } = item.data;
          let realPatientId = payload.patient_id;
          if (temp_patient_id && patientIdMap[temp_patient_id]) {
            realPatientId = patientIdMap[temp_patient_id];
          }

          let imageId: number | null = null;
          if (image_data_url) {
            try {
              const file = dataURLtoFile(image_data_url, image_name || 'screening_photo.jpg');
              const uploadRes = await apiInstance.uploadImage(file);
              imageId = uploadRes.image_id;
            } catch (imgErr) {
              console.warn('Image upload error during sync, proceeding without image:', imgErr);
            }
          }

          // Call API to create screening on server (triggers Online AI pipeline)
          await apiInstance.createScreening({
            ...payload,
            patient_id: realPatientId,
            image_id: imageId
          });

          // Remove from offline screenings list
          if (temp_id) {
            const offlineScrs = this.getOfflineScreenings().filter(s => s.id !== temp_id);
            localStorage.setItem(STORAGE_KEYS.OFFLINE_SCREENINGS, JSON.stringify(offlineScrs));
          }
          syncedCount++;
        } catch (err: any) {
          console.error('Failed to sync offline screening:', err);
          item.attempts++;
          item.error = err.message;
          remainingQueue.push(item);
          failedCount++;
        }
      }
    }

    this.saveSyncQueue(remainingQueue);
    this.notifyQueueChanged();

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.setLastSyncTime(formattedTime);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aarogya-sync-complete', {
        detail: { synced: syncedCount, remaining: remainingQueue.length }
      }));
    }

    return { synced: syncedCount, failed: failedCount };
  }
}

export const offlineStorage = new OfflineStorageService();

