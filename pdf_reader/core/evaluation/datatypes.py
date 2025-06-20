from dataclasses import dataclass


@dataclass
class Evaluation:
    """Response from the evaluation step."""
    is_correct: bool
    evaluation: str
