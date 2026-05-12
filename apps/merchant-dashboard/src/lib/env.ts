function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[Pointly] Missing required env var: ${name}`);
  return value;
}

export const env = {
  cognitoUserPoolId: requireEnv('NEXT_PUBLIC_COGNITO_USER_POOL_ID'),
  cognitoClientId: requireEnv('NEXT_PUBLIC_COGNITO_CLIENT_ID'),
  apiUrl: requireEnv('NEXT_PUBLIC_API_URL'),
} as const;
