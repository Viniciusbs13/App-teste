
const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Ensures the Facebook SDK is initialized before any call is made.
 */
const ensureFbSdkInitialized = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).FB_READY) {
      resolve();
      return;
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if ((window as any).FB_READY) {
        clearInterval(interval);
        resolve();
      } else if (attempts > 50) { // 5 seconds timeout
        clearInterval(interval);
        reject('O SDK do Facebook não carregou. Verifique sua conexão ou bloqueadores de anúncio.');
      }
    }, 100);
  });
};

export const loginWithFacebook = async (): Promise<string> => {
  // Hard requirement: Facebook Login requires HTTPS (except for localhost in some browsers)
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    throw new Error('O login do Facebook exige uma conexão segura (HTTPS). Por favor, acesse via HTTPS.');
  }

  await ensureFbSdkInitialized();

  return new Promise((resolve, reject) => {
    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        resolve(response.authResponse.accessToken);
      } else {
        reject('Login cancelado ou não autorizado pelo usuário.');
      }
    }, { scope: 'ads_read,business_management' });
  });
};

export const fetchBusinessManagers = async (accessToken: string) => {
  const response = await fetch(`${GRAPH_API_URL}/me/businesses?access_token=${accessToken}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
};

export const fetchAdAccounts = async (bmId: string, accessToken: string) => {
  const response = await fetch(`${GRAPH_API_URL}/${bmId}/adaccounts?fields=name,account_id&access_token=${accessToken}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
};

export const fetchInsights = async (adAccountId: string, accessToken: string) => {
  // Busca insights dos últimos 7 dias
  const response = await fetch(
    `${GRAPH_API_URL}/${adAccountId}/insights?fields=spend,impressions,clicks,reach&date_preset=last_7d&access_token=${accessToken}`
  );
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.data?.[0] || null;
};
