"""Orchestrator Executor for executing multi-agent research workflows."""

import re
import json
import dataclasses
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.discovery import DiscoveryAgent
from agents.analysis import AnalysisAgent
from agents.citation import CitationAgent
from agents.synthesis import SynthesisAgent
from orchestrator.planner import OrchestratorPlanner, ExecutionPlan
from models.database import Session as SessionModel, Paper, AnalysisResult, TraceLog


class ExecutionResult(BaseModel):
    """Result of a complete orchestration execution."""
    session_id: int
    plan: dict  # serialized ExecutionPlan
    papers: list[dict]
    analysis: Optional[dict] = None
    citations: Optional[dict] = None
    synthesis: Optional[dict] = None
    conflict: Optional[dict] = None
    trace: list[dict]  # list of TraceLog entries as dicts
    status: str  # "complete", "partial", "failed"
    total_duration_ms: int = 0  # Total execution time in milliseconds
    paper_count: int = 0  # Number of papers discovered


class OrchestratorExecutor:
    """Executes orchestrated research workflows with multiple agents."""

    def __init__(self):
        """Initialize the executor with all agents."""
        self.discovery_agent = DiscoveryAgent()
        self.analysis_agent = AnalysisAgent()
        self.citation_agent = CitationAgent()
        self.synthesis_agent = SynthesisAgent()
        self.planner = OrchestratorPlanner()

    async def execute(self, query: str, db: Session) -> ExecutionResult:
        """Execute a complete orchestrated workflow.
        
        Args:
            query: User's research query
            db: Database session
            
        Returns:
            ExecutionResult with all data and execution trace
        """
        trace = []
        papers = []
        analysis = None
        citations = None
        synthesis = None
        conflict = None
        status = "complete"
        trace_log_map = {}  # Initialize before try block

        try:
            # Step A: Create a new Session record
            db_session = SessionModel(
                name=query[:100],
                query=query,
                created_at=datetime.now()
            )
            db.add(db_session)
            db.commit()
            db.refresh(db_session)
            session_id = db_session.id

            # Step B: Get execution plan from planner
            execution_plan: ExecutionPlan = await self.planner.plan(query)
            print(f"\n📋 Execution plan created with {len(execution_plan.steps)} steps:")
            for step in execution_plan.steps:
                print(f"  - Step {step.step_number}: {step.agent_name} ({step.action})")
            
            plan_dict = {
                "query": execution_plan.query,
                "intent": execution_plan.intent,
                "reasoning": execution_plan.reasoning,
                "steps": [
                    {
                        "step_number": step.step_number,
                        "agent_name": step.agent_name,
                        "action": step.action,
                        "parameters": step.parameters,
                        "depends_on": step.depends_on,
                        "condition": step.condition
                    }
                    for step in execution_plan.steps
                ]
            }

            # Step C: Create TraceLog records for each planned step
            for step in execution_plan.steps:
                trace_log = TraceLog(
                    session_id=session_id,
                    step_number=step.step_number,
                    agent_name=step.agent_name,
                    status="pending",
                    input_summary=f"{step.action} with {step.parameters}"
                )
                db.add(trace_log)
            db.commit()

            # Fetch all trace logs to get their IDs and update them during execution
            trace_logs = db.query(TraceLog).filter(TraceLog.session_id == session_id).all()
            trace_log_map = {tl.step_number: tl for tl in trace_logs}

            # Context for condition evaluation
            context = {"paper_count": 0}

            # Step D: Execute steps in order
            for step in execution_plan.steps:
                print(f"\n🔧 Executing step {step.step_number}: {step.agent_name} (action: {step.action})")
                trace_log = trace_log_map[step.step_number]
                
                try:
                    # Update to running
                    trace_log.status = "running"
                    trace_log.started_at = datetime.now()
                    db.commit()

                    # Evaluate condition
                    if step.condition:
                        if not self.evaluate_condition(step.condition, context):
                            trace_log.status = "skipped"
                            trace_log.finished_at = datetime.now()
                            trace_log.output_summary = f"Condition not met: {step.condition}"
                            db.commit()
                            trace.append(self._trace_log_to_dict(trace_log))
                            continue

                    # Execute agent
                    step_error = None
                    if step.agent_name == "discovery":
                        papers = await self.discovery_agent.run(
                            query,
                            step.parameters.get("max_results", 20)
                        )
                        context["paper_count"] = len(papers)
                        trace_log.output_summary = f"Discovered {len(papers)} papers"

                    elif step.agent_name == "analysis":
                        if papers:
                            analysis = self.analysis_agent.run(papers)
                            trace_log.output_summary = f"Analyzed {analysis.get('paper_count', 0)} papers"
                        else:
                            trace_log.output_summary = "No papers to analyze"

                    elif step.agent_name == "citation":
                        if papers:
                            try:
                                print(f"🔄 Running citation agent with {len(papers)} papers")
                                citations = await self.citation_agent.run(papers)
                                print(f"[executor] citations result: {str(citations)[:200]}")
                                print(f"✅ Citation agent completed: {type(citations)}")
                                trace_log.output_summary = f"Generated citations for {len(papers)} papers"
                            except Exception as citation_error:
                                print(f"❌ Citation agent error: {str(citation_error)}")
                                import traceback
                                traceback.print_exc()
                                trace_log.output_summary = f"Citation failed: {str(citation_error)}"
                        else:
                            trace_log.output_summary = "No papers to cite"

                    elif step.agent_name == "synthesis":
                        if papers:
                            try:
                                print(f"🔄 Running synthesis agent with {len(papers)} papers")
                                # Convert Paper objects to dicts
                                paper_dicts = [dataclasses.asdict(p) for p in papers]
                                
                                if step.action == "cross_synthesis":
                                    print(f"  Mode: cross-synthesis")
                                    synthesis = await self.synthesis_agent.run(
                                        paper_dicts,
                                        mode="cross"
                                    )
                                else:
                                    print(f"  Mode: single-synthesis")
                                    synthesis = await self.synthesis_agent.run(
                                        paper_dicts,
                                        mode="single",
                                        paper_index=0
                                    )
                                print(f"[executor] synthesis result: {str(synthesis)[:200]}")
                                print(f"✅ Synthesis agent completed: {type(synthesis)}")
                                trace_log.output_summary = f"Synthesis complete: {step.action}"
                            except Exception as synthesis_error:
                                print(f"❌ Synthesis agent error: {str(synthesis_error)}")
                                import traceback
                                traceback.print_exc()
                                trace_log.output_summary = f"Synthesis failed: {str(synthesis_error)}"
                        else:
                            trace_log.output_summary = "No papers to synthesize"

                    # Mark as done
                    trace_log.status = "done"
                    trace_log.finished_at = datetime.now()
                    db.commit()

                except Exception as e:
                    trace_log.status = "failed"
                    trace_log.finished_at = datetime.now()
                    trace_log.output_summary = str(e)
                    db.commit()
                    status = "partial"

                trace.append(self._trace_log_to_dict(trace_log))

            # Step E: Detect conflicts if both analysis and synthesis completed
            if analysis and synthesis:
                conflict = await self.synthesis_agent.detect_conflict(analysis, synthesis)

            # Step F: Save all Paper records to database
            if papers:
                for paper in papers:
                    paper_dict = dataclasses.asdict(paper) if not isinstance(paper, dict) else paper
                    
                    # Check if paper already exists by DOI
                    doi = paper_dict.get("doi")
                    existing_paper = None
                    if doi:
                        existing_paper = db.query(Paper).filter(Paper.doi == doi).first()
                    
                    # Skip if paper already exists
                    if existing_paper:
                        continue
                    
                    db_paper = Paper(
                        session_id=session_id,
                        title=paper_dict.get("title", "Unknown"),
                        authors=json.dumps(paper_dict.get("authors", [])),
                        year=paper_dict.get("year"),
                        abstract=paper_dict.get("abstract", ""),
                        url=paper_dict.get("url", ""),
                        doi=doi,
                        citation_count=paper_dict.get("citation_count", 0),
                        source=paper_dict.get("source", "unknown"),
                        relevance_score=paper_dict.get("relevance_score", 0.0)
                    )
                    db.add(db_paper)
                db.commit()

            # Step F+: UNCONDITIONAL: Generate citations if we have papers
            if papers:
                print(f"\n🔄 [UNCONDITIONAL] Generating citations for {len(papers)} papers...")
                try:
                    # Import here to avoid circular imports
                    from agents.citation import CitationAgent
                    
                    # Convert papers to dicts
                    paper_dicts = [
                        dataclasses.asdict(p) if dataclasses.is_dataclass(p) 
                        else (p.__dict__ if hasattr(p, '__dict__') else p) 
                        for p in papers
                    ]
                    
                    # Generate citations
                    citation_agent = CitationAgent()
                    citations = await citation_agent.run(paper_dicts, style="apa")
                    
                    print(f"[executor] citations generated: {bool(citations)}")
                    print(f"✅ Unconditional citation generation completed")
                except Exception as citation_ex:
                    print(f"❌ Unconditional citation generation error: {str(citation_ex)}")
                    import traceback
                    traceback.print_exc()
                    citations = None

            # Step G: Save AnalysisResult records
            if analysis:
                for analysis_type in ["trend", "authors", "keywords", "citations", "emerging"]:
                    if analysis_type in analysis:
                        analysis_result = AnalysisResult(
                            session_id=session_id,
                            analysis_type=analysis_type,
                            data=json.dumps(analysis[analysis_type]),
                            created_at=datetime.now()
                        )
                        db.add(analysis_result)
                db.commit()

        except Exception as e:
            status = "failed"
            trace_log = trace_log_map.get(1)
            if trace_log:
                trace_log.status = "failed"
                trace_log.output_summary = str(e)
                db.commit()

        # Step H: Calculate total duration and return ExecutionResult
        total_duration_ms = 0
        if trace:
            # Calculate duration from first started_at to last finished_at
            started_times = [t.get("started_at_ms", 0) for t in trace if t.get("started_at_ms")]
            finished_times = [t.get("finished_at_ms", 0) for t in trace if t.get("finished_at_ms")]
            if started_times and finished_times:
                total_duration_ms = max(finished_times) - min(started_times)
        
        # Add proper fallbacks for None values
        if citations is None:
            citations = {
                "citations": [],
                "bulk_txt": "No citations were generated. Please check the query and try again.",
                "bulk_bib": ""
            }
        if synthesis is None:
            synthesis = {
                "tldr": "No synthesis available",
                "key_findings": [],
                "relevance_tags": [],
                "contradictions": [],
                "consensus": "",
                "research_gaps": []
            }
        
        print(f"\n📊 Final Result Summary:")
        print(f"  Papers: {len(papers)}")
        print(f"  Analysis: {'✓' if analysis else '✗'}")
        print(f"  Citations: {'✓' if citations and 'error' not in citations else '✗'}")
        print(f"  Synthesis: {'✓' if synthesis and 'error' not in synthesis else '✗'}")
        print(f"  Total Duration: {total_duration_ms}ms")
        
        return ExecutionResult(
            session_id=session_id,
            plan=plan_dict,
            papers=[dataclasses.asdict(p) if not isinstance(p, dict) else p for p in papers],
            analysis=analysis,
            citations=citations,
            synthesis=synthesis,
            conflict=conflict,
            trace=trace,
            status=status,
            total_duration_ms=total_duration_ms,
            paper_count=len(papers)
        )

    def evaluate_condition(self, condition: str, context: dict) -> bool:
        """Evaluate a condition string using context.
        
        Args:
            condition: Condition string like "paper_count > 5"
            context: Context dict with variables like {"paper_count": 10}
            
        Returns:
            Boolean result of evaluation
        """
        try:
            # Parse simple conditions like "paper_count > 5"
            pattern = r'(\w+)\s*(>|<|>=|<=|==|!=)\s*(\d+)'
            match = re.match(pattern, condition.strip())

            if not match:
                # If regex doesn't match, fail open (return True)
                return True

            field, operator, value = match.groups()
            field_value = context.get(field)

            if field_value is None:
                # If field not in context, fail open
                return True

            value_int = int(value)

            # Evaluate the condition
            if operator == ">":
                return field_value > value_int
            elif operator == "<":
                return field_value < value_int
            elif operator == ">=":
                return field_value >= value_int
            elif operator == "<=":
                return field_value <= value_int
            elif operator == "==":
                return field_value == value_int
            elif operator == "!=":
                return field_value != value_int
            else:
                # Unknown operator, fail open
                return True

        except Exception:
            # On any error, fail open
            return True

    def _trace_log_to_dict(self, trace_log: TraceLog) -> dict:
        """Convert a TraceLog database record to a dictionary."""
        return {
            "step_number": trace_log.step_number,
            "agent_name": trace_log.agent_name,
            "status": trace_log.status,
            "input_summary": trace_log.input_summary,
            "output_summary": trace_log.output_summary,
            "started_at": trace_log.started_at.isoformat() if trace_log.started_at else None,
            "finished_at": trace_log.finished_at.isoformat() if trace_log.finished_at else None,
            "started_at_ms": int(trace_log.started_at.timestamp() * 1000) if trace_log.started_at else 0,
            "finished_at_ms": int(trace_log.finished_at.timestamp() * 1000) if trace_log.finished_at else 0
        }

