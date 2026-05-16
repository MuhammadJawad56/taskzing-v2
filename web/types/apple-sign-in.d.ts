interface AppleAuthorization {
  code?: string;
  id_token?: string;
  state?: string;
}

interface AppleSignInResponse {
  authorization?: AppleAuthorization;
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface AppleIDAuth {
  init: (config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    state?: string;
    nonce?: string;
    usePopup?: boolean;
  }) => void;
  signIn: () => Promise<AppleSignInResponse>;
}

interface AppleIDGlobal {
  auth: AppleIDAuth;
}

interface Window {
  AppleID?: AppleIDGlobal;
}
