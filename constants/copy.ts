/**
 * Common UI copy — 通用文案常數。
 *
 * 全 app 的按鈕文字、確認對話框文字統一從這拿。
 * 寫新功能時若需要的字眼這裡沒有，先加進來再用，避免「確定 vs 確認」這種同義詞並存。
 */

export const Copy = {
  // 確認 / 取消
  confirm: '確認',
  cancel: '取消',
  ok: '好',
  back: '返回',
  done: '完成',
  close: '關閉',

  // CRUD
  save: '儲存',
  edit: '編輯',
  create: '建立',
  add: '新增',
  remove: '移除',
  delete: '刪除',
  reset: '重置',
  send: '送出',
  submit: '送出',

  // Common destructive confirmations
  destructiveConfirm: '我確定',
  cantUndo: '此動作無法復原',

  // Loading
  loading: '載入中...',
  saving: '儲存中...',
  sending: '送出中...',
  processing: '處理中...',

  // Errors / hints
  error: '發生錯誤',
  retryLater: '請稍後再試',
  unknownError: '未知錯誤',

  // Empty
  emptyDefault: '目前沒有資料',

  // Auth-ish
  signIn: '登入',
  signOut: '登出',
} as const;

/**
 * 標準兩段式刪除流程文案。
 *   first: 第一次 alert 的副標
 *   second: 第二次 alert 的副標
 */
export function destructiveConfirmText(action: string): { first: string; second: string } {
  return {
    first: `${action}？${Copy.cantUndo}。`,
    second: `${Copy.destructiveConfirm}${action}`,
  };
}
