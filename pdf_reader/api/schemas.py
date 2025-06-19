from pydantic import BaseModel
from typing import List, Dict, Any


class Question(BaseModel):
    """Question"""
    text: str


class Answer(BaseModel):
    """Answer to questions"""
    # The answer itself
    answer: str

    # The context and metadata of all retrieved chunks
    context: List[Dict[str, Any]]

    # Where to find the answer
    relevant_text: Dict[str, Any]
