from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class MedicalVisionProvider(ABC):
    """
    Abstract Model Provider Interface for multimodal medical image and text analysis.
    Decouples model-specific preprocessing, inference, and response parsing
    from core clinical and business logic.
    """

    @abstractmethod
    async def analyze_image(
        self,
        image_bytes: bytes,
        body_region: str,
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze an uploaded medical photograph.
        Asks the model for observable features, uncertainty, and limitations
        rather than demanding a definitive disease label.

        Returns a structured dictionary matching the observation schema.
        """
        pass

    @abstractmethod
    async def explain_observations(
        self,
        observations: List[str],
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Produce evidence-grounded preliminary explanations from validated visible observations
        and patient context.
        """
        pass

    @abstractmethod
    async def check_provider_health(self) -> Dict[str, Any]:
        """
        Check health, connectivity, latency, and operational readiness of the inference provider.
        """
        pass

    @abstractmethod
    def get_model_metadata(self) -> Dict[str, Any]:
        """
        Return model identifier, version, license, deployment mode, and clinical validation scope.
        """
        pass

