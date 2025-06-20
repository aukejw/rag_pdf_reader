from typing import Dict, Any
from dataclasses import dataclass



@dataclass
class Context(list): 
    def to_string(self) -> str:
        return "\n".join([
            doc.content for doc in self
        ])

    def __repr__(self) -> str:
        return str([str(doc) for doc in self])


@dataclass
class RetrievedDocument:
    content: str
    metadata: Dict[str, Any]
    relevance_score: float = 0.0
