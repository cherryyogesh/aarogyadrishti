import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import httpx
from app.core.config import settings

logger = logging.getLogger("sms_adapter")

class SMSAdapter:
    def __init__(self):
        self.provider = settings.SMS_PROVIDER.lower()
        self.twilio_account_sid = settings.TWILIO_ACCOUNT_SID
        self.twilio_auth_token = settings.TWILIO_AUTH_TOKEN
        self.twilio_from = settings.TWILIO_FROM_NUMBER
        self.dlt_api_key = settings.DLT_API_KEY
        self.dlt_sender_id = settings.DLT_SENDER_ID
        self.dlt_entity_id = settings.DLT_ENTITY_ID

    def is_real_provider_configured(self) -> bool:
        if self.provider == "twilio" and self.twilio_account_sid and self.twilio_auth_token:
            return True
        if self.provider == "dlt" and self.dlt_api_key:
            return True
        return False

    async def send_sms(self, phone: str, message: str, message_type: str = "general") -> Dict[str, Any]:
        """
        Sends SMS via configured provider (Twilio, DLT Gateway, or Synthetic Dev Mode).
        Returns delivery metadata including provider message id and delivery status.
        """
        clean_phone = phone.strip()

        # 1. Twilio Provider
        if self.provider == "twilio" and self.is_real_provider_configured():
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_account_sid}/Messages.json"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        url,
                        data={
                            "To": clean_phone,
                            "From": self.twilio_from,
                            "Body": message
                        },
                        auth=(self.twilio_account_sid, self.twilio_auth_token)
                    )
                    if resp.status_code in [200, 201]:
                        data = resp.json()
                        return {
                            "success": True,
                            "provider": "twilio",
                            "provider_message_id": data.get("sid", str(uuid.uuid4())),
                            "delivery_status": "sent",
                            "error": None
                        }
                    else:
                        logger.error(f"Twilio error: {resp.status_code} - {resp.text}")
                        return {
                            "success": False,
                            "provider": "twilio",
                            "provider_message_id": None,
                            "delivery_status": "failed",
                            "error": f"Twilio HTTP {resp.status_code}"
                        }
            except Exception as e:
                logger.error(f"Twilio connection exception: {e}")
                return {
                    "success": False,
                    "provider": "twilio",
                    "provider_message_id": None,
                    "delivery_status": "failed",
                    "error": str(e)
                }

        # 2. India DLT Gateway
        if self.provider == "dlt" and self.is_real_provider_configured():
            try:
                # Standard DLT compliant HTTP payload structure
                url = "https://api.sms-gateway.in/v2/send"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    payload = {
                        "api_key": self.dlt_api_key,
                        "sender": self.dlt_sender_id,
                        "entity_id": self.dlt_entity_id,
                        "to": clean_phone,
                        "message": message
                    }
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        return {
                            "success": True,
                            "provider": "dlt",
                            "provider_message_id": str(uuid.uuid4()),
                            "delivery_status": "sent",
                            "error": None
                        }
                    return {
                        "success": False,
                        "provider": "dlt",
                        "provider_message_id": None,
                        "delivery_status": "failed",
                        "error": f"DLT gateway status: {resp.status_code}"
                    }
            except Exception as e:
                return {
                    "success": False,
                    "provider": "dlt",
                    "provider_message_id": None,
                    "delivery_status": "failed",
                    "error": str(e)
                }

        # 3. Transparent Synthetic Development Mode
        # Clearly marked and logged with simulated gateway message ID
        simulated_msg_id = f"SYNTH-SMS-{uuid.uuid4().hex[:12].upper()}"
        logger.info(f"[SYNTHETIC SMS DEV MODE] To: {clean_phone} | Type: {message_type} | Content: {message}")

        return {
            "success": True,
            "provider": "synthetic_dev_mode",
            "provider_message_id": simulated_msg_id,
            "delivery_status": "delivered",
            "error": None,
            "is_synthetic": True
        }

sms_adapter = SMSAdapter()

# Standardized Approved Message Formats
def format_screening_sms(ref_id: str, patient_name: str = "రోగి") -> str:
    return (
        f"Aarogya Drishti: నమస్కారం {patient_name}, మీ నోటి స్క్రీనింగ్ & ఫొటోలు నమోదు చేయబడ్డాయి. "
        f"Ref ID: {ref_id}. PHC వైద్యాధికారి సమీక్షిస్తున్నారు. / "
        f"Your oral screening & photos (Ref: {ref_id}) have been securely recorded. PHC Medical Officer is reviewing."
    )

def format_appointment_sms(date_str: str, time_str: str, phc_name: str, arrival_time: str = "") -> str:
    early_notice = f" ({arrival_time} సమయానికి)" if arrival_time else ""
    return (
        f"Aarogya Drishti: నమస్కారం, మీ అపాయింట్‌మెంట్ {date_str} న {time_str} గంటలకు {phc_name} వద్ద నిర్ణయించబడింది. "
        f"దయచేసి 30 నిమిషాల ముందుగా{early_notice} చేరుకోండి. / "
        f"Your appointment is confirmed on {date_str} at {time_str} at {phc_name}. Please arrive 30 mins early ({arrival_time or 'early check-in'})."
    )

def format_otp_sms(otp_code: str) -> str:
    return (
        f"Aarogya Drishti: మీ PHC క్లినిక్ హాజరు ధృవీకరణ OTP: {otp_code}. "
        f"ఇది 5 నిమిషాలు మాత్రమే చెల్లుబాటు అవుతుంది. / "
        f"Your in-clinic arrival verification OTP is {otp_code}. Valid for 5 minutes."
    )

def format_reschedule_sms(date_str: str, time_str: str, phc_name: str, reason: str) -> str:
    return (
        f"Aarogya Drishti: మీ అపాయింట్‌మెంట్ {date_str} న {time_str} గంటలకు మార్చబడింది ({phc_name}). "
        f"కారణం: {reason}. దయచేసి 30 నిమిషాల ముందుగా చేరుకోండి."
    )

def format_cancellation_sms(phc_name: str, reason: str) -> str:
    return (
        f"Aarogya Drishti: {phc_name} వద్ద మీ అపాయింట్‌మెంట్ రద్దు చేయబడింది. "
        f"కారణం: {reason}. తదుపరి సహాయం కోసం PHCని సంప్రదించండి."
    )
