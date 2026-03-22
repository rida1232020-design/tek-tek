// SDK placeholder for OAuth and authentication


export const sdk = {
  async authenticateRequest(_req: any) {
    return null;
  },

  async createSessionToken(_openId: string) {
    return "mock-session-token";
  },

  async verifySession(_token: string) {
    return null;
  }
};
