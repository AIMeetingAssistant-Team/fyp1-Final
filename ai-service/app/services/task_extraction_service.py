import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class TaskExtractionService:
    """Simple task extraction using regex patterns"""
    
    def extract_tasks_from_text(self, text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        try:
            # Pattern 1: Action items
            patterns = [
                r'(?:Action item|Task|Todo):?\s*(.+?)(?=\n|\.|$)',
                r'(?:Need to|Will|Should|Must|Going to)\s+(.+?)(?=\n|\.|$)',
                r'(?:Please|Could you|Can you)\s+(.+?)(?=\n|\.|$)',
                r'([A-Z][^.!?]*\s+(?:prepare|create|send|share|review|update)[^.!?]*[.!?])'
            ]
            
            tasks = []
            all_matches = []
            
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
                all_matches.extend(matches)
            
            # Remove duplicates
            unique_matches = list(set(all_matches))
            
            for i, match in enumerate(unique_matches[:10]):  # Max 10 tasks
                task = self._parse_task_sentence(match.strip(), i)
                if task and task.get("title"):
                    tasks.append(task)
            
            return {
                "success": True,
                "tasks": tasks,
                "total_tasks": len(tasks),
                "message": f"Extracted {len(tasks)} tasks"
            }
            
        except Exception as e:
            logger.error(f"Task extraction error: {e}")
            return {
                "success": False,
                "error": str(e),
                "tasks": []
            }
    
    def _parse_task_sentence(self, sentence: str, index: int) -> Dict[str, Any]:
        # Extract assignee
        assignee = None
        words = sentence.split()
        for word in words:
            if word.istitle() and len(word) > 2 and word not in ['The', 'This', 'That']:
                assignee = word
                break
        
        # Extract priority
        priority = "medium"
        sentence_lower = sentence.lower()
        if any(word in sentence_lower for word in ['urgent', 'critical', 'asap']):
            priority = "high"
        elif any(word in sentence_lower for word in ['optional', 'maybe']):
            priority = "low"
        
        # Create title
        title_words = sentence.split()[:6]
        title = ' '.join(title_words)
        if len(title) > 50:
            title = title[:47] + "..."
        
        return {
            "id": f"task_{index}",
            "title": title,
            "description": sentence,
            "assignee": assignee,
            "priority": priority,
            "status": "pending",
            "confidence": 0.7
        }

# Singleton instance
task_extraction_service = TaskExtractionService()