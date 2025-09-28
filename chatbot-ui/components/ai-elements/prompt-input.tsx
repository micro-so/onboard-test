'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type Dispatch,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

type FileData = File;

export type PromptInputMessage = {
  text?: string;
  files?: FileData[];
};

type PromptInputContextValue = {
  text: string;
  setText: (value: string) => void;
  files: FileData[];
  setFiles: Dispatch<SetStateAction<FileData[]>>;
};

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

interface PromptInputProps extends FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (message: PromptInputMessage) => void;
  globalDrop?: boolean;
  multiple?: boolean;
}

export function PromptInput({ className, children, onSubmit, ...props }: PromptInputProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<FileData[]>([]);

  return (
    <form
      className={cn('rounded-3xl border border-slate-200 bg-white shadow-sm', className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ text, files });
        setText('');
        setFiles([]);
      }}
      {...props}
    >
      <PromptInputContext.Provider value={{ text, setText, files, setFiles }}>
        {children}
      </PromptInputContext.Provider>
    </form>
  );
}

export function PromptInputBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function PromptInputTextarea({ className, onChange, value = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const context = usePromptInputContext();
  useEffect(() => {
    context.setText(value.toString());
  }, [value, context]);
  return (
    <textarea
      className={cn('min-h-[80px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400', className)}
      onChange={(event) => {
        context.setText(event.target.value);
        onChange?.(event);
      }}
      value={value}
      {...props}
    />
  );
}

interface PromptInputAttachmentsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: (file: FileData) => ReactNode;
}

export function PromptInputAttachments({ className, children, ...props }: PromptInputAttachmentsProps) {
  const context = usePromptInputContext();
  if (context.files.length === 0) {
    return null;
  }
  return (
    <div className={cn('mb-2 flex flex-wrap gap-2', className)} {...props}>
      {context.files.map((file, index) => (
        <div key={`${file.name}-${index}`}>{children(file)}</div>
      ))}
    </div>
  );
}

export function PromptInputAttachment({ data }: { data: FileData }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-600">
      <span className="truncate">{data.name}</span>
    </div>
  );
}

export function PromptInputToolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2', className)} {...props} />
  );
}

export function PromptInputTools({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />;
}

export function PromptInputButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn('flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100', className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function PromptInputSubmit({ status, className, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { status?: string | null }) {
  const context = usePromptInputContext();
  const isStreaming = status === 'streaming';
  const shouldDisable =
    typeof disabled === 'boolean'
      ? disabled
      : !isStreaming && context.text.trim().length === 0 && context.files.length === 0;
  return (
    <button
      type="submit"
      className={cn('rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50', className)}
      disabled={shouldDisable}
      {...props}
    >
      {isStreaming ? 'Stop' : 'Send'}
    </button>
  );
}

const PromptInputActionMenuContext = createContext<{
  open: boolean;
  setOpen: (value: boolean) => void;
} | null>(null);

export function PromptInputActionMenu({ className, children }: HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = useState(false);
  return (
    <PromptInputActionMenuContext.Provider value={{ open, setOpen }}>
      <div className={cn('relative', className)}>{children}</div>
    </PromptInputActionMenuContext.Provider>
  );
}

export function PromptInputActionMenuTrigger({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useContext(PromptInputActionMenuContext);
  if (!context) {
    throw new Error('PromptInputActionMenuTrigger must be used within PromptInputActionMenu');
  }
  return (
    <button
      type="button"
      className={cn('rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm', className)}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      ⋮
    </button>
  );
}

export function PromptInputActionMenuContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(PromptInputActionMenuContext);
  if (!context?.open) {
    return null;
  }
  return (
    <div className={cn('absolute bottom-full left-0 mb-2 w-48 rounded-md border border-slate-200 bg-white p-2 text-xs shadow-lg', className)} {...props} />
  );
}

interface PromptInputActionAddAttachmentsProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'> {
  children?: ReactNode;
}

export function PromptInputActionAddAttachments({ className, children, ...props }: PromptInputActionAddAttachmentsProps) {
  const context = usePromptInputContext();
  return (
    <label
      className={cn('flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-600', className)}
      {...props}
    >
      <input
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) {
            context.setFiles((prev) => [...prev, ...files]);
          }
        }}
      />
      {children ?? <span>Add attachment</span>}
    </label>
  );
}

export function PromptInputModelSelect({ children, value, onValueChange, className }: {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <select
        className="absolute inset-0 opacity-0"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {extractItems(children)}
      </select>
    </div>
  );
}

function extractItems(children: ReactNode): ReactNode {
  const items: ReactNode[] = [];
  const traverse = (node: ReactNode) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }
    if (typeof node === 'object' && 'props' in (node as any)) {
      const element = node as ReactElement;
      if (element.type === PromptInputModelSelectItem) {
        items.push(
          <option key={element.props.value} value={element.props.value}>
            {element.props.children}
          </option>,
        );
      }
      traverse(element.props.children);
    }
  };
  traverse(children);
  return items;
}

export function PromptInputModelSelectTrigger({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm', className)}
      {...props}
    />
  );
}

export function PromptInputModelSelectValue({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('text-xs font-medium text-slate-700', className)} {...props}>
      {children}
    </span>
  );
}

export function PromptInputModelSelectContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('hidden', className)} {...props} />;
}

export function PromptInputModelSelectItem({ className, children, value }: { className?: string; children: ReactNode; value: string }) {
  return (
    <div className={cn('px-3 py-1 text-xs text-slate-600', className)} data-value={value}>
      {children}
    </div>
  );
}

function usePromptInputContext() {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error('PromptInput components must be used within PromptInput');
  }
  return context;
}
