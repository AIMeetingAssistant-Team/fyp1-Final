from transformers import pipeline
import logging
from typing import Dict, Any
import nltk

logger = logging.getLogger(__name__)

class SummarizationService:
    def __init__(self):
        self.summarizer = None
        self.model_name = "facebook/bart-large-cnn"
        
    def load_model(self):
        if self.summarizer is None:
            try:
                logger.info(f"Loading summarization model: {self.model_name}")
                self.summarizer = pipeline("summarization", model=self.model_name)
                logger.info("Summarization model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load model, using fallback: {e}")
                self.summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
    
    def generate_summary(self, text: str, meeting_type: str = "general") -> Dict[str, Any]:
        try:
            self.load_model()
            
            if not text or len(text.strip()) < 50:
                return {
                    "success": False,
                    "error": "Text too short for summarization",
                    "summary": "",
                    "minutes": {}
                }
            
            # Clean text
            import re
            text = re.sub(r'\s+', ' ', text)
            
            # Generate summary
            summary_result = self.summarizer(
                text[:2000],  # Limit to 2000 chars
                max_length=200,
                min_length=50,
                do_sample=False
            )
            
            summary = summary_result[0]['summary_text']
            
            # Generate simple minutes
            minutes = self.extract_minutes(text, summary, meeting_type)
            
            return {
                "success": True,
                "summary": summary.strip(),
                "minutes": minutes,
                "word_count_original": len(text.split()),
                "word_count_summary": len(summary.split())
            }
            
        except Exception as e:
            logger.error(f"Summarization error: {e}")
            return {
                "success": False,
                "error": str(e),
                "summary": "",
                "minutes": {}
            }
    
    def extract_minutes(self, text: str, summary: str, meeting_type: str) -> Dict[str, Any]:
        """Extract simple meeting minutes"""
        import re
        
        # Extract key points (sentences with action words)
        action_words = ['will', 'should', 'must', 'need to', 'decided', 'agreed']
        key_points = []
        
        sentences = text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if any(word in sentence.lower() for word in action_words) and len(sentence.split()) > 5:
                key_points.append(sentence[:100] + "...")
                if len(key_points) >= 5:
                    break
        
        # Extract decisions
        decisions = []
        decision_words = ['decided', 'agreed', 'approved', 'resolved']
        for sentence in sentences:
            if any(word in sentence.lower() for word in decision_words):
                decisions.append(sentence[:150])
                if len(decisions) >= 3:
                    break
        
        return {
            "meeting_type": meeting_type,
            "key_points": key_points,
            "decisions": decisions,
            "next_steps": self.extract_next_steps(text)
        }
    
    def extract_next_steps(self, text: str):
        """Extract next steps using regex"""
        import re
        patterns = [
            r'(?:next step|action item|todo|task)\s*:*\s*([^.!?]+[.!?])',
            r'(?:need to|will|should)\s+([^.!?]+[.!?])'
        ]
        
        next_steps = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            next_steps.extend(matches[:3])
        
        return list(set(next_steps))

# Singleton instance
summarization_service = SummarizationService()