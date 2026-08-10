export interface AppStateModel {
  authState?: any;
  formsState?: any;
  languageState?: any;
  medusaState?: any;
}

export interface AppAuthRoutes {
  login?: string;
  logout?: string;
  register?: string;
  requestPassword?: string;
  resetPassword?: string;
  loginRedirect?: string;
  logoutRedirect?: string;
  requestPasswordRedirect?: string;
  profile?: string;
} 