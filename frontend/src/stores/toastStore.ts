import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastState {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
}

let toastSeq = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = toast.id ?? `toast-${++toastSeq}`
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id),
      }))
    }, 3200)
    return id
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    })),
}))

export const toast = {
  success(title: string, description?: string) {
    return useToastStore.getState().push({ title, description, tone: 'success' })
  },
  error(title: string, description?: string) {
    return useToastStore.getState().push({ title, description, tone: 'error' })
  },
  info(title: string, description?: string) {
    return useToastStore.getState().push({ title, description, tone: 'info' })
  },
}
