import {
  User, Patient, Screening, Appointment, DoctorQueueItem,
  ConsultationSession, ChatMessage, DistrictAnalytics, AuditEvent,
  ConfigStatus, ImageUploadResponse
} from '../types';

const API_BASE = '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('ad_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ad_auth_token', token);
    } else {
      localStorage.removeItem('ad_auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errDetail = 'Request failed';
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
      } catch (e) {
        errDetail = `HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(errDetail);
    }

    return res.json() as Promise<T>;
  }

  // --- Auth ---
  async login(username_or_email: string, password: string): Promise<{ access_token: string; role: string; full_name: string; username: string }> {
    const res = await this.request<{ access_token: string; role: string; full_name: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // --- Patients ---
  async searchPatients(q: string = ''): Promise<Patient[]> {
    return this.request<Patient[]>(`/patients/search?q=${encodeURIComponent(q)}`);
  }

  async registerPatient(payload: {
    full_name: string;
    age: number;
    gender: string;
    phone: string;
    preferred_language: string;
    address?: string;
    village_town?: string;
    phc_id: number;
    consent_granted?: boolean;
    consent_notes?: string;
  }): Promise<Patient> {
    return this.request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPatientDetail(id: number): Promise<any> {
    return this.request<any>(`/patients/${id}`);
  }

  // --- Images ---
  async uploadImage(file: File): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<ImageUploadResponse>('/images/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async enhanceImage(id: number): Promise<{ success: boolean; enhanced_url: string; method: string }> {
    return this.request<{ success: boolean; enhanced_url: string; method: string }>(`/images/${id}/enhance`, {
      method: 'POST',
    });
  }

  // --- Screenings ---
  async createScreening(payload: {
    patient_id: number;
    phc_id: number;
    category: string;
    symptoms: string;
    duration_days: number;
    severity: string;
    image_id?: number | null;
  }): Promise<Screening> {
    return this.request<Screening>('/screenings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listScreenings(phc_id?: number, status?: string): Promise<Screening[]> {
    let url = '/screenings?';
    if (phc_id) url += `phc_id=${phc_id}&`;
    if (status) url += `status=${status}&`;
    return this.request<Screening[]>(url);
  }

  async getScreeningDetail(id: number): Promise<Screening> {
    return this.request<Screening>(`/screenings/${id}`);
  }

  // --- PHC Review ---
  async getPhcCases(statusFilter?: string): Promise<Screening[]> {
    const url = statusFilter ? `/phc/cases?status_filter=${statusFilter}` : '/phc/cases';
    return this.request<Screening[]>(url);
  }

  async recordCaseReview(id: number, payload: {
    review_decision: string;
    clinical_notes: string;
    action_plan?: string;
  }): Promise<any> {
    return this.request<any>(`/phc/cases/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Appointments ---
  async createAppointment(payload: {
    patient_id: number;
    phc_id: number;
    doctor_id?: number | null;
    screening_id?: number | null;
    scheduled_date: string;
    scheduled_time: string;
    appointment_type?: string;
  }): Promise<Appointment> {
    return this.request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listAppointments(params?: { date?: string; status?: string }): Promise<Appointment[]> {
    let url = '/appointments?';
    if (params?.date) url += `date=${params.date}&`;
    if (params?.status) url += `status=${params.status}&`;
    return this.request<Appointment[]>(url);
  }

  async rescheduleAppointment(id: number, payload: { new_date: string; new_time: string; reason: string }): Promise<Appointment> {
    return this.request<Appointment>(`/appointments/${id}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async cancelAppointment(id: number, reason: string): Promise<Appointment> {
    return this.request<Appointment>(`/appointments/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // --- OTP Check-in ---
  async requestOtp(patient_id_display: string, appointment_id?: number): Promise<{
    success: boolean;
    message: string;
    appointment_id: number;
    patient_name: string;
    masked_phone: string;
    resend_cooldown_seconds: number;
    expires_in_minutes: number;
    dev_otp_preview?: string;
  }> {
    return this.request<any>('/otp/request', {
      method: 'POST',
      body: JSON.stringify({ patient_id_display, appointment_id }),
    });
  }

  async verifyOtp(appointment_id: number, otp_code: string): Promise<{
    success: boolean;
    message: string;
    appointment_id: number;
    status: string;
    checkin_time: string;
  }> {
    return this.request<any>('/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ appointment_id, otp_code }),
    });
  }

  // --- Doctor Queue & Consultation ---
  async getDoctorQueue(): Promise<DoctorQueueItem[]> {
    return this.request<DoctorQueueItem[]>('/doctor/waiting-queue');
  }

  async acceptPatientCase(appointment_id: number): Promise<ConsultationSession> {
    return this.request<ConsultationSession>(`/doctor/accept/${appointment_id}`, {
      method: 'POST',
    });
  }

  async completeConsultation(appointment_id: number, payload: {
    clinical_findings: string;
    prescription_notes?: string;
    follow_up_instructions?: string;
    referral_needed: boolean;
    referral_specialty?: string;
    target_hospital?: string;
    referral_urgency?: string;
  }): Promise<any> {
    return this.request<any>(`/consultations/${appointment_id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Chatbot ---
  async sendChatMessage(payload: {
    session_id: string;
    message: string;
    language?: string;
    attachment_image_id?: number | null;
  }): Promise<ChatMessage> {
    return this.request<ChatMessage>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat/history/${sessionId}`);
  }

  // --- Reports & Audit ---
  async getDistrictAnalytics(): Promise<DistrictAnalytics> {
    return this.request<DistrictAnalytics>('/reports/district-analytics');
  }

  async getAuditEvents(): Promise<AuditEvent[]> {
    return this.request<AuditEvent[]>('/audit/events');
  }

  async getConfigStatus(): Promise<ConfigStatus> {
    return this.request<ConfigStatus>('/config/status');
  }
}

export const api = new ApiService();
