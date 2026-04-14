export class APIClient {
  private baseUrl = "/api";

  async request(path: string, options?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`);
    }

    return res.json();
  }

  async get(path: string) {
    return this.request(path, { method: "GET" });
  }

  async post(path: string, data: any) {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async patch(path: string, data: any) {
    return this.request(path, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete(path: string) {
    return this.request(path, { method: "DELETE" });
  }
}

export const api = new APIClient();
