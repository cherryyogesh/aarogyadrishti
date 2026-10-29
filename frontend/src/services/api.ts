import {
  User, Patient, Screening, Appointment, DoctorQueueItem,
  ConsultationSession, ChatMessage, DistrictAnalytics, AuditEvent,
  ConfigStatus, ImageUploadResponse, Investigation, NavigationTask, ReferralSlip,
  StaffMember, EmployeeRegisterPayload,
  MytraAnalysisRequest, MytraAnalysisResponse, ClinicianReviewAmendPayload
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

  async registerEmployee(payload: EmployeeRegisterPayload): Promise<User> {
    const res = await this.request<{ access_token: string; role: string; full_name: string; username: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.access_token);
    return this.getMe();
  }

  async getStaffRoster(role?: string, mandal?: string): Promise<StaffMember[]> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (mandal) params.append('mandal', mandal);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<StaffMember[]>(`/auth/staff-roster${query}`);
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
    habitation?: string;
    gram_panchayat?: string;
    mandal?: string;
    district?: string;
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

  // --- Biopsy & Pathology Investigations ---
  async listInvestigations(params?: { patient_id?: number; state?: string }): Promise<Investigation[]> {
    let url = '/investigations?';
    if (params?.patient_id) url += `patient_id=${params.patient_id}&`;
    if (params?.state) url += `state=${params.state}&`;
    return this.request<Investigation[]>(url);
  }

  async createInvestigation(payload: {
    patient_id: number;
    screening_id?: number;
    appointment_id?: number;
    kind?: string;
    biopsy_site?: string;
    state?: string;
    pathology_finding?: string;
    diagnosis_category?: string;
    histopathology_summary?: string;
  }): Promise<Investigation> {
    return this.request<Investigation>('/investigations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateInvestigation(id: number, payload: {
    state: string;
    pathology_finding?: string;
    diagnosis_category?: string;
    histopathology_summary?: string;
  }): Promise<Investigation> {
    return this.request<Investigation>(`/investigations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // --- Tribal Patient Navigation ---
  async listNavigationTasks(params?: { status?: string; mandal?: string }): Promise<NavigationTask[]> {
    let url = '/navigation?';
    if (params?.status) url += `status_filter=${params.status}&`;
    if (params?.mandal) url += `mandal_filter=${params.mandal}&`;
    return this.request<NavigationTask[]>(url);
  }

  async createNavigationTask(payload: {
    patient_id: number;
    task_type?: string;
    due_date?: string;
    notes?: string;
  }): Promise<NavigationTask> {
    return this.request<NavigationTask>('/navigation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateNavigationTask(id: number, payload: {
    status: string;
    contact_attempts_count?: number;
    transport_support_arranged?: boolean;
    feeder_ambulance_notified?: boolean;
    missed_visit_reason?: string;
    notes?: string;
  }): Promise<NavigationTask> {
    return this.request<NavigationTask>(`/navigation/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async recordAIFollowupCall(id: number, payload: {
    duration_suffering_days: number;
    severity_stage: string;
    ai_call_transcript: string;
    mouth_opening_difficulty?: boolean;
    habit_status?: string;
    whatsapp_photos_requested?: boolean;
    whatsapp_photo_url?: string;
  }): Promise<NavigationTask> {
    return this.request<NavigationTask>(`/navigation/${id}/ai-call`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async recordWhatsAppPhoto(id: number, photoUrl: string): Promise<NavigationTask> {
    return this.request<NavigationTask>(`/navigation/${id}/whatsapp-photo?whatsapp_photo_url=${encodeURIComponent(photoUrl)}`, {
      method: 'POST',
    });
  }

  async doctorReviewLead(id: number, payload: {
    doctor_review_notes: string;
    clinical_decision: string;
  }): Promise<NavigationTask> {
    return this.request<NavigationTask>(`/navigation/${id}/doctor-review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPrintableLeadSummary(id: number): Promise<any> {
    return this.request<any>(`/navigation/${id}/printable-summary`);
  }


  // --- Hospital Referrals & Referral Slips ---
  async listReferrals(patient_id?: number): Promise<ReferralSlip[]> {
    const url = patient_id ? `/referrals?patient_id=${patient_id}` : '/referrals';
    return this.request<ReferralSlip[]>(url);
  }

  async createReferral(params: {
    patient_id: number;
    specialty_needed?: string;
    target_hospital?: string;
    urgency?: string;
    reason_for_referral?: string;
    clinical_notes?: string;
    scheduled_appointment_date?: string;
  }): Promise<ReferralSlip> {
    const query = new URLSearchParams({
      patient_id: String(params.patient_id),
      specialty_needed: params.specialty_needed || 'Head & Neck Surgical Oncology',
      target_hospital: params.target_hospital || 'District Hospital Paderu / KGH Visakhapatnam',
      urgency: params.urgency || 'priority',
      reason_for_referral: params.reason_for_referral || 'Suspected Oral Potentially Malignant Disorder (Leukoplakia / OSMF) requiring biopsy',
      clinical_notes: params.clinical_notes || '',
      scheduled_appointment_date: params.scheduled_appointment_date || '',
    });
    return this.request<ReferralSlip>(`/referrals?${query.toString()}`, {
      method: 'POST',
    });
  }

  async confirmReferralAttendance(id: number, attendance_confirmed = true): Promise<ReferralSlip> {
    return this.request<ReferralSlip>(`/referrals/${id}/attendance?attendance_confirmed=${attendance_confirmed}`, {
      method: 'PATCH',
    });
  }

  // --- Aarogya Mytra AI (Google MedGemma 1.5 4B & Evidence RAG) ---
  async analyzeMedicalImage(payload: MytraAnalysisRequest): Promise<MytraAnalysisResponse> {
    return this.request<MytraAnalysisResponse>('/mytra-ai/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMytraAssessment(assessmentId: string): Promise<MytraAnalysisResponse> {
    return this.request<MytraAnalysisResponse>(`/mytra-ai/assessments/${assessmentId}`);
  }

  async getScreeningMytraAssessment(screeningId: number): Promise<MytraAnalysisResponse | null> {
    return this.request<MytraAnalysisResponse | null>(`/screenings/${screeningId}/mytra-assessment`);
  }

  async reviewMytraAssessment(assessmentId: string, payload: ClinicianReviewAmendPayload): Promise<any> {
    return this.request<any>(`/mytra-ai/assessments/${assessmentId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMytraHealth(): Promise<any> {
    return this.request<any>('/mytra-ai/health');
  }

  async getGoogleHealthRepoStatus(): Promise<any> {
    return this.request<any>('/mytra-ai/google-health-repo');
  }

  async getMytraScopeRegistry(): Promise<any> {
    return this.request<any>('/mytra-ai/scope-registry');
  }

  async queryMytraReferences(query: string, bodyRegion = '', symptoms = ''): Promise<any> {
    const q = new URLSearchParams({ query, body_region: bodyRegion, symptoms });
    return this.request<any>(`/mytra-ai/references?${q.toString()}`);
  }
}

export const api = new ApiService();
