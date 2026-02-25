export interface Translations {
  tabSignIn: string
  tabRegister: string
  btnSignIn: string
  btnOpeningKeycloak: string
  forgotPassword: string
  labelUsername: string
  placeholderUsername: string
  labelEmail: string
  labelPassword: string
  placeholderPassword: string
  labelConfirmPassword: string
  btnCreateAccount: string
  btnCreatingAccount: string
  errAtLeast3Chars: string
  errValidEmail: string
  errAtLeast8Chars: string
  errPasswordsMatch: string
  msgAccountCreated: string
  errLoginFailed: string
  errRegistrationFailed: string
  labelEmailAddress: string
  placeholderEmail: string
  btnSendResetLink: string
  btnSending: string
  btnBackToSignIn: string
  msgResetLinkSent: string
  errRequestFailed: string
  btnSyncNow: string
  btnSyncing: string
  btnSignOut: string
  pendingSync: (n: number) => string
  settingsLabel: string
  labelProgressBarColor: string
  ribbonWatched: string
  ribbonSeen: string
}

const en: Translations = {
  tabSignIn: 'Sign In',
  tabRegister: 'Register',
  btnSignIn: 'Sign in with Keycloak',
  btnOpeningKeycloak: 'Opening Keycloak…',
  forgotPassword: 'Forgot password?',
  labelUsername: 'Username',
  placeholderUsername: 'at least 3 characters',
  labelEmail: 'Email',
  labelPassword: 'Password',
  placeholderPassword: 'at least 8 characters',
  labelConfirmPassword: 'Confirm Password',
  btnCreateAccount: 'Create Account',
  btnCreatingAccount: 'Creating account…',
  errAtLeast3Chars: 'At least 3 characters.',
  errValidEmail: 'Enter a valid email address.',
  errAtLeast8Chars: 'At least 8 characters.',
  errPasswordsMatch: 'Passwords do not match.',
  msgAccountCreated: 'Account created! Check your email to verify your account before signing in.',
  errLoginFailed: 'Login failed.',
  errRegistrationFailed: 'Registration failed.',
  labelEmailAddress: 'Email address',
  placeholderEmail: 'your@email.com',
  btnSendResetLink: 'Send Reset Link',
  btnSending: 'Sending…',
  btnBackToSignIn: '← Back to sign in',
  msgResetLinkSent: "If that email is registered, you'll receive a reset link shortly.",
  errRequestFailed: 'Request failed.',
  btnSyncNow: 'Sync Now',
  btnSyncing: 'Syncing…',
  btnSignOut: 'Sign Out',
  pendingSync: (n) => `${n} video${n === 1 ? '' : 's'} pending sync`,
  settingsLabel: 'Settings',
  labelProgressBarColor: 'Progress bar color',
  ribbonWatched: 'watched',
  ribbonSeen: 'seen',
}

const ptBR: Translations = {
  tabSignIn: 'Entrar',
  tabRegister: 'Registrar',
  btnSignIn: 'Entrar com Keycloak',
  btnOpeningKeycloak: 'Abrindo Keycloak…',
  forgotPassword: 'Esqueceu a senha?',
  labelUsername: 'Usuário',
  placeholderUsername: 'pelo menos 3 caracteres',
  labelEmail: 'E-mail',
  labelPassword: 'Senha',
  placeholderPassword: 'pelo menos 8 caracteres',
  labelConfirmPassword: 'Confirmar Senha',
  btnCreateAccount: 'Criar Conta',
  btnCreatingAccount: 'Criando conta…',
  errAtLeast3Chars: 'Pelo menos 3 caracteres.',
  errValidEmail: 'Digite um e-mail válido.',
  errAtLeast8Chars: 'Pelo menos 8 caracteres.',
  errPasswordsMatch: 'As senhas não coincidem.',
  msgAccountCreated: 'Conta criada! Verifique seu e-mail antes de entrar.',
  errLoginFailed: 'Falha no login.',
  errRegistrationFailed: 'Falha no registro.',
  labelEmailAddress: 'Endereço de e-mail',
  placeholderEmail: 'seu@email.com',
  btnSendResetLink: 'Enviar Link de Redefinição',
  btnSending: 'Enviando…',
  btnBackToSignIn: '← Voltar ao login',
  msgResetLinkSent: 'Se esse e-mail estiver registrado, você receberá um link em breve.',
  errRequestFailed: 'Requisição falhou.',
  btnSyncNow: 'Sincronizar',
  btnSyncing: 'Sincronizando…',
  btnSignOut: 'Sair',
  pendingSync: (n) => `${n} vídeo${n === 1 ? '' : 's'} pendente${n === 1 ? '' : 's'}`,
  settingsLabel: 'Configurações',
  labelProgressBarColor: 'Cor da barra de progresso',
  ribbonWatched: 'visto',
  ribbonSeen: 'parcial',
}

const es: Translations = {
  tabSignIn: 'Iniciar sesión',
  tabRegister: 'Registrarse',
  btnSignIn: 'Iniciar sesión con Keycloak',
  btnOpeningKeycloak: 'Abriendo Keycloak…',
  forgotPassword: '¿Olvidó su contraseña?',
  labelUsername: 'Usuario',
  placeholderUsername: 'al menos 3 caracteres',
  labelEmail: 'Correo',
  labelPassword: 'Contraseña',
  placeholderPassword: 'al menos 8 caracteres',
  labelConfirmPassword: 'Confirmar contraseña',
  btnCreateAccount: 'Crear cuenta',
  btnCreatingAccount: 'Creando cuenta…',
  errAtLeast3Chars: 'Al menos 3 caracteres.',
  errValidEmail: 'Ingrese un correo válido.',
  errAtLeast8Chars: 'Al menos 8 caracteres.',
  errPasswordsMatch: 'Las contraseñas no coinciden.',
  msgAccountCreated: '¡Cuenta creada! Verifica tu correo antes de iniciar sesión.',
  errLoginFailed: 'Error al iniciar sesión.',
  errRegistrationFailed: 'Error al registrarse.',
  labelEmailAddress: 'Correo electrónico',
  placeholderEmail: 'tu@correo.com',
  btnSendResetLink: 'Enviar enlace de recuperación',
  btnSending: 'Enviando…',
  btnBackToSignIn: '← Volver al inicio de sesión',
  msgResetLinkSent: 'Si ese correo está registrado, recibirás un enlace en breve.',
  errRequestFailed: 'Solicitud fallida.',
  btnSyncNow: 'Sincronizar',
  btnSyncing: 'Sincronizando…',
  btnSignOut: 'Cerrar sesión',
  pendingSync: (n) => `${n} video${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}`,
  settingsLabel: 'Configuración',
  labelProgressBarColor: 'Color de la barra de progreso',
  ribbonWatched: 'visto',
  ribbonSeen: 'parcial',
}

const ja: Translations = {
  tabSignIn: 'ログイン',
  tabRegister: '登録',
  btnSignIn: 'Keycloakでログイン',
  btnOpeningKeycloak: 'Keycloakを開いています…',
  forgotPassword: 'パスワードをお忘れですか？',
  labelUsername: 'ユーザー名',
  placeholderUsername: '3文字以上',
  labelEmail: 'メール',
  labelPassword: 'パスワード',
  placeholderPassword: '8文字以上',
  labelConfirmPassword: 'パスワード確認',
  btnCreateAccount: 'アカウント作成',
  btnCreatingAccount: '作成中…',
  errAtLeast3Chars: '3文字以上入力してください。',
  errValidEmail: '有効なメールアドレスを入力してください。',
  errAtLeast8Chars: '8文字以上入力してください。',
  errPasswordsMatch: 'パスワードが一致しません。',
  msgAccountCreated: 'アカウントが作成されました！ログイン前にメールで確認してください。',
  errLoginFailed: 'ログインに失敗しました。',
  errRegistrationFailed: '登録に失敗しました。',
  labelEmailAddress: 'メールアドレス',
  placeholderEmail: 'your@email.com',
  btnSendResetLink: 'リセットリンクを送信',
  btnSending: '送信中…',
  btnBackToSignIn: '← ログインに戻る',
  msgResetLinkSent: 'そのメールが登録されている場合、まもなくリセットリンクが届きます。',
  errRequestFailed: 'リクエストに失敗しました。',
  btnSyncNow: '今すぐ同期',
  btnSyncing: '同期中…',
  btnSignOut: 'ログアウト',
  pendingSync: (n) => `${n}件の動画が同期待ちです`,
  settingsLabel: '設定',
  labelProgressBarColor: 'プログレスバーの色',
  ribbonWatched: '視聴済',
  ribbonSeen: '途中',
}

const fr: Translations = {
  tabSignIn: 'Connexion',
  tabRegister: 'Inscription',
  btnSignIn: 'Se connecter avec Keycloak',
  btnOpeningKeycloak: 'Ouverture de Keycloak…',
  forgotPassword: 'Mot de passe oublié ?',
  labelUsername: "Nom d'utilisateur",
  placeholderUsername: 'au moins 3 caractères',
  labelEmail: 'E-mail',
  labelPassword: 'Mot de passe',
  placeholderPassword: 'au moins 8 caractères',
  labelConfirmPassword: 'Confirmer le mot de passe',
  btnCreateAccount: 'Créer un compte',
  btnCreatingAccount: 'Création du compte…',
  errAtLeast3Chars: 'Au moins 3 caractères.',
  errValidEmail: 'Entrez une adresse e-mail valide.',
  errAtLeast8Chars: 'Au moins 8 caractères.',
  errPasswordsMatch: 'Les mots de passe ne correspondent pas.',
  msgAccountCreated: 'Compte créé ! Vérifiez votre e-mail avant de vous connecter.',
  errLoginFailed: 'Échec de la connexion.',
  errRegistrationFailed: "Échec de l'inscription.",
  labelEmailAddress: 'Adresse e-mail',
  placeholderEmail: 'votre@email.com',
  btnSendResetLink: 'Envoyer le lien de réinitialisation',
  btnSending: 'Envoi en cours…',
  btnBackToSignIn: '← Retour à la connexion',
  msgResetLinkSent: 'Si cet e-mail est enregistré, vous recevrez bientôt un lien.',
  errRequestFailed: 'Échec de la requête.',
  btnSyncNow: 'Synchroniser',
  btnSyncing: 'Synchronisation…',
  btnSignOut: 'Se déconnecter',
  pendingSync: (n) => `${n} vidéo${n === 1 ? '' : 's'} en attente de synchronisation`,
  settingsLabel: 'Paramètres',
  labelProgressBarColor: 'Couleur de la barre de progression',
  ribbonWatched: 'vu',
  ribbonSeen: 'partiel',
}

function detect(): Translations {
  const lang = chrome.i18n.getUILanguage().toLowerCase()
  if (lang.startsWith('pt')) return ptBR
  if (lang.startsWith('es')) return es
  if (lang.startsWith('ja')) return ja
  if (lang.startsWith('fr')) return fr
  return en
}

export const t: Translations = detect()
