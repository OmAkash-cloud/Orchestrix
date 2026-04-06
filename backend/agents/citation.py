"""Citation agent for formatting and exporting citations in various styles."""

from typing import List, Dict, Optional, Union, Any
import re


class CitationAgent:
    """Agent responsible for formatting citations and generating bibliographies."""

    @staticmethod
    def _get(paper: Union[Dict, Any], field: str, default: str = "") -> str:
        """Get a field from paper dict or dataclass object.
        
        Args:
            paper: Paper dict or dataclass object
            field: Field name
            default: Default value if not found
            
        Returns:
            Field value or default
        """
        if isinstance(paper, dict):
            return paper.get(field, default)
        return getattr(paper, field, default)

    @staticmethod
    def _normalize_authors(authors: Any) -> List[str]:
        """Normalize authors from various formats.
        
        Args:
            authors: List of author strings or dicts with 'name' key
            
        Returns:
            List of author name strings
        """
        if not authors:
            return ["Unknown Author"]
        
        result = []
        for a in authors:
            if isinstance(a, dict):
                result.append(a.get("name", "Unknown"))
            elif isinstance(a, str):
                result.append(a)
            else:
                result.append(str(a))
        
        return result if result else ["Unknown Author"]

    @staticmethod
    def _parse_author_name(author_name: str) -> tuple:
        """Parse author name into parts.
        
        Args:
            author_name: Full author name
            
        Returns:
            Tuple of (last_name, first_initials)
        """
        if not author_name or not author_name.strip():
            return ("Unknown", "")
        
        author_name = author_name.strip()
        parts = author_name.split()
        
        if len(parts) == 1:
            return (parts[0], "")
        elif len(parts) == 2:
            return (parts[1], parts[0][0] if parts[0] else "")
        else:
            # Try to identify last name (typically last part)
            last_name = parts[-1]
            first_names = parts[:-1]
            initials = "".join(p[0] for p in first_names if p)
            return (last_name, initials)

    @staticmethod
    def _get_url(paper: Union[Dict, Any]) -> str:
        """Get the URL for a paper, preferring DOI.
        
        Args:
            paper: Paper dict or object
            
        Returns:
            DOI URL or paper URL
        """
        doi = CitationAgent._get(paper, "doi", "")
        url = CitationAgent._get(paper, "url", "")
        
        if doi:
            return f"https://doi.org/{doi}"
        return url

    @staticmethod
    def format_authors_apa(authors: List[str], max_authors: int = 7) -> str:
        """Format authors for APA style.
        
        Format: Last, F. M., & Last, F. M.
        If > max_authors: show first 6, ..., and last author
        
        Args:
            authors: List of author names
            max_authors: Threshold for showing all vs abbreviated
            
        Returns:
            Formatted author string
        """
        if not authors or not any(authors):
            return "Unknown Author"
        
        # Filter out empty strings
        valid_authors = [a for a in authors if a and a.strip()]
        if not valid_authors:
            return "Unknown Author"
        
        formatted = []
        for author in valid_authors:
            last, first = CitationAgent._parse_author_name(author)
            if first:
                formatted.append(f"{last}, {first}.")
            else:
                formatted.append(last)
        
        # Handle truncation for many authors
        if len(formatted) > max_authors:
            abbreviated = formatted[:6] + ["..."] + [formatted[-1]]
            return " & ".join(abbreviated)
        
        if len(formatted) == 1:
            return formatted[0]
        elif len(formatted) == 2:
            return f"{formatted[0]} & {formatted[1]}"
        else:
            return ", ".join(formatted[:-1]) + ", & " + formatted[-1]

    def format_apa(self, paper: Union[Dict, Any]) -> str:
        """Format citation in APA style.
        
        Format: Author, A. A., & Author, B. B. (Year). Title. Source. URL
        
        Args:
            paper: Paper dict or object
            
        Returns:
            Formatted APA citation
        """
        authors = self._normalize_authors(self._get(paper, "authors", []))
        authors_str = self.format_authors_apa(authors)
        year = self._get(paper, "year", "n.d.")
        title = self._get(paper, "title", "Untitled")
        source = self._get(paper, "source", "Unknown")
        url = self._get_url(paper)
        
        citation = f"{authors_str} ({year}). {title}. {source}."
        if url:
            citation += f" {url}"
        
        return citation.strip()

    def format_mla(self, paper: Union[Dict, Any]) -> str:
        """Format citation in MLA style.
        
        Format: Last, First, and First Last. "Title." Source, Year, URL.
        If > 2 authors: First Author, et al.
        
        Args:
            paper: Paper dict or object
            
        Returns:
            Formatted MLA citation
        """
        authors = self._normalize_authors(self._get(paper, "authors", []))
        
        if not authors or not any(authors):
            author_str = "Unknown Author"
        elif len(authors) == 1:
            last, first = self._parse_author_name(authors[0])
            author_str = f"{last}, {first}." if first else last
        elif len(authors) == 2:
            last1, first1 = self._parse_author_name(authors[0])
            last2, first2 = self._parse_author_name(authors[1])
            author_str = f"{last1}, {first1}., and {last2}, {first2}."
        else:
            last, first = self._parse_author_name(authors[0])
            author_str = f"{last}, {first}., et al."
        
        title = self._get(paper, "title", "Untitled")
        source = self._get(paper, "source", "Unknown")
        year = self._get(paper, "year", "n.d.")
        url = self._get_url(paper)
        
        citation = f'{author_str} "{title}." {source}, {year}'
        if url:
            citation += f", {url}"
        citation += "."
        
        return citation.strip()

    def format_ieee(self, paper: Union[Dict, Any]) -> str:
        """Format citation in IEEE style.
        
        Format: [#] F. Last, F. Last, and F. Last, "Title," Source, year. [Online]. Available: URL
        If > 3 authors: First author et al.
        
        Args:
            paper: Paper dict or object
            
        Returns:
            Formatted IEEE citation
        """
        authors = self._normalize_authors(self._get(paper, "authors", []))
        
        if not authors or not any(authors):
            author_str = "Unknown Author"
        elif len(authors) <= 3:
            formatted_authors = []
            for author in authors:
                last, first = self._parse_author_name(author)
                initials = first if first else (last[0] if last else "")
                formatted_authors.append(f"{initials}. {last}")
            author_str = ", ".join(formatted_authors[:-1]) + (" and " + formatted_authors[-1] if len(formatted_authors) > 1 else "")
        else:
            last, first = self._parse_author_name(authors[0])
            initials = first if first else (last[0] if last else "")
            author_str = f"{initials}. {last}, et al."
        
        title = self._get(paper, "title", "Untitled")
        source = self._get(paper, "source", "Unknown")
        year = self._get(paper, "year", "n.d.")
        url = self._get_url(paper)
        
        citation = f'{author_str}, "{title}," {source}, {year}. [Online]. Available: {url}'
        
        return citation.strip()

    def format_chicago(self, paper: Union[Dict, Any]) -> str:
        """Format citation in Chicago style.
        
        Format: Last, First, and First Last. "Title." Source (Year). URL.
        
        Args:
            paper: Paper dict or object
            
        Returns:
            Formatted Chicago citation
        """
        authors = self._normalize_authors(self._get(paper, "authors", []))
        
        if not authors or not any(authors):
            author_str = "Unknown Author"
        elif len(authors) == 1:
            last, first = self._parse_author_name(authors[0])
            author_str = f"{last}, {first}." if first else last
        else:
            formatted = []
            for author in authors:
                last, first = self._parse_author_name(author)
                if first:
                    formatted.append(f"{last}, {first}.")
                else:
                    formatted.append(last)
            
            if len(formatted) == 2:
                author_str = f"{formatted[0]} and {formatted[1]}"
            else:
                author_str = ", ".join(formatted[:-1]) + f", and {formatted[-1]}"
        
        title = self._get(paper, "title", "Untitled")
        source = self._get(paper, "source", "Unknown")
        year = self._get(paper, "year", "n.d.")
        url = self._get_url(paper)
        
        citation = f'{author_str} "{title}." {source} ({year}). {url}'
        
        return citation.strip()

    def generate_bibtex(self, paper: Union[Dict, Any]) -> str:
        """Generate a BibTeX entry for a paper.
        
        Args:
            paper: Paper dict or object
            
        Returns:
            Valid BibTeX entry string
        """
        authors = self._normalize_authors(self._get(paper, "authors", []))
        
        # Generate key: lastname_year_firstword
        if authors and any(authors):
            last, _ = self._parse_author_name(authors[0])
            key_author = last.lower()
        else:
            key_author = "unknown"
        
        year = self._get(paper, "year", "nd")
        key_year = str(year) if year else "nd"
        
        # Extract first word of title (filter out articles)
        title = self._get(paper, "title", "untitled")
        words = title.split()
        first_word = words[0].lower() if words else "untitled"
        first_word = re.sub(r'[^a-z0-9]', '', first_word)  # Remove non-alphanumeric
        
        key = f"{key_author}_{key_year}_{first_word}"
        
        # Format authors
        if not authors or not any(authors):
            author_str = "Unknown Author"
        else:
            formatted = []
            for author in authors:
                last, first = self._parse_author_name(author)
                if first:
                    formatted.append(f"{last}, {first}")
                else:
                    formatted.append(last)
            author_str = " and ".join(formatted)
        
        # Determine entry type
        doi = self._get(paper, "doi", "")
        entry_type = "@article" if doi else "@misc"
        
        # Build BibTeX entry
        title_val = self._get(paper, "title", "Untitled")
        entries = [
            f"{entry_type}{{{key},",
            f'  author = "{author_str}",',
            f'  title = "{title_val}",',
            f'  year = {{{key_year}}},',
            f'  url = "{self._get_url(paper)}",',
            f'  note = "Citation count: {self._get(paper, "citation_count", 0)}"',
            "}"
        ]
        
        return "\n".join(entries)

    def format_all(self, paper: Union[Dict, Any]) -> Dict[str, str]:
        """Format a paper in all supported citation styles.
        
        Args:
            paper: Paper dict or object
            
        Returns:
            Dict with keys: apa, mla, ieee, chicago, bibtex
        """
        return {
            "apa": self.format_apa(paper),
            "mla": self.format_mla(paper),
            "ieee": self.format_ieee(paper),
            "chicago": self.format_chicago(paper),
            "bibtex": self.generate_bibtex(paper)
        }

    def bulk_export_txt(self, papers: List[Union[Dict, Any]], style: str = "apa") -> str:
        """Export multiple citations in a specific text format.
        
        Args:
            papers: List of paper dicts or objects
            style: Citation style (apa, mla, ieee, chicago)
            
        Returns:
            All citations joined by double newlines
        """
        style = style.lower()
        if style not in ["apa", "mla", "ieee", "chicago"]:
            style = "apa"
        
        # Map style to formatter function
        formatters = {
            "apa": self.format_apa,
            "mla": self.format_mla,
            "ieee": self.format_ieee,
            "chicago": self.format_chicago
        }
        formatter = formatters.get(style, self.format_apa)
        
        citations = [formatter(paper) for paper in papers]
        return "\n\n".join(citations)

    def bulk_export_bib(self, papers: List[Union[Dict, Any]]) -> str:
        """Export multiple papers as BibTeX.
        
        Args:
            papers: List of paper dicts or objects
            
        Returns:
            All BibTeX entries joined by double newlines
        """
        entries = [self.generate_bibtex(paper) for paper in papers]
        return "\n\n".join(entries)

    async def run(self, papers: List[Union[Dict, Any]], style: str = "apa") -> Dict:
        """Run citation export for multiple papers.
        
        Args:
            papers: List of paper dicts or ORM objects
            style: Default citation style for bulk export
            
        Returns:
            Dict with citations (per-paper all formats), bulk_txt, and bulk_bib
        """
        # Convert ORM objects to dicts
        def _paper_from_orm(p):
            if isinstance(p, dict):
                return p
            return {k: v for k, v in p.__dict__.items() if not k.startswith("_")}
        
        papers_as_dict = [_paper_from_orm(p) for p in papers]
        
        return {
            "citations": [self.format_all(paper) for paper in papers_as_dict],
            "bulk_txt": self.bulk_export_txt(papers_as_dict, style),
            "bulk_bib": self.bulk_export_bib(papers_as_dict)
        }
