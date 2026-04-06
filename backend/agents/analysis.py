"""Analysis agent for extracting insights from research paper collections."""

from typing import List, Dict, Any
from collections import Counter
import re
from .discovery import Paper


# Common English stopwords to exclude from keyword analysis
STOPWORDS = {
    "the", "a", "an", "of", "in", "and", "or", "to", "for", "with", "on",
    "is", "are", "was", "were", "be", "been", "by", "from", "this", "that",
    "it", "as", "at", "we", "our", "which", "their", "have", "has", "can",
    "an", "these", "those", "paper", "study", "method", "using", "based",
    "approach", "results", "show", "propose", "proposed", "novel", "new"
}


class AnalysisAgent:
    """Agent responsible for analyzing collections of research papers."""

    def publication_trend(self, papers: List[Paper]) -> Dict[str, Any]:
        """Analyze publication trends by year.
        
        Args:
            papers: List of Paper objects
            
        Returns:
            Dict with labels (year strings), values (counts), and type
        """
        if not papers:
            return {"labels": [], "values": [], "type": "bar"}
        
        year_counts = Counter()
        for paper in papers:
            if paper.year:
                year_counts[paper.year] += 1
        
        if not year_counts:
            return {"labels": [], "values": [], "type": "bar"}
        
        # Sort by year
        sorted_years = sorted(year_counts.keys())
        labels = [str(year) for year in sorted_years]
        values = [year_counts[year] for year in sorted_years]
        
        return {"labels": labels, "values": values, "type": "bar"}

    def top_authors(self, papers: List[Paper], top_n: int = 10) -> Dict[str, Any]:
        """Find the most prolific authors across papers.
        
        Args:
            papers: List of Paper objects
            top_n: Number of top authors to return
            
        Returns:
            Dict with authors list, counts list, and type
        """
        if not papers:
            return {"authors": [], "counts": [], "type": "horizontal_bar"}
        
        author_counts = Counter()
        for paper in papers:
            for author in paper.authors:
                if author and author.strip():
                    author_counts[author.strip()] += 1
        
        if not author_counts:
            return {"authors": [], "counts": [], "type": "horizontal_bar"}
        
        # Get top N authors
        top_authors_list = author_counts.most_common(top_n)
        authors = [name for name, _ in top_authors_list]
        counts = [count for _, count in top_authors_list]
        
        return {"authors": authors, "counts": counts, "type": "horizontal_bar"}

    def keyword_frequency(self, papers: List[Paper], top_n: int = 20) -> Dict[str, Any]:
        """Analyze keyword frequency across papers.
        
        Args:
            papers: List of Paper objects
            top_n: Number of top keywords to return
            
        Returns:
            Dict with words list, counts list, and type
        """
        if not papers:
            return {"words": [], "counts": [], "type": "wordcloud"}
        
        # Combine all titles and abstracts
        combined_text = " ".join([
            paper.title + " " + (paper.abstract or "")
            for paper in papers
        ])
        
        # Convert to lowercase and extract words
        combined_text = combined_text.lower()
        # Extract only alphabetic words and numbers
        words = re.findall(r'\b[a-z0-9]+\b', combined_text)
        
        # Filter: remove stopwords, keep words >= 4 chars
        filtered_words = [
            word for word in words
            if word not in STOPWORDS and len(word) >= 4
        ]
        
        if not filtered_words:
            return {"words": [], "counts": [], "type": "wordcloud"}
        
        # Count frequencies
        word_counts = Counter(filtered_words)
        top_words_list = word_counts.most_common(top_n)
        
        words = [word for word, _ in top_words_list]
        counts = [count for _, count in top_words_list]
        
        return {"words": words, "counts": counts, "type": "wordcloud"}

    def citation_distribution(self, papers: List[Paper]) -> Dict[str, Any]:
        """Analyze distribution of citation counts.
        
        Args:
            papers: List of Paper objects
            
        Returns:
            Dict with citation bucket labels and counts
        """
        if not papers:
            return {"labels": [], "values": [], "type": "bar"}
        
        buckets = {
            "0": 0,
            "1-10": 0,
            "11-50": 0,
            "51-200": 0,
            "201-1000": 0,
            "1000+": 0
        }
        
        for paper in papers:
            citations = paper.citation_count
            if citations == 0:
                buckets["0"] += 1
            elif citations <= 10:
                buckets["1-10"] += 1
            elif citations <= 50:
                buckets["11-50"] += 1
            elif citations <= 200:
                buckets["51-200"] += 1
            elif citations <= 1000:
                buckets["201-1000"] += 1
            else:
                buckets["1000+"] += 1
        
        labels = list(buckets.keys())
        values = list(buckets.values())
        
        return {"labels": labels, "values": values, "type": "bar"}

    def emerging_topics(self, papers: List[Paper]) -> Dict[str, Any]:
        """Identify emerging vs declining topics based on publication year.
        
        Args:
            papers: List of Paper objects
            
        Returns:
            Dict with emerging and declining word lists
        """
        if not papers:
            return {"emerging": [], "declining": [], "type": "comparison"}
        
        # Split by year threshold
        recent_papers = [p for p in papers if p.year and p.year >= 2022]
        older_papers = [p for p in papers if p.year and p.year < 2022]
        
        # Get top keywords for each group
        recent_keywords_result = self.keyword_frequency(recent_papers, top_n=30)
        older_keywords_result = self.keyword_frequency(older_papers, top_n=30)
        
        recent_words = set(recent_keywords_result.get("words", []))
        older_words = set(older_keywords_result.get("words", []))
        
        # Emerging: in recent but not older
        emerging = sorted(list(recent_words - older_words))
        
        # Declining: in older but not recent
        declining = sorted(list(older_words - recent_words))
        
        return {"emerging": emerging, "declining": declining, "type": "comparison"}

    def run(self, papers: List[Paper]) -> Dict[str, Any]:
        """Run all analyses on the paper collection.
        
        Args:
            papers: List of Paper objects
            
        Returns:
            Dict containing all analysis results and metadata
        """
        # Calculate metadata
        years = [p.year for p in papers if p.year]
        year_range = [min(years), max(years)] if years else [None, None]
        
        # Run all analyses
        results = {
            "trend": self.publication_trend(papers),
            "authors": self.top_authors(papers),
            "keywords": self.keyword_frequency(papers),
            "citations": self.citation_distribution(papers),
            "emerging": self.emerging_topics(papers),
            "metadata": {
                "paper_count": len(papers),
                "year_range": year_range
            }
        }
        
        return results
