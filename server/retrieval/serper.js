export class SerperRetrieval {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async search(query, num = 5) {
    if (!this.apiKey) {
      throw new Error('SERPER_API_KEY is not set. Add it to your .env file.');
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num })
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
