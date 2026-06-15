export type ApiSuccess<T extends Record<string, unknown> = Record<string, never>> = {
  success: true;
} & T;

export type ApiFailure = {
  success: false;
  error?: string;
};

type PostJsonOptions = {
  token?: string;
};

type GetJsonOptions = {
  token?: string;
};

export async function getJson<T extends Record<string, unknown> = Record<string, never>>(
  url: string,
  options: GetJsonOptions = {},
): Promise<ApiSuccess<T>> {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as Partial<ApiSuccess<T>> & Partial<ApiFailure>;

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Nao foi possivel carregar os dados');
  }

  return { success: true, ...(data as unknown as T) };
}

export async function postJson<T extends Record<string, unknown> = Record<string, never>>(
  url: string,
  body: unknown,
  options: PostJsonOptions = {},
): Promise<ApiSuccess<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as Partial<ApiSuccess<T>> & Partial<ApiFailure>;

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Nao foi possivel concluir a operacao');
  }

  return { success: true, ...(data as unknown as T) };
}
