"""LLM-powered Orchestrator Planner for coordinating multi-agent research workflows."""

import anthropic
import json
import os
from typing import List, Optional
from pydantic import BaseModel


class ExecutionStep(BaseModel):
    """Represents a single step in an execution plan."""
    step_number: int
    agent_name: str  # "discovery", "analysis", "citation", "synthesis"
    action: str
    parameters: dict
    depends_on: list[int]  # step numbers this depends on
    condition: Optional[str] = None  # e.g. "only if discovery returns > 5 papers"


class ExecutionPlan(BaseModel):
    """Represents a complete execution plan for research orchestration."""
    query: str
    intent: str  # "exploratory", "deep_dive", "citation_task", "comparison"
    steps: list[ExecutionStep]
    reasoning: str


class OrchestratorPlanner:
    """LLM-powered planner for creating and executing research orchestration plans."""

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-haiku-4-5"

    async def plan(self, query: str) -> ExecutionPlan:
        """Create an execution plan for the given query.
        
        Args:
            query: User's research query
            
        Returns:
            ExecutionPlan object with ordered steps and reasoning
        """
        system_prompt = """You are a research orchestrator. Given a user query, create an execution plan for a multi-agent research system.

Available agents:
- discovery: fetches academic papers from arXiv, Semantic Scholar, OpenAlex
- analysis: analyzes paper trends, authors, keywords, citations, emerging topics
- citation: generates formatted citations in APA, MLA, IEEE, Chicago
- synthesis: summarizes individual papers or synthesizes multiple papers

Respond with a JSON object following this schema:
{
  "query": "original query",
  "intent": one of ["exploratory", "deep_dive", "citation_task", "comparison"],
  "steps": [
    {
      "step_number": 1,
      "agent_name": "discovery",
      "action": "fetch_papers",
      "parameters": {"max_results": 20},
      "depends_on": [],
      "condition": null
    }
  ],
  "reasoning": "one sentence explaining the plan"
}

Rules:
- Always start with discovery if the query involves finding papers
- Run analysis after discovery if the query is exploratory or comparison
- Run synthesis after discovery if the query asks for summaries or insights
- Run citation if the query asks for references or citations
- Use condition field for conditional steps (e.g. "run only if discovery returns > 3 papers")
- For comparison queries, set synthesis action to "cross_synthesis"
- For citation-only queries, skip analysis and synthesis
- max_results should be 10 for deep_dive, 20 for exploratory, 5 for citation_task, 15 for comparison

Return only valid JSON. No markdown."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.1,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": query
                    }
                ]
            )

            response_text = message.content[0].text

            # Parse JSON response
            try:
                plan_dict = json.loads(response_text)
                
                # Convert steps to ExecutionStep objects
                steps = [ExecutionStep(**step) for step in plan_dict.get("steps", [])]
                
                execution_plan = ExecutionPlan(
                    query=plan_dict.get("query", query),
                    intent=plan_dict.get("intent", "deep_dive"),
                    steps=steps,
                    reasoning=plan_dict.get("reasoning", "")
                )
                
                return execution_plan
            
            except json.JSONDecodeError:
                # Try to extract JSON from response
                try:
                    start = response_text.find("{")
                    end = response_text.rfind("}") + 1
                    if start >= 0 and end > start:
                        json_str = response_text[start:end]
                        plan_dict = json.loads(json_str)
                        steps = [ExecutionStep(**step) for step in plan_dict.get("steps", [])]
                        execution_plan = ExecutionPlan(
                            query=plan_dict.get("query", query),
                            intent=plan_dict.get("intent", "deep_dive"),
                            steps=steps,
                            reasoning=plan_dict.get("reasoning", "")
                        )
                        return execution_plan
                except:
                    pass
                
                # Return default plan on parse failure
                return self._default_plan(query)

        except Exception as e:
            # Return default plan on API failure
            return self._default_plan(query)

    def _default_plan(self, query: str) -> ExecutionPlan:
        """Create a default execution plan when API fails."""
        intent = self.classify_intent(query)
        
        steps = [
            ExecutionStep(
                step_number=1,
                agent_name="discovery",
                action="fetch_papers",
                parameters={"max_results": 20},
                depends_on=[],
                condition=None
            ),
            ExecutionStep(
                step_number=2,
                agent_name="analysis",
                action="analyze_papers",
                parameters={},
                depends_on=[1],
                condition="only if discovery returns papers"
            ),
            ExecutionStep(
                step_number=3,
                agent_name="synthesis",
                action="synthesize_papers",
                parameters={"mode": "cross"},
                depends_on=[1],
                condition="only if discovery returns multiple papers"
            )
        ]
        
        return ExecutionPlan(
            query=query,
            intent=intent,
            steps=steps,
            reasoning="Default plan: discover papers, analyze trends, then synthesize insights."
        )

    def classify_intent(self, query: str) -> str:
        """Classify query intent using rule-based heuristics.
        
        Args:
            query: User's research query
            
        Returns:
            Intent classification: "exploratory", "deep_dive", "citation_task", or "comparison"
        """
        query_lower = query.lower()
        
        # Check for citation task indicators
        if any(term in query_lower for term in ["cite", "reference", "bibliography", "formatted", "citation format"]):
            return "citation_task"
        
        # Check for comparison indicators
        if any(term in query_lower for term in ["compare", " vs ", "versus", "difference between", "distinct from"]):
            return "comparison"
        
        # Check for exploratory indicators
        if any(term in query_lower for term in ["overview", "survey", "introduction", "summary", "what is", "background"]):
            return "exploratory"
        
        # Default to deep dive
        return "deep_dive"
