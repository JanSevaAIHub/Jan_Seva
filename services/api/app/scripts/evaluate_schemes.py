"""Run the five requested questions on the REAL configured RAG path, without mocks."""

import json
import sys

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.ai.provider import ProviderError
from app.ai.rag import answer_question
from app.ai.scheme_schemas import SchemeAsk
from app.config import ConfigurationError
from app.db import get_engine

QUESTIONS = [
    ("farmer", "What schemes could support farmers in Punjab?", {"state": "Punjab", "occupation": "Farmer"}),
    ("student", "Are there verified government schemes for students?", None),
    ("documents", "What documents are required for Sukanya Samriddhi Yojana?", None),
    ("state", "Can a person from Haryana without Punjab domicile apply for Punjab Ashirwad?", None),
    ("unknown", "Tell me about the Galactic Farming Grant, a scheme not in the database.", None),
]


def main():
    failed = 0
    for name, question, profile in QUESTIONS:
        try:
            with Session(get_engine()) as db:
                result = answer_question(db, SchemeAsk(message=question, profile=profile))
            print(json.dumps({"case": name, "question": question, "execution": "completed",
                "result": result.model_dump(mode="json"), "review": "Inspect relevance and evidence; no automatic quality percentage is asserted."}, ensure_ascii=False))
        except (ConfigurationError, ProviderError, SQLAlchemyError) as error:
            failed += 1
            print(json.dumps({"case": name, "question": question, "execution": "blocked",
                "error": str(error) if isinstance(error, (ConfigurationError, ProviderError)) else "Database/vector query unavailable; check migration and connection."}))
    return int(bool(failed))


if __name__ == "__main__":
    sys.exit(main())
