import { BgMessage, StatusResponse, OkResponse } from '../types'
import { SETTINGS_KEY, QUEUE_KEY } from '../constants'
import { t } from '../i18n'

// ── Helpers ───────────────────────────────────────────────────────────────────

function $(id: string): HTMLElement {
  return document.getElementById(id)!
}
function $input(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement
}

function sendMsg(msg: BgMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(msg)
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const dot         = $('dot')
const authSection = $('auth-section')
const userSection = $('user-section')
const userDisplay = $('user-display')
const userEmail   = $('user-email')

const authTabs    = $('auth-tabs')
const tabLogin    = $('tab-login')
const tabRegister = $('tab-register')
const panelLogin  = $('panel-login')
const panelReg    = $('panel-register')
const panelForgot = $('panel-forgot')

const btnLogin    = $('btn-login')
const loginError  = $('login-error')
const btnForgotLink = $('btn-forgot-link')

const regUsername        = $input('reg-username')
const regEmail           = $input('reg-email')
const regPassword        = $input('reg-password')
const regPasswordConfirm = $input('reg-password-confirm')
const btnRegister        = $('btn-register') as HTMLButtonElement
const registerMsg        = $('register-msg')

const errUsername        = $('err-username')
const errEmail           = $('err-email')
const errPassword        = $('err-password')
const errPasswordConfirm = $('err-password-confirm')

const forgotEmail = $input('forgot-email')
const btnForgot   = $('btn-forgot') as HTMLButtonElement
const forgotMsg   = $('forgot-msg')
const btnBackLogin = $('btn-back-login')

const syncCount = $('sync-count')
const btnSync   = $('btn-sync')
const btnLogout = $('btn-logout')

const panelUser            = $('panel-user')
const panelDelete          = $('panel-delete')
const btnDeleteAccountLink = $('btn-delete-account-link')
const deleteWarning        = $('delete-warning')
const btnConfirmDelete     = $('btn-confirm-delete') as HTMLButtonElement
const deleteMsg            = $('delete-msg')
const btnCancelDelete      = $('btn-cancel-delete')

const cfgBarColor = $input('cfg-bar-color')

// ── Translations ──────────────────────────────────────────────────────────────

function applyTranslations(): void {
  tabLogin.textContent    = t.tabSignIn
  tabRegister.textContent = t.tabRegister
  btnLogin.textContent    = t.btnSignIn
  btnForgotLink.textContent = t.forgotPassword

  document.querySelector<HTMLElement>('label[for="reg-username"]')!.textContent = t.labelUsername
  regUsername.placeholder = t.placeholderUsername
  document.querySelector<HTMLElement>('label[for="reg-email"]')!.textContent = t.labelEmail
  document.querySelector<HTMLElement>('label[for="reg-password"]')!.textContent = t.labelPassword
  regPassword.placeholder = t.placeholderPassword
  document.querySelector<HTMLElement>('label[for="reg-password-confirm"]')!.textContent = t.labelConfirmPassword
  btnRegister.textContent = t.btnCreateAccount

  document.querySelector<HTMLElement>('label[for="forgot-email"]')!.textContent = t.labelEmailAddress
  forgotEmail.placeholder = t.placeholderEmail
  btnForgot.textContent   = t.btnSendResetLink
  btnBackLogin.textContent = t.btnBackToSignIn

  btnSync.textContent   = t.btnSyncNow
  btnLogout.textContent = t.btnSignOut
  btnDeleteAccountLink.textContent = t.btnDeleteAccountLink
  deleteWarning.textContent        = t.deleteAccountWarning
  btnConfirmDelete.textContent     = t.btnConfirmDelete
  btnCancelDelete.textContent      = t.btnCancelDelete

  const summary = document.querySelector<HTMLElement>('details summary')
  if (summary) summary.textContent = t.settingsLabel
  document.querySelector<HTMLElement>('label[for="cfg-bar-color"]')!.textContent = t.labelProgressBarColor
}

// ── State rendering ───────────────────────────────────────────────────────────

function showLoggedIn(username?: string, email?: string): void {
  dot.classList.add('online')
  authSection.classList.add('hidden')
  userSection.classList.remove('hidden')
  userDisplay.firstChild!.textContent = username ?? 'Signed in'
  userEmail.textContent = email ?? ''
}

function showLoggedOut(): void {
  dot.classList.remove('online')
  authSection.classList.remove('hidden')
  userSection.classList.add('hidden')
  // Reset delete panel so it doesn't show stale state next login
  panelDelete.classList.add('hidden')
  panelUser.classList.remove('hidden')
}

// ── Sync status ───────────────────────────────────────────────────────────────

async function updateSyncStatus(): Promise<void> {
  const result = await chrome.storage.local.get(QUEUE_KEY)
  const count = ((result[QUEUE_KEY] as unknown[]) ?? []).length
  if (count > 0) {
    syncCount.textContent = t.pendingSync(count)
    btnSync.removeAttribute('disabled')
  } else {
    syncCount.textContent = ''
    btnSync.setAttribute('disabled', '')
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && QUEUE_KEY in changes) updateSyncStatus()
})

// ── Init ──────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  applyTranslations()

  // Load settings
  const result = await chrome.storage.sync.get(SETTINGS_KEY)
  cfgBarColor.value = (result[SETTINGS_KEY] as { progressBarColor?: string } | undefined)
    ?.progressBarColor ?? '#3b82f6'

  // Check auth status
  const status = await sendMsg({ type: 'GET_STATUS' }) as StatusResponse
  if (status?.isLoggedIn) {
    showLoggedIn(status.username, status.email)
  } else {
    showLoggedOut()
  }

  await updateSyncStatus()
}

// ── Tab switching ─────────────────────────────────────────────────────────────

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active')
  tabRegister.classList.remove('active')
  panelLogin.classList.remove('hidden')
  panelReg.classList.add('hidden')
})

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active')
  tabLogin.classList.remove('active')
  panelReg.classList.remove('hidden')
  panelLogin.classList.add('hidden')
})

// ── Forgot password navigation ────────────────────────────────────────────────

btnForgotLink.addEventListener('click', () => {
  authTabs.classList.add('hidden')
  panelLogin.classList.add('hidden')
  panelReg.classList.add('hidden')
  panelForgot.classList.remove('hidden')
  forgotMsg.textContent = ''
  forgotMsg.className = 'msg'
  forgotEmail.value = ''
})

btnBackLogin.addEventListener('click', () => {
  panelForgot.classList.add('hidden')
  authTabs.classList.remove('hidden')
  tabLogin.classList.add('active')
  tabRegister.classList.remove('active')
  panelLogin.classList.remove('hidden')
})

// ── Login ─────────────────────────────────────────────────────────────────────

btnLogin.addEventListener('click', async () => {
  loginError.textContent = ''
  btnLogin.textContent   = t.btnSigningIn
  btnLogin.setAttribute('disabled', '')

  const res = await sendMsg({ type: 'LOGIN' }) as OkResponse

  btnLogin.textContent = t.btnSignIn
  btnLogin.removeAttribute('disabled')

  if (res?.ok) {
    const status = await sendMsg({ type: 'GET_STATUS' }) as StatusResponse
    showLoggedIn(status.username, status.email)
  } else {
    loginError.className = 'msg error'
    loginError.textContent = res?.error ?? t.errLoginFailed
    // Prompt the user if the error is about email verification
    if (res?.error?.toLowerCase().includes('verify')) {
      loginError.className = 'msg info'
    }
  }
})

// ── Register ──────────────────────────────────────────────────────────────────

function setFieldState(input: HTMLInputElement, error: HTMLElement, msg: string): void {
  const dirty = input.value.length > 0
  error.textContent = dirty ? msg : ''
  input.classList.toggle('invalid', dirty && msg !== '')
  input.classList.toggle('valid',   dirty && msg === '')
}

function validateRegister(): boolean {
  const username = regUsername.value.trim()
  const password = regPassword.value
  const confirm  = regPasswordConfirm.value

  const usernameMsg = username.length < 3 ? t.errAtLeast3Chars : ''
  const emailMsg    = !regEmail.validity.valid ? t.errValidEmail : ''
  const passwordMsg = password.length < 8 ? t.errAtLeast8Chars : ''
  const confirmMsg  = confirm !== password ? t.errPasswordsMatch : ''

  setFieldState(regUsername,        errUsername,        usernameMsg)
  setFieldState(regEmail,           errEmail,           emailMsg)
  setFieldState(regPassword,        errPassword,        passwordMsg)
  setFieldState(regPasswordConfirm, errPasswordConfirm, confirmMsg)

  const valid = !usernameMsg && !emailMsg && !passwordMsg && !confirmMsg
    && username.length > 0 && regEmail.value.length > 0
    && password.length > 0 && confirm.length > 0

  btnRegister.disabled = !valid
  return valid
}

regUsername.addEventListener('input', validateRegister)
regEmail.addEventListener('input', validateRegister)
regPassword.addEventListener('input', validateRegister)
regPasswordConfirm.addEventListener('input', validateRegister)

btnRegister.addEventListener('click', async () => {
  registerMsg.className   = 'msg error'
  registerMsg.textContent = ''

  const username = regUsername.value.trim()
  const email    = regEmail.value.trim()
  const password = regPassword.value

  btnRegister.textContent = t.btnCreatingAccount
  btnRegister.disabled    = true

  const res = await sendMsg({
    type: 'REGISTER', username, email, password,
  }) as OkResponse

  btnRegister.textContent = t.btnCreateAccount
  btnRegister.disabled    = false

  if (res?.ok) {
    registerMsg.className   = 'msg success'
    registerMsg.textContent = t.msgAccountCreated
    regUsername.value = regEmail.value = regPassword.value = regPasswordConfirm.value = ''
    ;[regUsername, regEmail, regPassword, regPasswordConfirm].forEach(el =>
      el.classList.remove('valid', 'invalid'),
    )
    btnRegister.disabled = true
    setTimeout(() => tabLogin.click(), 3000)
  } else {
    registerMsg.textContent = res?.error ?? t.errRegistrationFailed
  }
})

// ── Forgot password ───────────────────────────────────────────────────────────

btnForgot.addEventListener('click', async () => {
  const email = forgotEmail.value.trim()
  if (!forgotEmail.validity.valid || !email) {
    forgotMsg.className   = 'msg error'
    forgotMsg.textContent = t.errValidEmail
    return
  }

  forgotMsg.textContent   = ''
  btnForgot.textContent   = t.btnSending
  btnForgot.disabled      = true

  const res = await sendMsg({ type: 'FORGOT_PASSWORD', email }) as OkResponse

  btnForgot.textContent = t.btnSendResetLink
  btnForgot.disabled    = false

  if (res?.ok) {
    forgotMsg.className   = 'msg success'
    forgotMsg.textContent = t.msgResetLinkSent
  } else {
    forgotMsg.className   = 'msg error'
    forgotMsg.textContent = res?.error ?? t.errRequestFailed
  }
})

// ── Sync & Logout ─────────────────────────────────────────────────────────────

btnSync.addEventListener('click', async () => {
  btnSync.textContent = t.btnSyncing
  btnSync.setAttribute('disabled', '')
  await sendMsg({ type: 'TRIGGER_SYNC' })
  btnSync.textContent = t.btnSyncNow
  await updateSyncStatus()
})

btnLogout.addEventListener('click', async () => {
  await sendMsg({ type: 'LOGOUT' })
  showLoggedOut()
})

// ── Delete account ────────────────────────────────────────────────────────────

btnDeleteAccountLink.addEventListener('click', () => {
  panelUser.classList.add('hidden')
  panelDelete.classList.remove('hidden')
  deleteMsg.textContent = ''
  deleteMsg.className = 'msg'
})

btnCancelDelete.addEventListener('click', () => {
  panelDelete.classList.add('hidden')
  panelUser.classList.remove('hidden')
})

btnConfirmDelete.addEventListener('click', async () => {
  deleteMsg.textContent = ''
  deleteMsg.className = 'msg'
  btnConfirmDelete.textContent = t.btnDeletingAccount
  btnConfirmDelete.disabled = true

  const res = await sendMsg({ type: 'DELETE_ACCOUNT' }) as OkResponse

  btnConfirmDelete.textContent = t.btnConfirmDelete
  btnConfirmDelete.disabled = false

  if (res?.ok) {
    showLoggedOut()
  } else {
    deleteMsg.className = 'msg error'
    deleteMsg.textContent = res?.error ?? t.errDeleteFailed
  }
})

// ── Settings ──────────────────────────────────────────────────────────────────

cfgBarColor.addEventListener('change', async () => {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: { progressBarColor: cfgBarColor.value } })
})

// ── Boot ──────────────────────────────────────────────────────────────────────

init()
