import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './Dialog.module.css'

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} className={styles.dialog} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className={styles.heading}><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="입력 창 닫기" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>
}
