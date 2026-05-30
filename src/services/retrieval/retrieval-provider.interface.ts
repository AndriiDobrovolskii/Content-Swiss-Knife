export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export interface RetrievalProvider {
  fetchUrl(url: string): Promise<string>;
  searchWeb(query: string, num?: number): Promise<SearchResult[]>;
}
