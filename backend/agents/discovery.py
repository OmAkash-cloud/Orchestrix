"""Discovery agent for researching academic papers and sources."""

import asyncio
import os
import re
import string
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Optional, List
from httpx import AsyncClient
import json


@dataclass
class Paper:
    """Dataclass representing a research paper."""
    title: str
    authors: List[str]
    year: Optional[int]
    abstract: Optional[str]
    url: str
    doi: Optional[str]
    citation_count: int
    source: str
    relevance_score: float = 0.0


class DiscoveryAgent:
    """Agent responsible for discovering research papers from multiple academic sources."""

    def __init__(self):
        self.arxiv_url = "http://export.arxiv.org/api/query"
        self.semantic_scholar_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        self.openalex_url = "https://api.openalex.org/works"
        self.timeout = 15.0

    async def fetch_arxiv(self, query: str, page: int = 0, per_page: int = 10) -> List[Paper]:
        """Fetch papers from arXiv API.
        
        Args:
            query: Search query string
            page: Page number (0-indexed)
            per_page: Results per page
            
        Returns:
            List of Paper objects from arXiv
        """
        try:
            start = page * per_page
            params = {
                "search_query": f"all:{query}",
                "start": start,
                "max_results": per_page,
                "sortBy": "relevance"
            }
            
            async with AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.arxiv_url, params=params)
                response.raise_for_status()
            
            papers = []
            root = ET.fromstring(response.content)
            
            # arXiv namespace
            ns = {'arxiv': 'http://arxiv.org/atom/v0.3',
                  'atom': 'http://www.w3.org/2005/Atom'}
            
            for entry in root.findall('atom:entry', ns):
                try:
                    # Extract title
                    title_elem = entry.find('atom:title', ns)
                    title = title_elem.text.strip() if title_elem is not None else "Unknown"
                    
                    # Extract authors
                    authors = []
                    for author_elem in entry.findall('atom:author', ns):
                        name_elem = author_elem.find('atom:name', ns)
                        if name_elem is not None:
                            authors.append(name_elem.text)
                    
                    # Extract published year
                    published_elem = entry.find('atom:published', ns)
                    year = None
                    if published_elem is not None:
                        year_str = published_elem.text
                        year = int(year_str.split('-')[0]) if year_str else None
                    
                    # Extract abstract
                    abstract_elem = entry.find('atom:summary', ns)
                    abstract = abstract_elem.text.strip() if abstract_elem is not None else None
                    
                    # Extract URL (id contains the arXiv ID)
                    id_elem = entry.find('atom:id', ns)
                    url = id_elem.text if id_elem is not None else ""
                    
                    paper = Paper(
                        title=title,
                        authors=authors,
                        year=year,
                        abstract=abstract,
                        url=url,
                        doi=None,
                        citation_count=0,
                        source="arxiv"
                    )
                    papers.append(paper)
                except Exception as e:
                    print(f"Error parsing arXiv entry: {e}")
                    continue
            
            return papers
        
        except Exception as e:
            print(f"ArXiv fetch error: {e}")
            return []

    async def fetch_semantic_scholar(self, query: str, page: int = 0, per_page: int = 10) -> List[Paper]:
        """Fetch papers from Semantic Scholar API.
        
        Args:
            query: Search query string
            page: Page number (0-indexed)
            per_page: Results per page
            
        Returns:
            List of Paper objects from Semantic Scholar
        """
        try:
            offset = page * per_page
            params = {
                "query": query,
                "offset": offset,
                "limit": per_page,
                "fields": "title,authors,year,abstract,externalIds,citationCount,url"
            }
            
            async with AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.semantic_scholar_url, params=params)
                response.raise_for_status()
            
            data = response.json()
            papers = []
            
            for result in data.get("data", []):
                try:
                    # Extract basic fields
                    title = result.get("title", "Unknown")
                    year = result.get("year")
                    abstract = result.get("abstract")
                    citation_count = result.get("citationCount", 0)
                    url = result.get("url", "")
                    
                    # Extract authors
                    authors = []
                    for author in result.get("authors", []):
                        if isinstance(author, dict):
                            authors.append(author.get("name", ""))
                        else:
                            authors.append(str(author))
                    
                    # Extract DOI from external IDs
                    doi = None
                    external_ids = result.get("externalIds", {})
                    if isinstance(external_ids, dict):
                        doi = external_ids.get("DOI")
                    
                    paper = Paper(
                        title=title,
                        authors=authors,
                        year=year,
                        abstract=abstract,
                        url=url,
                        doi=doi,
                        citation_count=citation_count,
                        source="semantic_scholar"
                    )
                    papers.append(paper)
                except Exception as e:
                    print(f"Error parsing Semantic Scholar result: {e}")
                    continue
            
            return papers
        
        except Exception as e:
            print(f"Semantic Scholar fetch error: {e}")
            return []

    async def fetch_openalex(self, query: str, page: int = 1, per_page: int = 10) -> List[Paper]:
        """Fetch papers from OpenAlex API.
        
        Args:
            query: Search query string
            page: Page number (1-indexed for OpenAlex)
            per_page: Results per page
            
        Returns:
            List of Paper objects from OpenAlex
        """
        try:
            params = {
                "search": query,
                "page": page,
                "per-page": per_page
            }
            
            async with AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.openalex_url, params=params)
                response.raise_for_status()
            
            data = response.json()
            papers = []
            
            for result in data.get("results", []):
                try:
                    # Extract basic fields
                    title = result.get("title", "Unknown")
                    year = result.get("publication_year")
                    doi = result.get("doi")
                    citation_count = result.get("cited_by_count", 0)
                    url = result.get("id", "")
                    
                    # Extract authors
                    authors = []
                    for authorship in result.get("authorships", []):
                        author = authorship.get("author", {})
                        display_name = author.get("display_name")
                        if display_name:
                            authors.append(display_name)
                    
                    # Reconstruct abstract from inverted index
                    abstract = None
                    abstract_inverted = result.get("abstract_inverted_index")
                    if abstract_inverted and isinstance(abstract_inverted, dict):
                        # Create array with max position + 1
                        max_pos = max((pos for positions in abstract_inverted.values() 
                                      for pos in positions), default=-1)
                        if max_pos >= 0:
                            words = [''] * (max_pos + 1)
                            for word, positions in abstract_inverted.items():
                                for pos in positions:
                                    if pos < len(words):
                                        words[pos] = word
                            abstract = ' '.join(words).strip()
                    
                    paper = Paper(
                        title=title,
                        authors=authors,
                        year=year,
                        abstract=abstract,
                        url=url,
                        doi=doi,
                        citation_count=citation_count,
                        source="openalex"
                    )
                    papers.append(paper)
                except Exception as e:
                    print(f"Error parsing OpenAlex result: {e}")
                    continue
            
            return papers
        
        except Exception as e:
            print(f"OpenAlex fetch error: {e}")
            return []

    def score_relevance(self, paper: Paper, query: str) -> float:
        """Calculate relevance score for a paper.
        
        Scoring components:
        - keyword_score (0.4 weight): Query words found in title+abstract
        - citation_score (0.3 weight): Citation count normalized
        - recency_score (0.3 weight): Paper age
        
        Args:
            paper: Paper to score
            query: Search query string
            
        Returns:
            Relevance score between 0.0 and 1.0
        """
        # Normalize query words
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        # a. Keyword score (0.4 weight)
        text_to_search = f"{paper.title} {paper.abstract or ''}".lower()
        # Remove punctuation for matching
        text_clean = text_to_search.translate(str.maketrans('', '', string.punctuation))
        text_words = set(text_clean.split())
        
        matching_words = len(query_words & text_words)
        total_words = len(query_words)
        keyword_score = matching_words / total_words if total_words > 0 else 0.0
        
        # b. Citation score (0.3 weight) - normalized by 1000
        citation_score = min(paper.citation_count / 1000.0, 1.0)
        
        # c. Recency score (0.3 weight)
        recency_score = 0.4  # Default for old papers
        if paper.year:
            if paper.year >= 2022:
                recency_score = 1.0
            elif paper.year >= 2020:
                recency_score = 0.8
            elif paper.year >= 2018:
                recency_score = 0.6
        
        # Weighted sum
        total_score = (
            0.4 * keyword_score +
            0.3 * citation_score +
            0.3 * recency_score
        )
        
        # Round to 4 decimal places
        return round(total_score, 4)

    def _normalize_title(self, title: str) -> str:
        """Normalize title for deduplication."""
        # Lowercase and remove punctuation
        normalized = title.lower()
        normalized = ''.join(c for c in normalized if c.isalnum() or c.isspace())
        # Remove extra whitespace
        normalized = ' '.join(normalized.split())
        return normalized

    async def run(self, query: str, max_results: int = 20) -> List[Paper]:
        """Run discovery across all sources.
        
        Args:
            query: Search query string
            max_results: Maximum results to return
            
        Returns:
            List of deduplicated, scored, and sorted papers
        """
        # Fetch from all three sources concurrently (page 0)
        arxiv_papers, scholar_papers, openalex_papers = await asyncio.gather(
            self.fetch_arxiv(query, page=0, per_page=10),
            self.fetch_semantic_scholar(query, page=0, per_page=10),
            self.fetch_openalex(query, page=1, per_page=10),
            return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(arxiv_papers, Exception):
            arxiv_papers = []
        if isinstance(scholar_papers, Exception):
            scholar_papers = []
        if isinstance(openalex_papers, Exception):
            openalex_papers = []
        
        all_papers = arxiv_papers + scholar_papers + openalex_papers
        
        # If we have fewer results than requested, fetch page 1 from some sources
        if len(all_papers) < max_results:
            page1_arxiv, page1_scholar = await asyncio.gather(
                self.fetch_arxiv(query, page=1, per_page=10),
                self.fetch_semantic_scholar(query, page=1, per_page=10),
                return_exceptions=True
            )
            
            if not isinstance(page1_arxiv, Exception):
                all_papers.extend(page1_arxiv)
            if not isinstance(page1_scholar, Exception):
                all_papers.extend(page1_scholar)
        
        # Deduplicate by normalized title
        seen_titles = set()
        deduplicated = []
        
        for paper in all_papers:
            normalized_title = self._normalize_title(paper.title)
            if normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                # Score the paper
                paper.relevance_score = self.score_relevance(paper, query)
                deduplicated.append(paper)
        
        # Sort by relevance score (descending)
        deduplicated.sort(key=lambda p: p.relevance_score, reverse=True)
        
        # Return top max_results
        return deduplicated[:max_results]
